/**
 * Shared helpers for parsing SBI account-statement exports. Both the CSV parser
 * (`csv/sbi.ts`) and the XLSX parser (`xlsx/sbi-xlsx.ts`) call into here so the
 * column-name detection stays in lock-step when SBI tweaks their exports.
 */

import type { ParsedTxn } from '../types';
import { cleanNarrationText } from '../narration';
import { parseBankDate } from '../date';

export interface SbiStatementRow {
  txnDate: Date;
  valueDate?: Date;
  description: string;
  refNo?: string;
  branchCode?: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

export interface SbiStatementParseResult {
  accountLast4?: string;
  rows: SbiStatementRow[];
  skipped: number;
  errors: Array<{ line: number; reason: string; raw: string }>;
}

export interface ColumnMap {
  txnDate: number;
  valueDate: number;
  description: number;
  refNo: number;
  branchCode: number;
  debit: number;
  credit: number;
  balance: number;
}

const ACCOUNT_RE = /Account\s*(?:No|Number)[^\d]*(\d{4,})/i;

/**
 * Pull the last 4 of the account number from a metadata cell. SBI prefixes
 * statements with rows like "Account No: XXXXXXXXX1234".
 */
export function detectAccountLast4(cell: string): string | undefined {
  const m = cell.match(ACCOUNT_RE);
  return m ? m[1].slice(-4) : undefined;
}

/**
 * Header-row detection. A row is considered the header iff it has both a date
 * column ("Txn Date" / "Date") and a narration column ("Description" /
 * "Narration") — works across CSV and XLSX exports alike.
 */
export function isHeaderRow(lowerCells: string[]): boolean {
  const hasDate = lowerCells.some((c) => c === 'txn date' || c === 'date');
  const hasNarration = lowerCells.some(
    (c) =>
      c.includes('description') ||
      c.includes('narration') ||
      c.trim() === 'details'
  );
  return hasDate && hasNarration;
}

export function buildColumnMap(headerCells: string[]): ColumnMap {
  const map: ColumnMap = {
    txnDate: -1,
    valueDate: -1,
    description: -1,
    refNo: -1,
    branchCode: -1,
    debit: -1,
    credit: -1,
    balance: -1,
  };
  headerCells.forEach((raw, idx) => {
    const cell = raw.toLowerCase().trim();
    if (cell === 'txn date' || cell === 'date') map.txnDate = idx;
    else if (cell === 'value date') map.valueDate = idx;
    else if (
      cell.includes('description') ||
      cell.includes('narration') ||
      cell === 'details'
    ) {
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

/**
 * Parse a numeric cell. SheetJS hands us numbers directly, the CSV path hands
 * us strings — both go through here. Returns `undefined` for blanks / dashes.
 */
export function parseAmount(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : undefined;
  }
  const cleaned = String(raw).replace(/[,\s]/g, '');
  if (cleaned === '' || cleaned === '-') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Coerce a date cell — accepts JS Date (from SheetJS `cellDates: true`),
 * Excel serial number, or string variants ("12-APR-26", "12Apr26", "12/04/2026").
 */
export function parseDateCell(raw: unknown): Date | null {
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Excel epoch: serial 1 = 1900-01-01 (with the famous 1900 leap-year bug).
    // Use the same translation SheetJS uses internally.
    const ms = (raw - 25569) * 86400 * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === 'string') return parseBankDate(raw.trim());
  return null;
}

/**
 * Convert a parsed row into the `ParsedTxn` shape the ingest pipeline expects.
 * Shared by both CSV and XLSX paths.
 */
export function sbiRowToParsed(
  row: SbiStatementRow,
  accountLast4?: string,
  parserId: 'sbi-csv' | 'sbi-xlsx' = 'sbi-csv'
): ParsedTxn {
  const isCredit = (row.credit ?? 0) > 0;
  return {
    parserId,
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

/**
 * Build a row from the cells at the indices given by `columnMap`. Returns
 * `null` when the row is missing required fields (date, description, or both
 * debit and credit).
 */
export function buildRowFromCells(
  cells: unknown[],
  columnMap: ColumnMap
): SbiStatementRow | null {
  const txnDate = parseDateCell(cells[columnMap.txnDate]);
  if (!txnDate) return null;

  const description = String(cells[columnMap.description] ?? '').trim();
  if (!description) return null;

  const debit = parseAmount(cells[columnMap.debit]);
  const credit = parseAmount(cells[columnMap.credit]);
  if (debit === undefined && credit === undefined) return null;

  const valueDate = parseDateCell(cells[columnMap.valueDate]) ?? undefined;
  const refNo = String(cells[columnMap.refNo] ?? '').trim() || undefined;
  const branchCode =
    String(cells[columnMap.branchCode] ?? '').trim() || undefined;

  return {
    txnDate,
    valueDate,
    description,
    refNo,
    branchCode,
    debit,
    credit,
    balance: parseAmount(cells[columnMap.balance]),
  };
}
