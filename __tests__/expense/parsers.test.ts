import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { runParsers } from '@/src/lib/expense/parsers';
import { dedupeKey } from '@/src/lib/expense/dedupe';

const FIXTURES = join(process.cwd(), '__tests__', 'fixtures', 'expense-emails');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8');
}

test('HDFC debit email — Amazon purchase', () => {
  const body = loadFixture('hdfc-debit-amazon.txt');

  const result = runParsers({
    channel: 'email',
    fromAddress: 'alerts@hdfcbank.net',
    subject: 'Update on your HDFC Bank Account',
    body,
  });

  assert.equal(result.parserId, 'hdfc-debit');
  assert.ok(result.parsed, 'expected a parsed transaction');
  const tx = result.parsed!;
  assert.equal(tx.type, 'expense');
  assert.equal(tx.amount, 1247.5);
  assert.equal(tx.currency, 'INR');
  assert.equal(tx.accountLast4, '1234');
  assert.equal(tx.payee, 'AMAZON RETAIL IN');
  assert.equal(tx.refId, '412345678901');
  assert.equal(tx.date.toISOString().slice(0, 10), '2026-04-12');
});

test('HDFC debit email — Zomato (no decimals, extra spacing)', () => {
  const body = loadFixture('hdfc-debit-zomato.txt');

  const result = runParsers({
    channel: 'email',
    fromAddress: 'alerts@hdfcbank.net',
    body,
  });

  assert.ok(result.parsed, 'expected a parsed transaction');
  const tx = result.parsed!;
  assert.equal(tx.amount, 489);
  assert.equal(tx.accountLast4, '5678');
  assert.equal(tx.payee, 'ZOMATO ONLINE');
  assert.equal(tx.refId, '998877665544');
  assert.equal(tx.date.toISOString().slice(0, 10), '2026-03-03');
});

test('HDFC parser ignores unrelated sender', () => {
  const body = loadFixture('hdfc-debit-amazon.txt');

  const result = runParsers({
    channel: 'email',
    fromAddress: 'newsletter@example.com',
    body,
  });

  assert.equal(result.parsed, null);
  assert.equal(result.parserId, undefined);
});

test('HDFC parser flags matched-but-unparseable bodies', () => {
  const result = runParsers({
    channel: 'email',
    fromAddress: 'alerts@hdfcbank.net',
    body: 'Your statement is now available. Please log in to view.',
  });

  assert.equal(result.parsed, null);
  assert.equal(result.parserId, 'hdfc-debit');
  assert.equal(result.matchedButFailed, true);
});

test('SBI debit email — merchant transfer', () => {
  const body = loadFixture('sbi-debit-merchant.txt');

  const result = runParsers({
    channel: 'email',
    fromAddress: 'donotreply.sbiatm@alerts.sbi.co.in',
    body,
  });

  assert.equal(result.parserId, 'sbi-debit');
  assert.ok(result.parsed, 'expected a parsed transaction');
  const tx = result.parsed!;
  assert.equal(tx.type, 'expense');
  assert.equal(tx.amount, 523);
  assert.equal(tx.currency, 'INR');
  assert.equal(tx.accountLast4, '7890');
  assert.equal(tx.payee, 'BIGBASKET ONLINE');
  assert.equal(tx.issuer, 'sbi');
  assert.equal(tx.date.toISOString().slice(0, 10), '2026-04-12');
});

test('SBI UPI debit SMS — Swiggy', () => {
  const body = loadFixture('sbi-debit-upi-sms.txt');

  const result = runParsers({
    channel: 'sms',
    fromSender: 'VK-SBIINB',
    body,
  });

  assert.equal(result.parserId, 'sbi-debit');
  assert.ok(result.parsed, 'expected a parsed transaction');
  const tx = result.parsed!;
  assert.equal(tx.source, 'sms');
  assert.equal(tx.amount, 1250);
  assert.equal(tx.accountLast4, '7890');
  assert.equal(tx.payee, 'SWIGGY INSTAMART');
  assert.equal(tx.refId, '412345678901');
  assert.equal(tx.date.toISOString().slice(0, 10), '2026-03-05');
});

test('SBI parser ignores HDFC senders', () => {
  const body = loadFixture('sbi-debit-merchant.txt');

  const result = runParsers({
    channel: 'email',
    fromAddress: 'alerts@hdfcbank.net',
    body,
  });

  // The HDFC parser will claim the sender but the body is SBI-shaped, so
  // it can't extract — we expect matchedButFailed without a parsed result.
  assert.equal(result.parsed, null);
  assert.equal(result.parserId, 'hdfc-debit');
  assert.equal(result.matchedButFailed, true);
});

test('dedupeKey collapses email + SMS for the same transaction', () => {
  const householdId = 'household-abc';
  const date = new Date('2026-04-12T00:00:00.000Z');

  const fromEmail = dedupeKey({
    householdId,
    accountLast4: '1234',
    date,
    amount: 1247.5,
    payee: 'AMAZON RETAIL IN',
  });

  const fromSms = dedupeKey({
    householdId,
    accountLast4: '1234',
    date,
    amount: 1247.5,
    // SMS often has slightly different casing / punctuation
    payee: 'amazon-retail.in',
  });

  assert.equal(fromEmail, fromSms);
});

test('dedupeKey separates different households with the same txn', () => {
  const date = new Date('2026-04-12T00:00:00.000Z');
  const a = dedupeKey({
    householdId: 'household-a',
    accountLast4: '1234',
    date,
    amount: 1247.5,
    payee: 'AMAZON',
  });
  const b = dedupeKey({
    householdId: 'household-b',
    accountLast4: '1234',
    date,
    amount: 1247.5,
    payee: 'AMAZON',
  });
  assert.notEqual(a, b);
});
