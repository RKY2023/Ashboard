import type { ParsedTxn } from '../types';
import { cleanNarrationText } from '../narration';
import type { AaFiAccountData, AaFiTransaction } from './types';

/**
 * Convert a single AA FI transaction into our ParsedTxn shape.
 * Issuer is derived from the FIP id (e.g. "SBI-FIP" → "sbi"). The narration
 * field becomes the payee — most FIPs put the merchant or VPA there.
 */
export function aaTxnToParsed(
  account: AaFiAccountData,
  txn: AaFiTransaction
): ParsedTxn {
  const issuer = deriveIssuer(account.fipId);
  return {
    parserId: `aa-${issuer}`,
    source: 'aa',
    type: txn.type === 'CREDIT' ? 'income' : 'expense',
    amount: Math.abs(txn.amount),
    currency: txn.currency || account.currency || 'INR',
    date: txn.transactionDateTime,
    payee: cleanNarrationText(txn.narration),
    description: txn.narration,
    accountLast4: account.last4,
    issuer,
    refId: txn.reference || txn.txnId,
  };
}

function deriveIssuer(fipId: string): string {
  return fipId
    .toLowerCase()
    .replace(/[-_]?fip$/i, '')
    .replace(/[^a-z]+/g, '');
}
