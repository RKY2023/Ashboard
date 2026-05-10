import type { ParsedTxn } from '../types';
import {
  buildColumnMap,
  buildRowFromCells,
  detectAccountLast4,
  isHeaderRow,
  sbiRowToParsed,
  type ColumnMap,
  type SbiStatementParseResult,
  type SbiStatementRow,
} from './sbi-shared';

// Re-export legacy names so existing callers keep compiling.
export type SbiCsvRow = SbiStatementRow;
export type SbiCsvParseResult = SbiStatementParseResult;

/**
 * Parse a raw SBI account-statement CSV/TSV export. SBI's net-banking
 * download is comma-or-tab delimited and prefixes the data table with
 * metadata rows (account number, statement period, etc.) — so we look for a
 * header line containing "Txn Date" and "Description" to find where the
 * actual rows begin.
 */
export function parseSbiCsv(content: string): SbiCsvParseResult {
  const lines = content
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let accountLast4: string | undefined;
  let headerIdx = -1;
  let columnMap: ColumnMap | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    accountLast4 = accountLast4 ?? detectAccountLast4(line);

    const cells = splitRow(line);
    const lower = cells.map((c) => c.toLowerCase());
    if (!isHeaderRow(lower)) continue;
    headerIdx = i;
    columnMap = buildColumnMap(cells);
    break;
  }

  if (headerIdx < 0 || !columnMap) {
    return {
      accountLast4,
      rows: [],
      skipped: lines.length,
      errors: [{ line: 0, reason: 'No header row found', raw: '' }],
    };
  }

  const rows: SbiCsvRow[] = [];
  const errors: SbiCsvParseResult['errors'] = [];
  let skipped = 0;

  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.toLowerCase().includes('end of statement')) break;
    const cells = splitRow(raw);
    if (cells.length < 3) {
      skipped += 1;
      continue;
    }

    try {
      const row = buildRowFromCells(cells, columnMap);
      if (!row) {
        skipped += 1;
        continue;
      }
      rows.push(row);
    } catch (err) {
      errors.push({
        line: i + 1,
        reason: err instanceof Error ? err.message : String(err),
        raw,
      });
    }
  }

  return { accountLast4, rows, skipped, errors };
}

export function sbiCsvRowToParsed(
  row: SbiCsvRow,
  accountLast4?: string
): ParsedTxn {
  return sbiRowToParsed(row, accountLast4, 'sbi-csv');
}

function splitRow(line: string): string[] {
  // Detect delimiter — SBI exports vary between CSV and TSV.
  const delim = line.includes('\t') ? '\t' : ',';
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delim && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}
