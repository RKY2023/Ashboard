import type { ExpenseParser, ParsedTxn, ParserInput } from '../types';
import { parseBankDate } from '../date';

const FROM_ADDRESSES = new Set([
  'donotreply.sbiatm@alerts.sbi.co.in',
  'alerts@sbi.co.in',
  'estatement@sbi.co.in',
  'donotreply@alerts.sbi.co.in',
]);

const SMS_SENDERS = [/SBIINB$/i, /SBIBNK$/i, /SBI$/i, /SBIPSG$/i];

/**
 * SBI savings/debit alert.
 *
 * Two common phrasings:
 *   1. "A/c **7890 debited by Rs.523.00 on 12Apr26 by transfer to MERCHANT VPA"
 *   2. "your a/c X7890 is debited for Rs 523 on 12Apr26 trf to MERCHANT VPA"
 *
 * SBI joins the date with no separators (`12Apr26`) — `parseBankDate` accepts
 * the dashed form, so we normalise the captured date before parsing.
 */
const SBI_DEBIT_RE =
  /(?:A\/c|a\/c|account)\s*[*Xx]+(\d{4})\s+(?:is\s+)?debited\s+(?:by|for)\s+Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+on\s+(\d{1,2}\s?[A-Za-z]{3}\s?\d{2,4})\s+(?:by\s+transfer\s+to|trf\s+to|to|towards|at|by\s+UPI\s+to)\s+(.+?)(?:\s*(?:\.|\bRefno\b|\bRef\b|\bUPI\b|\bAvl\b|\bBal\b|\bIf\b|$))/i;

const REF_RE = /(?:Refno|Ref(?:erence)?(?:\s*No)?[\s:]*|UPI[:\s]*)([A-Z0-9]{6,})/i;

function matchSbiDebit(input: ParserInput): boolean {
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

function parseSbiDebit(input: ParserInput): ParsedTxn | null {
  const m = input.body.match(SBI_DEBIT_RE);
  if (!m) return null;

  const last4 = m[1];

  const amount = Number(m[2].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const date = parseBankDate(normaliseSbiDate(m[3]));
  if (!date) return null;

  const payee = cleanPayee(m[4]);
  if (!payee) return null;

  const refMatch = input.body.match(REF_RE);

  return {
    parserId: 'sbi-debit',
    source: input.channel === 'sms' ? 'sms' : 'email',
    type: 'expense',
    amount,
    currency: 'INR',
    date,
    payee,
    description: payee,
    accountLast4: last4,
    issuer: 'sbi',
    refId: refMatch?.[1],
    raw: input.body,
  };
}

function normaliseSbiDate(input: string): string {
  // "12Apr26" -> "12-Apr-26", "12 Apr 26" -> "12-Apr-26"
  const compact = input.replace(/\s+/g, '');
  const m = compact.match(/^(\d{1,2})([A-Za-z]{3})(\d{2,4})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return input;
}

function cleanPayee(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[*\s]+|[*\s.]+$/g, '')
    .trim();
}

export const sbiDebitParser: ExpenseParser = {
  id: 'sbi-debit',
  issuer: 'sbi',
  channels: ['email', 'sms'],
  matches: matchSbiDebit,
  parse: parseSbiDebit,
};
