import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  AaAdapter,
  AaConsentSnapshot,
  AaCreateConsentInput,
  AaCreateConsentResult,
  AaFiData,
  AaFiAccountData,
  AaFiTransaction,
  AaRequestDataInput,
  AaRequestDataResult,
  AaSessionSnapshot,
} from './types';
import type { AaConsentStatus, AaSessionStatus } from '@/src/types';

export interface SetuConfig {
  baseUrl: string; // e.g. https://fiu-sandbox.setu.co
  clientId: string;
  clientSecret: string;
  productInstanceId: string;
  webhookSecret?: string;
}

/**
 * Minimal Setu Bridge AA client. Covers the consent → fetch → data flow we
 * need for expense ingestion. Setu's full API surface is larger; we'll add
 * methods (refresh, revoke, multi-fetch) when product needs them.
 *
 * Production prerequisites you must complete before this client succeeds:
 *   1. Sign up at developer.setu.co and complete KYC.
 *   2. Subscribe to the "Bridge AA" product, generate Client ID + Secret.
 *   3. Whitelist your callback URL (`<APP_URL>/api/integrations/aa/callback`).
 *   4. Set SETU_AA_BASE_URL / SETU_AA_CLIENT_ID / SETU_AA_CLIENT_SECRET /
 *      SETU_AA_PRODUCT_INSTANCE_ID in .env.local.
 *
 * Until those are configured, the adapter falls back to mock mode (see
 * `src/lib/expense/aa/index.ts`).
 */
export class SetuAaAdapter implements AaAdapter {
  readonly provider = 'setu' as const;

  constructor(private readonly cfg: SetuConfig) {}

  async createConsent(input: AaCreateConsentInput): Promise<AaCreateConsentResult> {
    const body = {
      Detail: {
        consentStart: new Date().toISOString(),
        consentExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        Customer: { id: `${input.customerMobile}@onemoney` },
        FIDataRange: {
          from: input.fromDate.toISOString(),
          to: input.toDate.toISOString(),
        },
        FIDataRange_freshFrom: input.fromDate.toISOString(),
        FIDataRange_freshTo: input.toDate.toISOString(),
        consentMode: 'STORE',
        fetchType: 'PERIODIC',
        consentTypes: ['TRANSACTIONS', 'PROFILE', 'SUMMARY'],
        fiTypes: input.fiTypes,
        DataConsumer: { id: this.cfg.productInstanceId },
        Purpose: { code: '101', text: 'Personal finance' },
        Frequency: { unit: input.frequencyUnit, value: input.frequencyValue },
        DataLife: { unit: 'YEAR', value: 1 },
      },
      redirectUrl: `${input.redirectUrlBase}?status=callback`,
    };

    const json = await this.fetchJson<{
      id: string;
      url: string;
      Detail?: { consentExpiry?: string };
    }>('POST', '/v2/consents', body);

    return {
      consentHandle: json.id,
      redirectUrl: json.url,
      consentExpiresAt: json.Detail?.consentExpiry
        ? new Date(json.Detail.consentExpiry)
        : undefined,
    };
  }

  async getConsentStatus(consentHandle: string): Promise<AaConsentSnapshot> {
    const json = await this.fetchJson<{
      id: string;
      status: string;
      ConsentDetail?: { consentId?: string };
      consentId?: string;
    }>('GET', `/v2/consents/${encodeURIComponent(consentHandle)}`);
    return {
      consentHandle,
      consentId: json.consentId ?? json.ConsentDetail?.consentId,
      status: normaliseConsentStatus(json.status),
    };
  }

  async requestData(input: AaRequestDataInput): Promise<AaRequestDataResult> {
    const json = await this.fetchJson<{ id: string }>('POST', '/v2/sessions', {
      consentId: input.consentId,
      DataRange: {
        from: input.fromDate.toISOString(),
        to: input.toDate.toISOString(),
      },
      format: 'json',
    });
    return { sessionId: json.id };
  }

  async getSessionStatus(sessionId: string): Promise<AaSessionSnapshot> {
    const json = await this.fetchJson<{ id: string; status: string }>(
      'GET',
      `/v2/sessions/${encodeURIComponent(sessionId)}`
    );
    return { sessionId, status: normaliseSessionStatus(json.status) };
  }

  async fetchData(sessionId: string): Promise<AaFiData> {
    const json = await this.fetchJson<SetuFiDataResponse>(
      'GET',
      `/v2/sessions/${encodeURIComponent(sessionId)}/data`
    );
    return mapSetuFiData(json, sessionId);
  }

