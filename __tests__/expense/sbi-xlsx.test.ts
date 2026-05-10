import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

import {
  parseSbiXlsx,
  sbiXlsxRowToParsed,
  SbiXlsxError,
} from '@/src/lib/expense/xlsx/sbi-xlsx';

/**
 * Build an unencrypted SBI-shaped xlsx in-memory so we don't have to commit
 * a binary blob fixture. Mirrors the same 4 rows as the CSV fixture.
 */
function buildSbiFixtureBuffer(): Buffer {
  const rows: unknown[][] = [
    ['Account No: XXXXXXXXX7890', '', '', '', '', '', '', ''],
    ['Statement period: 01-Apr-2026 to 30-Apr-2026', '', '', '', '', '', '', ''],
    [],
    [
      'Txn Date',
      'Value Date',
      'Description',
      'Ref No./Cheque No.',
      'Branch Code',
      'Debit',
      'Credit',
      'Balance',
    ],
    [
      '01-Apr-2026',
      '01-Apr-2026',
      'BY TRANSFER-NEFT/SAL/EMPLOYER LTD',
      'NEFT001',
      '00691',
      '',
      75000,
      125000,
    ],
    [
      '03-Apr-2026',
      '03-Apr-2026',
      'TO TRANSFER-UPI/DR/123456789012/BIGBASKET ONLINE/SBIN/grocery@upi',
      'UTR123456789012',
      '00691',
      523,
      '',
      124477,
    ],
    [
      '05-Apr-2026',
      '05-Apr-2026',
      'TO TRANSFER-UPI/DR/223344556677/SWIGGY/HDFC/swiggy@axisb',
      'UTR223344556677',
      '00691',
      1250,
      '',
      123227,
    ],
    [
      '07-Apr-2026',
      '07-Apr-2026',
      'TO TRANSFER-UPI/DR/445566778899/AMAZON RETAIL/HDFC/amazon@apl',
      'UTR445566778899',
      '00691',
      1247.5,
      '',
      121979.5,
    ],
    ['End of statement', '', '', '', '', '', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Statement');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

test('parseSbiXlsx extracts header, account, and rows from an unencrypted file', async () => {
  const buf = buildSbiFixtureBuffer();
  const result = await parseSbiXlsx(buf);

  assert.equal(result.accountLast4, '7890');
  assert.equal(result.rows.length, 4);
  assert.equal(result.errors.length, 0);

  const [salary, bigbasket, swiggy, amazon] = result.rows;
  assert.equal(salary.credit, 75000);
  assert.equal(salary.debit, undefined);
  assert.equal(bigbasket.debit, 523);
  assert.equal(swiggy.debit, 1250);
  assert.equal(amazon.debit, 1247.5);
});

test('sbiXlsxRowToParsed produces ingest-ready ParsedTxn with sbi-xlsx parserId', async () => {
  const buf = buildSbiFixtureBuffer();
  const result = await parseSbiXlsx(buf);

  const debit = result.rows.find((r) => r.debit === 1247.5)!;
  const ptx = sbiXlsxRowToParsed(debit, result.accountLast4);

  assert.equal(ptx.parserId, 'sbi-xlsx');
  assert.equal(ptx.source, 'statement');
  assert.equal(ptx.type, 'expense');
  assert.equal(ptx.amount, 1247.5);
  assert.equal(ptx.currency, 'INR');
  assert.equal(ptx.accountLast4, '7890');
  assert.equal(ptx.issuer, 'sbi');
  assert.equal(ptx.payee, 'AMAZON RETAIL');
});

test('parseSbiXlsx throws PASSWORD_REQUIRED on encrypted input without password', async () => {
  // Fake but valid OLE2 envelope with the EncryptedPackage marker. We're not
  // actually decrypting — just checking that `isEncrypted` triggers the
  // PASSWORD_REQUIRED branch ahead of any decryption attempt.
  // Build by reading a real encrypted fixture if it ever lands; in lieu of
  // that, construct a minimal CFB with the required entry.
  const officeCrypto = (await import('officecrypto-tool')).default;

  // Generate an encrypted file ourselves using the lib's encrypt() (which
  // supports both standard and agile per the README) then verify decrypt
  // refusal without password.
  const plain = buildSbiFixtureBuffer();
  const encrypted = officeCrypto.encrypt(plain, { password: 'test123' });

  await assert.rejects(
    () => parseSbiXlsx(encrypted),
    (err: unknown) => {
      assert.ok(err instanceof SbiXlsxError);
      assert.equal((err as SbiXlsxError).code, 'PASSWORD_REQUIRED');
      return true;
    }
  );
});

test('parseSbiXlsx decrypts with the right password and rejects the wrong one', async () => {
  const officeCrypto = (await import('officecrypto-tool')).default;
  const plain = buildSbiFixtureBuffer();
  const encrypted = officeCrypto.encrypt(plain, { password: 'goodpass' });

  // Right password — round-trips through the parser.
  const ok = await parseSbiXlsx(encrypted, { password: 'goodpass' });
  assert.equal(ok.accountLast4, '7890');
  assert.equal(ok.rows.length, 4);

  // Wrong password — surfaces BAD_PASSWORD.
  await assert.rejects(
    () => parseSbiXlsx(encrypted, { password: 'WRONG' }),
    (err: unknown) => {
      assert.ok(err instanceof SbiXlsxError);
      assert.equal((err as SbiXlsxError).code, 'BAD_PASSWORD');
      return true;
    }
  );
});
