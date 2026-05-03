const TRANSACTION_CODES = new Set([
  'TO', 'BY',
  'UPI', 'DR', 'CR',
  'NEFT', 'IMPS', 'RTGS', 'ECS', 'NACH',
  'POS', 'ATM', 'CASH', 'CHQ',
  'TRANSFER', 'TRF',
  'SAL', 'SALARY', 'INT', 'DIV', 'BIL', 'BILLPAY', 'REM', 'REF',
  'CARD', 'DEBIT', 'CREDIT',
]);

/**
 * Normalise a bank narration / description into a payee-ish string.
 *
 * Banks pack a lot of metadata into narrations:
 *   "TO TRANSFER-UPI/DR/445566778899/AMAZON RETAIL/HDFC/amazon@apl"
 *   "NEFT/SAL/EMPLOYER LTD"
 *   "UPI/DR/123456789012/BIGBASKET ONLINE/SBIN/grocery@upi"
 *
 * We split on `/` and pick the first segment that doesn't look like a
 * code (transaction type, bank IFSC stub, ref number, VPA, etc.).
 */
export function cleanNarrationText(narration: string): string {
  const segments = narration
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const seg of segments) {
    if (looksLikeCodeSegment(seg)) continue;
    if (/^\d+$/.test(seg)) continue; // ref numbers
    if (/@/.test(seg)) continue; // VPA / email
    if (/^[A-Z]{4,5}$/.test(seg)) continue; // bank IFSC stub like SBIN, HDFC
    return seg;
  }

  return narration;
}

function looksLikeCodeSegment(seg: string): boolean {
  // Multi-word segments like "TO TRANSFER-UPI" — break and check each token.
  const tokens = seg.split(/[\s-]+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => TRANSACTION_CODES.has(t.toUpperCase()));
}
