import type { ParsedTxn } from '../types';
import { parseBankDate } from '../date';
import { cleanNarrationText } from '../narration';

export interface SbiCsvRow {
  txnDate: Date;
  valueDate?: Date;
  description: string;
  refNo?: string;
  branchCode?: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

export interface SbiCsvParseResult {
  accountLast4?: string;
  rows: SbiCsvRow[];
  skipped: number;
  errors: Array<{ line: number; reason: string; raw: string }>;
}

/**
 * Parse a raw SBI account-statement export. SBI's net-banking download is
 * comma-or-tab delimited and prefixes the data table with metadata rows
 * (account number, statement period, etc.) — so we look for a header line
 * starting with "Txn Date" or "Date" to find where the actual rows begin.
 *
 * Columns observed (in order):
 *   Txn Date | Value Date | Description | Ref No./Cheque No. | Branch Code |
 *   Debit | Credit | Balance
 *
 * Some exports use "Withdrawal Amount" / "Deposit Amount" instead of
 * Debit/Credit; both are handled.
 */
export function parseSbiCsv(content: string): SbiCsvParseResult {
  const lines = content
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let accountLast4: string | undefined;
  let headerIdx = -1;
  let columnMap: Record<string, number> = {};

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const acctMatch = line.match(/Account\s*(?:No|Number)[^\d]*(\d{4,})/i);
    if (acctMatch) {
      const num = acctMatch[1];
      accountLast4 = num.slice(-4);
    }

    const cells = splitRow(line);
    const lower = cells.map((c) => c.toLowerCase());
    const dateIdx = lower.findIndex((c) => c === 'txn date' || c === 'date');
    if (dateIdx < 0) continue;
    if (
      !lower.some((c) => c.includes('description') || c.includes('narration'))
    ) {
      continue;
    }
    headerIdx = i;
    columnMap = buildColumnMap(lower);
    break;
  }

  if (headerIdx < 0) {
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
      const txnDateStr = cells[columnMap.txnDate];
      const txnDate = parseBankDate(txnDateStr);
      if (!txnDate) {
        skipped += 1;
        continue;
      }

      const description = (cells[columnMap.description] ?? '').trim();
      if (!description) {
        skipped += 1;
        continue;
      }

      const debit = parseNumber(cells[columnMap.debit]);
      const credit = parseNumber(cells[columnMap.credit]);
      if (debit === undefined && credit === undefined) {
        skipped += 1;
        continue;
      }

      rows.push({
        txnDate,
        valueDate: parseBankDate(cells[columnMap.valueDate] ?? '') ?? undefined,
        description,
        refNo: cells[columnMap.refNo]?.trim() || undefined,
        branchCode: cells[columnMap.branchCode]?.trim() || undefined,
        debit,
        credit,
        balance: parseNumber(cells[columnMap.balance]),
      });
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

/**
 * Convert a parsed CSV row into the ParsedTxn shape that the ingest pipeline
 * expects. Falls back to the description field for the payee.
 */
export function sbiCsvRowToParsed(
  row: SbiCsvRow,
  accountLast4?: string
): ParsedTxn {
  const isCredit = (row.credit ?? 0) > 0;
  return {
    parserId: 'sbi-csv',
    source: 'statement',
    type: isCredit ? 'income' : 'expense',
    amount: isCredit ? (row.credit ?? 0) : (row.debit ?? 0),
    currency: 'INR',
    date: row.txnDate,
    payee: cleanNarrationText(row.description),
    description: row.description,
    accountLast4,
    issuer: 'sbi',
    refId: row.refNo,
  };
}

function buildColumnMap(headerCells: string[]): Record<string, number> {
  const map: Record<string, number> = {
    txnDate: -1,
    valueDate: -1,
    description: -1,
    refNo: -1,
    branchCode: -1,
    debit: -1,
    credit: -1,
    balance: -1,
  };
  headerCells.forEach((cell, idx) => {
    if (cell === 'txn date' || cell === 'date') map.txnDate = idx;
    else if (cell === 'value date') map.valueDate = idx;
    else if (cell.includes('description') || cell.includes('narration')) {
      map.description = idx;
    } else if (cell.includes('ref') || cell.includes('cheque')) {
      map.refNo = idx;
    } else if (cell.includes('branch')) map.branchCode = idx;
    else if (cell.includes('debit') || cell.includes('withdrawal')) {
      map.debit = idx;
    } else if (cell.includes('credit') || cell.includes('deposit')) {
      map.credit = idx;
    } else if (cell.includes('balance')) map.balance = idx;
  });
  return map;
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

function parseNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[,\s]/g, '');
  if (cleaned === '' || cleaned === '-') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

