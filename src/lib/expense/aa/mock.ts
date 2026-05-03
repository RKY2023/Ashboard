import { randomBytes } from 'node:crypto';
import type {
  AaAdapter,
  AaConsentSnapshot,
  AaCreateConsentInput,
  AaCreateConsentResult,
  AaFiData,
  AaRequestDataInput,
  AaRequestDataResult,
  AaSessionSnapshot,
} from './types';
import type { AaConsentStatus } from '@/src/types';

interface MockConsent {
  consentHandle: string;
  consentId: string;
  status: AaConsentStatus;
  fromDate: Date;
  toDate: Date;
  fiTypes: AaCreateConsentInput['fiTypes'];
}

interface MockSession {
  sessionId: string;
  consentId: string;
  fromDate: Date;
  toDate: Date;
}

/**
 * In-process mock used when no TSP credentials are configured. Returns
 * deterministic-ish canned data so the AA flow can be exercised end-to-end
 * locally and in CI without a network. The data shape matches what Setu's
 * real adapter produces, so the mapper and ingest pipeline see identical
 * input.
 */
export class MockAaAdapter implements AaAdapter {
  readonly provider = 'mock' as const;

  private readonly consents = new Map<string, MockConsent>();
  private readonly sessions = new Map<string, MockSession>();

  async createConsent(input: AaCreateConsentInput): Promise<AaCreateConsentResult> {
    const consentHandle = `mock-consent-${randomBytes(6).toString('hex')}`;
    const consentId = `mock-cid-${randomBytes(6).toString('hex')}`;
    this.consents.set(consentHandle, {
      consentHandle,
      consentId,
      status: 'ACTIVE',
      fromDate: input.fromDate,
      toDate: input.toDate,
      fiTypes: input.fiTypes,
    });
    return {
      consentHandle,
      redirectUrl: `${input.redirectUrlBase}?status=callback&mock=1&handle=${consentHandle}`,
      consentExpiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    };
  }

  async getConsentStatus(consentHandle: string): Promise<AaConsentSnapshot> {
    const c = this.consents.get(consentHandle);
    if (!c) return { consentHandle, status: 'FAILED' };
    return { consentHandle, consentId: c.consentId, status: c.status };
  }

  async requestData(input: AaRequestDataInput): Promise<AaRequestDataResult> {
    const sessionId = `mock-sid-${randomBytes(6).toString('hex')}`;
    this.sessions.set(sessionId, {
      sessionId,
      consentId: input.consentId,
      fromDate: input.fromDate,
      toDate: input.toDate,
    });
    return { sessionId };
  }

  async getSessionStatus(sessionId: string): Promise<AaSessionSnapshot> {
    return { sessionId, status: this.sessions.has(sessionId) ? 'READY' : 'FAILED' };
  }

  async fetchData(sessionId: string): Promise<AaFiData> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Mock session ${sessionId} not found`);
    }
    return {
      consentId: session.consentId,
      sessionId,
      generatedAt: new Date(),
      accounts: [
        {
          fipId: 'SBI-FIP',
          fiType: 'DEPOSIT',
          maskedAccountNumber: 'XXXXXXXXX7890',
          last4: '7890',
          currentBalance: 4200,
          currency: 'INR',
          transactions: [
            {
              txnId: 'MOCK-T-1',
              type: 'DEBIT',
              mode: 'UPI',
              amount: 523,
              currency: 'INR',
              narration: 'UPI/DR/123456789012/BIGBASKET ONLINE/SBIN/grocery',
              reference: 'UTR123456789012',
              transactionDateTime: clampToRange(
                new Date('2026-04-12T10:14:00.000Z'),
                session
              ),
            },
            {
              txnId: 'MOCK-T-2',
              type: 'DEBIT',
              mode: 'UPI',
              amount: 1250,
              currency: 'INR',
              narration: 'UPI/DR/998877665544/SWIGGY INSTAMART/HDFC/food',
              reference: 'UTR998877665544',
              transactionDateTime: clampToRange(
                new Date('2026-04-13T19:30:00.000Z'),
                session
              ),
            },
            {
              txnId: 'MOCK-T-3',
              type: 'CREDIT',
              mode: 'NEFT',
              amount: 75000,
              currency: 'INR',
              narration: 'NEFT/SAL/EMPLOYER LTD',
              transactionDateTime: clampToRange(
                new Date('2026-04-01T09:00:00.000Z'),
                session
              ),
            },
          ],
        },
      ],
    };
  }

  verifyWebhook(_rawBody: string, _signature: string | null): boolean {
    return true;
  }
}

function clampToRange(d: Date, session: MockSession): Date {
  if (d < session.fromDate) return session.fromDate;
  if (d > session.toDate) return session.toDate;
  return d;
}
