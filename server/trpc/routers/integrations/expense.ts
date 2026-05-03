import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import { AuthContext } from '@/src/types';
import { runParsers } from '@/src/lib/expense/parsers';
import { ingestParsed } from '@/src/lib/expense/ingest';
import { parseSbiCsv, sbiCsvRowToParsed } from '@/src/lib/expense/csv/sbi';
import { getExpenseSyncFailuresCollection } from '@/src/lib/db';
import { ObjectId } from 'mongodb';

const ingestRawSchema = z.object({
  channel: z.enum(['email', 'sms']),
  fromAddress: z.string().optional(),
  fromSender: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1).max(20000),
  receivedAt: z.string().datetime().optional(),
});

const importStatementSchema = z.object({
  format: z.enum(['sbi-csv']),
  // Raw file contents — UI uploads as text, max ~5MB statement.
  content: z.string().min(1).max(5 * 1024 * 1024),
  accountLast4Override: z.string().regex(/^\d{4}$/).optional(),
});

export const expenseRouter = router({
  /**
   * Run a single email/SMS body through the parser registry and the ingest
   * pipeline. Returns the resulting transaction status. Used by the SMS
   * webhook and the "paste and ingest" UI affordance.
   */
  ingestRaw: withPermission('integrations:write')
    .input(ingestRawSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const result = runParsers({
        channel: input.channel,
        fromAddress: input.fromAddress,
        fromSender: input.fromSender,
        subject: input.subject,
        body: input.body,
        receivedAt: input.receivedAt ? new Date(input.receivedAt) : undefined,
      });

      if (!result.parsed) {
        if (result.matchedButFailed) {
          throw new TRPCError({
            code: 'UNPROCESSABLE_CONTENT',
            message: `Parser ${result.parserId} matched the source but couldn't extract a transaction`,
          });
        }
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No parser matched this body',
        });
      }

      const ingest = await ingestParsed(result.parsed, {
        householdId: auth.householdId!,
      });
      if (!ingest.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Ingest failed (${ingest.kind}): ${ingest.reason}`,
        });
      }

      return {
        transactionId: ingest.transactionId.toString(),
        status: ingest.status,
        parserId: result.parserId,
      };
    }),

  /**
   * Import a CSV/PDF statement. Currently only the SBI CSV format is
   * supported. Each row goes through the same dedupe path as live syncs,
   * so re-importing the same file is safe.
   */
  importStatement: withPermission('integrations:write')
    .input(importStatementSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const parsed = parseSbiCsv(input.content);
      const last4 = input.accountLast4Override ?? parsed.accountLast4;
      if (!last4) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Could not determine account last4 from the file; pass accountLast4Override',
        });
      }

      let created = 0;
      let updated = 0;
      let duplicate = 0;
      let failed = 0;

      for (const row of parsed.rows) {
        const ptx = sbiCsvRowToParsed(row, last4);
        const result = await ingestParsed(ptx, {
          householdId: auth.householdId!,
        });
        if (!result.ok) {
          failed += 1;
          continue;
        }
        if (result.status === 'created') created += 1;
        else if (result.status === 'updated') updated += 1;
        else duplicate += 1;
      }

      return {
        accountLast4: last4,
        rowsParsed: parsed.rows.length,
        rowsSkipped: parsed.skipped,
        created,
        updated,
        duplicate,
        failed,
        parserErrors: parsed.errors,
      };
    }),

  listFailures: withPermission('integrations:read')
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const failures = await getExpenseSyncFailuresCollection();
      const skip = (input.page - 1) * input.pageSize;
      const [total, items] = await Promise.all([
        failures.countDocuments({ householdId: auth.householdId }),
        failures
          .find({ householdId: auth.householdId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(input.pageSize)
          .toArray(),
      ]);
      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        items: items.map((f) => ({
          _id: f._id.toString(),
          parserId: f.parserId,
          kind: f.kind,
          reason: f.reason,
          redactedBody: f.redactedBody,
          createdAt: f.createdAt.toISOString(),
          resolvedAt: f.resolvedAt?.toISOString(),
        })),
      };
    }),

  resolveFailure: withPermission('integrations:write')
    .input(z.object({ failureId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const failures = await getExpenseSyncFailuresCollection();
      const result = await failures.updateOne(
        {
          _id: new ObjectId(input.failureId),
          householdId: auth.householdId,
        },
        { $set: { resolvedAt: new Date(), updatedAt: new Date() } }
      );
      if (result.matchedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Failure not found' });
      }
      return { msg: 'Failure marked resolved' };
    }),
});
