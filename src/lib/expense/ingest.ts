import { ObjectId } from 'mongodb';
import {
  getAccountsCollection,
  getExpenseAccountAliasesCollection,
  getExpenseSyncFailuresCollection,
  getTransactionsCollection,
} from '@/src/lib/db';
import type {
  ExpenseSyncFailureKind,
  TransactionLineItem,
  TransactionSource,
} from '@/src/types';
import type { ParsedTxn } from './types';
import { dedupeKeyForParsed } from './dedupe';
import { categorise } from './categorise';

export interface IngestContext {
  householdId: ObjectId;
  integrationAccountId?: ObjectId;
}

export type IngestStatus = 'created' | 'updated' | 'duplicate';

export interface IngestSuccess {
  ok: true;
  transactionId: ObjectId;
  status: IngestStatus;
  dedupeKey: string;
}

export interface IngestFailure {
  ok: false;
  kind: ExpenseSyncFailureKind;
  reason: string;
}

export type IngestResult = IngestSuccess | IngestFailure;

const SOURCE_PRIORITY: Record<TransactionSource, number> = {
  manual: 5,
  statement: 4,
  aa: 3,
  email: 2,
  merchant: 2,
  sms: 1,
};

/**
 * Inserts (or updates) a Transaction from a ParsedTxn. Handles:
 *   - account resolution via expense_account_aliases (auto-creates a stub
 *     account on the first sighting of an unknown last4)
 *   - categorisation via the rule + dict pipeline
 *   - dedupe via (householdId, dedupeKey) with source-priority merging
 *   - failure logging into expense_sync_failures
 *
 * Source priority: when a richer source (statement) sees a row that an SMS
 * already inserted, the existing row is updated in place and `status` is
 * `updated`. The reverse — SMS arriving after statement — is a `duplicate`.
 */
export async function ingestParsed(
  parsed: ParsedTxn,
  ctx: IngestContext,
  options?: { lineItems?: TransactionLineItem[] }
): Promise<IngestResult> {
  try {
    const accountId = parsed.accountLast4
      ? await resolveAccount(parsed, ctx)
      : undefined;

    let categoryId: ObjectId;
    let categorySource;
    try {
      const result = await categorise({
        householdId: ctx.householdId,
        payee: parsed.payee,
        type: parsed.type,
      });
      categoryId = result.categoryId;
      categorySource = result.source;
    } catch (err) {
      await logFailure(ctx, parsed, 'categorise', errorMessage(err));
      return { ok: false, kind: 'categorise', reason: errorMessage(err) };
    }

    const householdIdStr = ctx.householdId.toHexString();
    const dedupe = dedupeKeyForParsed(householdIdStr, parsed);

    const txs = await getTransactionsCollection();
    const existing = await txs.findOne({
      householdId: ctx.householdId,
      dedupeKey: dedupe,
    });

    const now = new Date();
    if (existing) {
      const incomingPriority = SOURCE_PRIORITY[parsed.source];
      const existingPriority = existing.source
        ? SOURCE_PRIORITY[existing.source]
        : 0;
      if (incomingPriority <= existingPriority) {
        return {
          ok: true,
          transactionId: existing._id,
          status: 'duplicate',
          dedupeKey: dedupe,
        };
      }
      await txs.updateOne(
        { _id: existing._id },
        {
          $set: {
            type: parsed.type,
            amount: parsed.amount,
            currency: parsed.currency,
            categoryId,
            accountId,
            description: parsed.description ?? parsed.payee,
            date: parsed.date,
            payee: parsed.payee,
            source: parsed.source,
            metadata: {
              ...(existing.metadata ?? {}),
              parserId: parsed.parserId,
              categorySource,
              ...(options?.lineItems ? { lineItems: options.lineItems } : {}),
              ...(parsed.origCurrency
                ? { origCurrency: parsed.origCurrency, origAmount: parsed.origAmount }
                : {}),
            },
            updatedAt: now,
          },
        }
      );
      return {
        ok: true,
        transactionId: existing._id,
        status: 'updated',
        dedupeKey: dedupe,
      };
    }

    const insertResult = await txs.insertOne({
      householdId: ctx.householdId,
      type: parsed.type,
      amount: parsed.amount,
      currency: parsed.currency,
      categoryId,
      accountId,
      description: parsed.description ?? parsed.payee,
      date: parsed.date,
      payee: parsed.payee,
      tags: parsed.refId ? [`ref:${parsed.refId}`] : [],
      isRecurring: false,
      source: parsed.source,
      dedupeKey: dedupe,
      metadata: {
        parserId: parsed.parserId,
        categorySource,
        ...(options?.lineItems ? { lineItems: options.lineItems } : {}),
        ...(parsed.origCurrency
          ? { origCurrency: parsed.origCurrency, origAmount: parsed.origAmount }
          : {}),
      },
      createdAt: now,
      updatedAt: now,
    } as never);

    return {
      ok: true,
      transactionId: insertResult.insertedId,
      status: 'created',
      dedupeKey: dedupe,
    };
  } catch (err) {
    // Surfacing a duplicate-key conflict as 'duplicate' instead of failure.
    const code = (err as { code?: number }).code;
    if (code === 11000) {
      const txs = await getTransactionsCollection();
      const householdIdStr = ctx.householdId.toHexString();
      const dedupe = dedupeKeyForParsed(householdIdStr, parsed);
      const existing = await txs.findOne({
        householdId: ctx.householdId,
        dedupeKey: dedupe,
      });
      if (existing) {
        return {
          ok: true,
          transactionId: existing._id,
          status: 'duplicate',
          dedupeKey: dedupe,
        };
      }
    }
    await logFailure(ctx, parsed, 'parse', errorMessage(err));
    return { ok: false, kind: 'parse', reason: errorMessage(err) };
  }
}

