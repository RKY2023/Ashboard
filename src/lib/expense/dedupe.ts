import { createHash } from 'node:crypto';
import type { ParsedTxn } from './types';

export function normalisePayee(payee: string): string {
  return payee
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Stable per-household idempotency key. Bank/SMS/statement rows for the same
 * underlying transaction should collapse to the same key regardless of which
 * channel delivered them first.
 */
export function dedupeKey(args: {
  householdId: string;
  accountLast4?: string;
  date: Date;
  amount: number;
  payee: string;
}): string {
  const day = args.date.toISOString().slice(0, 10);
  const amount = Math.round(args.amount * 100).toString();
  const payee = normalisePayee(args.payee);
  const last4 = args.accountLast4 ?? '----';
  const material = [args.householdId, last4, day, amount, payee].join('|');
  return createHash('sha256').update(material).digest('hex');
}

export function dedupeKeyForParsed(
  householdId: string,
  parsed: ParsedTxn
): string {
  return dedupeKey({
    householdId,
    accountLast4: parsed.accountLast4,
    date: parsed.date,
    amount: parsed.amount,
    payee: parsed.payee,
  });
}
