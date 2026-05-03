import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseSbiCsv, sbiCsvRowToParsed } from '@/src/lib/expense/csv/sbi';

const FIXTURES = join(process.cwd(), '__tests__', 'fixtures', 'statements');

test('parseSbiCsv extracts header, account, and rows', () => {
  const content = readFileSync(join(FIXTURES, 'sbi-statement.csv'), 'utf8');
  const result = parseSbiCsv(content);

  assert.equal(result.accountLast4, '7890');
  assert.equal(result.rows.length, 4);
  assert.equal(result.errors.length, 0);

  const [salary, bigbasket, swiggy, amazon] = result.rows;

  assert.equal(salary.credit, 75000);
  assert.equal(salary.debit, undefined);
  assert.equal(salary.txnDate.toISOString().slice(0, 10), '2026-04-01');

  assert.equal(bigbasket.debit, 523);
  assert.equal(bigbasket.refNo, 'UTR123456789012');
  assert.ok(bigbasket.description.includes('BIGBASKET'));

  assert.equal(swiggy.debit, 1250);
  assert.equal(amazon.debit, 1247.5);
});

test('sbiCsvRowToParsed produces ingest-ready ParsedTxn', () => {
  const content = readFileSync(join(FIXTURES, 'sbi-statement.csv'), 'utf8');
  const result = parseSbiCsv(content);

  const debit = result.rows.find((r) => r.debit === 1247.5)!;
  const ptx = sbiCsvRowToParsed(debit, result.accountLast4);

  assert.equal(ptx.parserId, 'sbi-csv');
  assert.equal(ptx.source, 'statement');
  assert.equal(ptx.type, 'expense');
  assert.equal(ptx.amount, 1247.5);
  assert.equal(ptx.currency, 'INR');
  assert.equal(ptx.accountLast4, '7890');
  assert.equal(ptx.issuer, 'sbi');
  assert.equal(ptx.payee, 'AMAZON RETAIL');
  assert.equal(ptx.refId, 'UTR445566778899');

  const credit = result.rows.find((r) => r.credit === 75000)!;
  const credPtx = sbiCsvRowToParsed(credit, result.accountLast4);
  assert.equal(credPtx.type, 'income');
  assert.equal(credPtx.amount, 75000);
});

test('parseSbiCsv handles tab-delimited variant', () => {
  const tabContent = [
    'Account No: XXXXXXXXX1234',
    '',
    'Txn Date\tValue Date\tDescription\tRef No./Cheque No.\tBranch Code\tDebit\tCredit\tBalance',
    '05-Mar-2026\t05-Mar-2026\tTO POS/DR/123/STARBUCKS\tPOS123\t00691\t450.00\t\t12000.00',
  ].join('\n');

  const result = parseSbiCsv(tabContent);
  assert.equal(result.accountLast4, '1234');
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].debit, 450);
});

test('parseSbiCsv reports missing header', () => {
  const result = parseSbiCsv('totally\nunrelated\nfile content\n');
  assert.equal(result.rows.length, 0);
  assert.ok(result.errors.length > 0);
  assert.match(result.errors[0].reason, /header/i);
});