async function resolveAccount(
  parsed: ParsedTxn,
  ctx: IngestContext
): Promise<ObjectId | undefined> {
  if (!parsed.accountLast4) return undefined;
  const aliases = await getExpenseAccountAliasesCollection();
  const existing = await aliases.findOne({
    householdId: ctx.householdId,
    last4: parsed.accountLast4,
    issuer: parsed.issuer,
  });
  if (existing) return existing.accountId;

  const accounts = await getAccountsCollection();
  const now = new Date();
  const accountName = parsed.issuer
    ? `${parsed.issuer.toUpperCase()} ****${parsed.accountLast4}`
    : `Account ****${parsed.accountLast4}`;

  const accountResult = await accounts.insertOne({
    householdId: ctx.householdId,
    name: accountName,
    type: 'checking',
    balance: 0,
    currency: parsed.currency,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  } as never);

  await aliases.insertOne({
    householdId: ctx.householdId,
    last4: parsed.accountLast4,
    issuer: parsed.issuer,
    accountId: accountResult.insertedId,
    createdAt: now,
    updatedAt: now,
  } as never);

  return accountResult.insertedId;
}

async function logFailure(
  ctx: IngestContext,
  parsed: ParsedTxn,
  kind: ExpenseSyncFailureKind,
  reason: string
): Promise<void> {
  try {
    const failures = await getExpenseSyncFailuresCollection();
    const now = new Date();
    await failures.insertOne({
      householdId: ctx.householdId,
      integrationAccountId: ctx.integrationAccountId,
      parserId: parsed.parserId,
      kind,
      redactedBody: redactBody(parsed.raw ?? ''),
      reason,
      createdAt: now,
      updatedAt: now,
    } as never);
  } catch {
    // Failure logging is best-effort; we never want it to mask the original error.
  }
}

function redactBody(body: string): string {
  return body
    .replace(/\b\d{8,}\b/g, '<num>')
    .replace(/Rs\.?\s*[\d,]+(?:\.\d+)?/gi, 'Rs.<amt>')
    .slice(0, 800);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
