import { test } from 'node:test';
import assert from 'node:assert/strict';

import { aaTxnToParsed } from '@/src/lib/expense/aa';
import type {
  AaFiAccountData,
  AaFiTransaction,
} from '@/src/lib/expense/aa/types';
import { MockAaAdapter } from '@/src/lib/expense/aa/mock';

function makeAccount(): AaFiAccountData {
  return {
    fipId: 'SBI-FIP',
    fiType: 'DEPOSIT',
    maskedAccountNumber: 'XXXXXXXXX7890',
    last4: '7890',
    currency: 'INR',
    transactions: [],
  };
}

test('aaTxnToParsed maps a UPI debit to an expense ParsedTxn', () => {
  const account = makeAccount();
  const txn: AaFiTransaction = {
    txnId: 'T-1',
    type: 'DEBIT',
    mode: 'UPI',
    amount: 523,
    currency: 'INR',
    narration: 'UPI/DR/123456789012/BIGBASKET ONLINE/SBIN/grocery@upi',
    reference: 'UTR123',
    transactionDateTime: new Date('2026-04-12T10:14:00.000Z'),
  };

  const parsed = aaTxnToParsed(account, txn);
  assert.equal(parsed.type, 'expense');
  assert.equal(parsed.amount, 523);
  assert.equal(parsed.source, 'aa');
  assert.equal(parsed.accountLast4, '7890');
  assert.equal(parsed.issuer, 'sbi');
  assert.equal(parsed.payee, 'BIGBASKET ONLINE');
  assert.equal(parsed.refId, 'UTR123');
});

test('aaTxnToParsed maps NEFT credit to income', () => {
  const account = makeAccount();
  const txn: AaFiTransaction = {
    txnId: 'T-2',
    type: 'CREDIT',
    mode: 'NEFT',
    amount: 75000,
    currency: 'INR',
    narration: 'NEFT/SAL/EMPLOYER LTD',
    transactionDateTime: new Date('2026-04-01T09:00:00.000Z'),
  };

  const parsed = aaTxnToParsed(account, txn);
  assert.equal(parsed.type, 'income');
  assert.equal(parsed.payee, 'EMPLOYER LTD');
  assert.equal(parsed.amount, 75000);
});

test('aaTxnToParsed always returns a positive amount', () => {
  const account = makeAccount();
  const txn: AaFiTransaction = {
    txnId: 'T-3',
    type: 'DEBIT',
    amount: -1500,
    currency: 'INR',
    narration: 'POS/RAZORPAY/MERCHANT',
    transactionDateTime: new Date('2026-04-15T12:00:00.000Z'),
  };
  const parsed = aaTxnToParsed(account, txn);
  assert.equal(parsed.amount, 1500);
});

test('MockAaAdapter completes the consent → fetch flow', async () => {
  const adapter = new MockAaAdapter();
  const consent = await adapter.createConsent({
    customerMobile: '9999999999',
    fiTypes: ['DEPOSIT'],
    fromDate: new Date('2026-04-01T00:00:00.000Z'),
    toDate: new Date('2026-04-30T23:59:59.000Z'),
    frequencyUnit: 'DAY',
    frequencyValue: 1,
    redirectUrlBase: 'http://localhost:3000/api/integrations/aa/callback',
  });

  assert.ok(consent.consentHandle.startsWith('mock-consent-'));
  assert.match(consent.redirectUrl, /handle=mock-consent-/);

  const status = await adapter.getConsentStatus(consent.consentHandle);
  assert.equal(status.status, 'ACTIVE');
  assert.ok(status.consentId);

  const session = await adapter.requestData({
    consentId: status.consentId!,
    fromDate: new Date('2026-04-01T00:00:00.000Z'),
    toDate: new Date('2026-04-30T23:59:59.000Z'),
  });
  assert.ok(session.sessionId.startsWith('mock-sid-'));

  const data = await adapter.fetchData(session.sessionId);
  assert.equal(data.accounts.length, 1);
  assert.equal(data.accounts[0].last4, '7890');
  assert.equal(data.accounts[0].transactions.length, 3);
});
