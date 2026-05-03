import type { ExpenseParser, ParsedTxn, ParserInput } from '../types';
import { parseBankDate } from '../date';

const FROM_ADDRESSES = new Set([
  'alerts@hdfcbank.net',
  'alert@hdfcbank.net',
  'alerts@hdfcbank.com',
]);

const SMS_SENDERS = [/HDFCBK$/i, /HDFC$/i];

/**
 * Matches the canonical HDFC debit-card / savings alert. HDFC has shipped
 * minor wording variants over the years ("debited from a/c" vs "withdrawn
 * from a/c"); both are covered.
 *
 * Captures: amount, last4, date (dd-MMM-yy), payee, optional UPI ref.
 */
const HDFC_DEBIT_RE =
  /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been|was|is)?\s*(?:debited|withdrawn|spent|paid)\s+from\s+(?:a\/c|account)\s+\*+(\d{4})\s+on\s+(\d{1,2}[-/\s][A-Z]{3}[-/\s]\d{2,4})\s+(?:at|to|towards)\s+\*?(.+?)\*?\s*(?:\.|\bUPI\b|\bRef\b|\bInfo\b|\bAvl\b|$)/i;

const REF_RE = /(?:UPI\s*Ref(?:erence)?(?:\s*No)?[\s:]*|Ref[\s:]*)([A-Z0-9]{6,})/i;

function matchHdfcDebit(input: ParserInput): boolean {
  if (input.channel === 'email') {
    if (!input.fromAddress) return false;
    return FROM_ADDRESSES.has(input.fromAddress.trim().toLowerCase());
  }
  if (input.channel === 'sms') {
    if (!input.fromSender) return false;
    return SMS_SENDERS.some((re) => re.test(input.fromSender!));
  }
  return false;
}

function parseHdfcDebit(input: ParserInput): ParsedTxn | null {
  const m = input.body.match(HDFC_DEBIT_RE);
  if (!m) return null;

  const amount = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const last4 = m[2];
  const date = parseBankDate(m[3]);
  if (!date) return null;

  const payee = cleanPayee(m[4]);
  if (!payee) return null;

  const refMatch = input.body.match(REF_RE);

  return {
    parserId: 'hdfc-debit',
    source: input.channel === 'sms' ? 'sms' : 'email',
    type: 'expense',
    amount,
    currency: 'INR',
    date,
    payee,
    description: payee,
    accountLast4: last4,
    issuer: 'hdfc',
    refId: refMatch?.[1],
    raw: input.body,
  };
}

function cleanPayee(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[*\s]+|[*\s.]+$/g, '')
    .trim();
}

export const hdfcDebitParser: ExpenseParser = {
  id: 'hdfc-debit',
  issuer: 'hdfc',
  channels: ['email', 'sms'],
  matches: matchHdfcDebit,
  parse: parseHdfcDebit,
};