  verifyWebhook(rawBody: string, signature: string | null): boolean {
    if (!this.cfg.webhookSecret) return false;
    if (!signature) return false;
    const expected =
      'sha256=' +
      createHmac('sha256', this.cfg.webhookSecret)
        .update(rawBody, 'utf8')
        .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  private async fetchJson<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${this.cfg.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': this.cfg.clientId,
        'X-Client-Secret': this.cfg.clientSecret,
        'X-Product-Instance-Id': this.cfg.productInstanceId,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Setu ${method} ${path} ${res.status}: ${text.slice(0, 400)}`);
    }
    return (await res.json()) as T;
  }
}

interface SetuFiDataResponse {
  consentId?: string;
  generatedAt?: string;
  FIData?: SetuFiAccountBlock[];
  fipData?: SetuFiAccountBlock[];
}

interface SetuFiAccountBlock {
  fipId?: string;
  data?: SetuFiAccount[];
}

interface SetuFiAccount {
  fiType?: string;
  maskedAccountNumber?: string;
  Summary?: { currentBalance?: number; currency?: string };
  Transactions?: { Transaction?: SetuTransaction[] };
}

interface SetuTransaction {
  txnId?: string;
  type?: string;
  mode?: string;
  amount?: string | number;
  currency?: string;
  narration?: string;
  reference?: string;
  valueDate?: string;
  transactionTimestamp?: string;
}

function mapSetuFiData(json: SetuFiDataResponse, sessionId: string): AaFiData {
  const blocks = json.FIData ?? json.fipData ?? [];
  const accounts: AaFiAccountData[] = [];

  for (const block of blocks) {
    const fipId = block.fipId ?? 'UNKNOWN';
    for (const acc of block.data ?? []) {
      const masked = acc.maskedAccountNumber ?? '';
      const last4Match = masked.match(/(\d{4})\s*$/);
      const transactions: AaFiTransaction[] = (acc.Transactions?.Transaction ?? []).map(
        (t) => ({
          txnId: t.txnId ?? '',
          type: t.type === 'CREDIT' ? 'CREDIT' : 'DEBIT',
          mode: normaliseMode(t.mode),
          amount: Number(t.amount ?? 0),
          currency: t.currency ?? acc.Summary?.currency ?? 'INR',
          narration: t.narration ?? '',
          reference: t.reference,
          valueDate: t.valueDate ? new Date(t.valueDate) : undefined,
          transactionDateTime: t.transactionTimestamp
            ? new Date(t.transactionTimestamp)
            : new Date(),
        })
      );
      accounts.push({
        fipId,
        fiType: (acc.fiType as AaFiAccountData['fiType']) ?? 'DEPOSIT',
        maskedAccountNumber: masked,
        last4: last4Match?.[1],
        currentBalance: acc.Summary?.currentBalance,
        currency: acc.Summary?.currency ?? 'INR',
        transactions,
      });
    }
  }

  return {
    consentId: json.consentId ?? '',
    sessionId,
    generatedAt: json.generatedAt ? new Date(json.generatedAt) : new Date(),
    accounts,
  };
}

function normaliseMode(mode?: string): AaFiTransaction['mode'] {
  switch (mode?.toUpperCase()) {
    case 'UPI':
      return 'UPI';
    case 'CARD':
      return 'CARD';
    case 'NEFT':
      return 'NEFT';
    case 'IMPS':
      return 'IMPS';
    case 'ATM':
      return 'ATM';
    case 'CASH':
      return 'CASH';
    default:
      return 'OTHERS';
  }
}

function normaliseConsentStatus(s: string): AaConsentStatus {
  const upper = s.toUpperCase();
  if (
    [
      'ACTIVE',
      'PAUSED',
      'REVOKED',
      'REJECTED',
      'EXPIRED',
      'PENDING',
      'FAILED',
    ].includes(upper)
  ) {
    return upper as AaConsentStatus;
  }
  return 'PENDING';
}

function normaliseSessionStatus(s: string): AaSessionStatus {
  const upper = s.toUpperCase();
  if (upper === 'COMPLETED' || upper === 'READY') return 'READY';
  if (upper === 'PARTIAL') return 'PARTIAL';
  if (upper === 'PENDING' || upper === 'IN_PROGRESS') return 'PENDING';
  if (upper === 'FAILED' || upper === 'ERROR') return 'FAILED';
  return 'REQUESTED';
}
