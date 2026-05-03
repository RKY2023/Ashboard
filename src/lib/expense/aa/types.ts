import type { AaConsentStatus, AaFiType, AaSessionStatus } from '@/src/types';

export interface AaCreateConsentInput {
  customerMobile: string;
  fiTypes: AaFiType[];
  fromDate: Date;
  toDate: Date;
  frequencyUnit: 'HOUR' | 'DAY' | 'MONTH' | 'YEAR';
  frequencyValue: number;
  redirectUrlBase: string;
}

export interface AaCreateConsentResult {
  consentHandle: string;
  redirectUrl: string;
  consentExpiresAt?: Date;
}

export interface AaConsentSnapshot {
  consentHandle: string;
  consentId?: string;
  status: AaConsentStatus;
}

export interface AaRequestDataInput {
  consentId: string;
  fromDate: Date;
  toDate: Date;
}

export interface AaRequestDataResult {
  sessionId: string;
}

export interface AaSessionSnapshot {
  sessionId: string;
  status: AaSessionStatus;
}

/**
 * Decrypted FI data — the shape we hand to the mapper. This is the ReBIT
 * "Account-Transactions" schema, narrowed to the fields we use.
 */
export interface AaFiAccountData {
  fipId: string;
  fiType: AaFiType;
  maskedAccountNumber: string;
  // Last 4 digits, derived from maskedAccountNumber when available.
  last4?: string;
  currentBalance?: number;
  currency?: string;
  transactions: AaFiTransaction[];
}

export interface AaFiTransaction {
  txnId: string;
  type: 'DEBIT' | 'CREDIT';
  mode?: 'UPI' | 'CARD' | 'NEFT' | 'IMPS' | 'ATM' | 'CASH' | 'OTHERS';
  amount: number;
  currency: string;
  narration: string;
  reference?: string;
  valueDate?: Date;
  transactionDateTime: Date;
}

export interface AaFiData {
  consentId: string;
  sessionId: string;
  generatedAt: Date;
  accounts: AaFiAccountData[];
}

export interface AaAdapter {
  provider: import('@/src/types').AaTspProvider;
  createConsent(input: AaCreateConsentInput): Promise<AaCreateConsentResult>;
  getConsentStatus(consentHandle: string): Promise<AaConsentSnapshot>;
  requestData(input: AaRequestDataInput): Promise<AaRequestDataResult>;
  getSessionStatus(sessionId: string): Promise<AaSessionSnapshot>;
  fetchData(sessionId: string): Promise<AaFiData>;
  verifyWebhook(rawBody: string, signature: string | null): boolean;
}
