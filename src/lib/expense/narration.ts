const TRANSACTION_CODES = new Set([
  'TO', 'BY',
  'UPI', 'DR', 'CR',
  'NEFT', 'IMPS', 'RTGS', 'ECS', 'NACH',
  'POS', 'ATM', 'CASH', 'CHQ',
  'TRANSFER', 'TRF', 'TFR', 'TRFR',
  'DEP', 'WDL',
  'INB', 'P2A', 'P2M',
  'FROM', 'OF',
  'SAL', 'SALARY', 'INT', 'DIV', 'BIL', 'BILLPAY', 'REM', 'REF',
  'CARD', 'DEBIT', 'CREDIT',
]);

/**
 * Strip the trailing `AT <branch-code> <BRANCH NAME>` suffix that SBI
 * appends to every narration. Examples:
 *   `... AT 01077 I.I.T.HAUZKHAS` → ``
 * The branch suffix is detected as " AT NNNN <anything to end of string>".
 */
function stripBranchSuffix(s: string): string {
  return s.replace(/\s+AT\s+\d{3,}\s+\S.*$/, '').trim();
}

/**
 * Normalise a bank narration / description into a payee-ish string.
 *
 * Banks pack a lot of metadata into narrations. Examples:
 *   "TO TRANSFER-UPI/DR/445566778899/AMAZON RETAIL/HDFC/amazon@apl"
 *   " WDL TFR   UPI/DR/445976540934/AMIT KUMAR/HDFC/amitk57997/fa AT 01077 I.I.T.HAUZKHAS"
 *   "NEFT/SAL/EMPLOYER LTD"
 *
 * We collapse whitespace, strip the trailing branch suffix, then split on
 * `/` and pick the first segment that doesn't look like a code (transaction
 * type, bank IFSC stub, ref number, VPA, etc.).
 */
export function cleanNarrationText(narration: string): string {
  const collapsed = stripBranchSuffix(
    narration.replace(/\s+/g, ' ').trim()
  );

  const segments = collapsed
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

  return collapsed || narration;
}

function looksLikeCodeSegment(seg: string): boolean {
  // Multi-word segments like "TO TRANSFER-UPI" — break and check each token.
  const tokens = seg.split(/[\s-]+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => TRANSACTION_CODES.has(t.toUpperCase()));
}
