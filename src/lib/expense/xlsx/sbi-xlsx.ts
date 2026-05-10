import * as XLSX from 'xlsx';
import officeCrypto from 'officecrypto-tool';

import type { ParsedTxn } from '../types';
import {
  buildColumnMap,
  buildRowFromCells,
  detectAccountLast4,
  isHeaderRow,
  sbiRowToParsed,
  type SbiStatementParseResult,
  type SbiStatementRow,
} from '../csv/sbi-shared';

/**
 * Domain-specific error so callers (tRPC layer, UI) can distinguish a missing
 * password from a wrong password from a totally unparseable file.
 */
export class SbiXlsxError extends Error {
  code:
    | 'PASSWORD_REQUIRED'
    | 'BAD_PASSWORD'
    | 'NO_HEADER'
    | 'EMPTY'
    | 'UNREADABLE';
  constructor(code: SbiXlsxError['code'], message: string) {
    super(message);
    this.code = code;
    this.name = 'SbiXlsxError';
  }
}

export interface SbiXlsxParseOptions {
  password?: string;
}

export type SbiXlsxParseResult = SbiStatementParseResult;
export type SbiXlsxRow = SbiStatementRow;

/**
 * OLE2 Compound File magic — present at the head of password-encrypted
 * Office files (and legacy .xls). If we see this, the file is either
 * encrypted or BIFF8 — both require special handling vs. a plain xlsx zip.
 */
const OLE2_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function looksLikeOle2(buf: Buffer): boolean {
  return buf.length >= 8 && buf.subarray(0, 8).equals(OLE2_MAGIC);
}

/**
 * Parse an SBI .xlsx (or .xls) account-statement export. Handles
 * password-encrypted files via `officecrypto-tool`. Output shape mirrors
 * `parseSbiCsv` exactly so the ingest pipeline doesn't need to fork.
 */
export async function parseSbiXlsx(
  input: Buffer,
  opts: SbiXlsxParseOptions = {}
): Promise<SbiXlsxParseResult> {
  let buf: Buffer = input;

  // Decrypt if the file is encrypted. `isEncrypted` returns false for plain
  // (non-encrypted) BIFF .xls and modern .xlsx — both of which SheetJS reads
  // directly.
  if (officeCrypto.isEncrypted(buf)) {
    if (!opts.password) {
      throw new SbiXlsxError(
        'PASSWORD_REQUIRED',
        'This statement is password-encrypted; provide the password.'
      );
    }
    try {
      buf = await officeCrypto.decrypt(buf, { password: opts.password });
    } catch (err) {
      throw new SbiXlsxError(
        'BAD_PASSWORD',
        `Could not decrypt the file: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  } else if (looksLikeOle2(buf) && opts.password) {
    // Defensive: the magic looks OLE2 but `isEncrypted` says no — try decrypt
    // anyway in case the lib's heuristic missed an edge case. If it fails, fall
    // through and let SheetJS try the raw buffer.
    try {
      buf = await officeCrypto.decrypt(buf, { password: opts.password });
    } catch {
      buf = input;
    }
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buf, { type: 'buffer', cellDates: true, raw: false });
  } catch (err) {
    throw new SbiXlsxError(
      'UNREADABLE',
      `Could not parse workbook: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const sheetName = pickFirstNonEmptySheet(workbook);
  if (!sheetName) {
    throw new SbiXlsxError('EMPTY', 'No data sheets found in workbook');
  }

  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });

  let accountLast4: string | undefined;
  let headerIdx = -1;
  let columnMap: ReturnType<typeof buildColumnMap> | null = null;

  for (let i = 0; i < grid.length; i += 1) {
    const cells = grid[i];
    const cellsAsStr = cells.map((c) => String(c ?? '').trim());
    accountLast4 = accountLast4 ?? detectAccountLast4(cellsAsStr.join(' '));

    const lower = cellsAsStr.map((c) => c.toLowerCase());
    if (!isHeaderRow(lower)) continue;
    headerIdx = i;
    columnMap = buildColumnMap(cellsAsStr);
    break;
  }

  if (headerIdx < 0 || !columnMap) {
    return {
      accountLast4,
      rows: [],
      skipped: grid.length,
      errors: [{ line: 0, reason: 'No header row found', raw: '' }],
    };
  }

  const rows: SbiXlsxRow[] = [];
  const errors: SbiXlsxParseResult['errors'] = [];
  let skipped = 0;

  for (let i = headerIdx + 1; i < grid.length; i += 1) {
    const cells = grid[i];
    const firstCellText = String(cells[0] ?? '').toLowerCase();
    if (firstCellText.includes('end of statement')) break;

    // Skip totally-empty rows.
    if (cells.every((c) => c === '' || c === null || c === undefined)) {
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
        raw: cells.map((c) => String(c ?? '')).join(' | '),
      });
    }
  }

  return { accountLast4, rows, skipped, errors };
}

export function sbiXlsxRowToParsed(
  row: SbiXlsxRow,
  accountLast4?: string
): ParsedTxn {
  return sbiRowToParsed(row, accountLast4, 'sbi-xlsx');
}

function pickFirstNonEmptySheet(workbook: XLSX.WorkBook): string | null {
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet || !sheet['!ref']) continue;
    const range = XLSX.utils.decode_range(sheet['!ref']);
    if (range.e.r > 0 || range.e.c > 0) return name;
  }
  return workbook.SheetNames[0] ?? null;
}
