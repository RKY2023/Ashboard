import { TRPCError } from '@trpc/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getAaConsentsCollection,
  getAaSessionsCollection,
  getIntegrationAccountsCollection,
} from '@/src/lib/db';
import { AuthContext, AaFiType } from '@/src/types';
import { getAaAdapter, aaTxnToParsed } from '@/src/lib/expense/aa';
import { ingestParsed } from '@/src/lib/expense/ingest';

const fiTypeEnum = z.enum([
  'DEPOSIT',
  'TERM_DEPOSIT',
  'RECURRING_DEPOSIT',
  'CREDIT_CARD',
  'MUTUAL_FUNDS',
  'INSURANCE_POLICIES',
]);

const connectSchema = z.object({
  customerMobile: z.string().regex(/^[0-9]{10,15}$/),
  fiTypes: z.array(fiTypeEnum).min(1),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
  frequencyUnit: z.enum(['HOUR', 'DAY', 'MONTH', 'YEAR']).default('DAY'),
  frequencyValue: z.number().int().min(1).max(99).default(1),
});

const consentIdSchema = z.object({ consentDocId: z.string() });

export const aaRouter = router({
  /**
   * Step 1 — Create a consent. Returns the redirect URL the user opens in
   * their AA app to grant consent. We persist a PENDING `aa_consents` row
   * keyed by the TSP-issued consentHandle.
   */
  connect: withPermission('integrations:write')
    .input(connectSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const adapter = getAaAdapter();

      const integrationAccounts = await getIntegrationAccountsCollection();
      const now = new Date();

      const integration = await integrationAccounts.insertOne({
        householdId: auth.householdId!,
        userId: auth.userId,
        provider: 'aa-tsp',
        label: `AA via ${adapter.provider}`,
        credentials: { tspProvider: adapter.provider, customerMobile: input.customerMobile },
        scopes: input.fiTypes,
        enabledSourceIds: [],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as never);

      const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';
      const consent = await adapter.createConsent({
        customerMobile: input.customerMobile,
        fiTypes: input.fiTypes as AaFiType[],
        fromDate: new Date(input.fromDate),
        toDate: new Date(input.toDate),
        frequencyUnit: input.frequencyUnit,
        frequencyValue: input.frequencyValue,
        redirectUrlBase: `${baseUrl}/api/integrations/aa/callback`,
      });

      const consents = await getAaConsentsCollection();
      const consentDoc = await consents.insertOne({
        householdId: auth.householdId!,
        userId: auth.userId,
        integrationAccountId: integration.insertedId,
        tspProvider: adapter.provider,
        consentHandle: consent.consentHandle,
        status: 'PENDING',
        fiTypes: input.fiTypes as AaFiType[],
        customerMobile: input.customerMobile,
        fromDate: new Date(input.fromDate),
        toDate: new Date(input.toDate),
        frequency: { unit: input.frequencyUnit, value: input.frequencyValue },
        consentExpiresAt: consent.consentExpiresAt,
        redirectUrl: consent.redirectUrl,
        lastStatusAt: now,
        createdAt: now,
        updatedAt: now,
      } as never);

      return {
        consentDocId: consentDoc.insertedId.toString(),
        consentHandle: consent.consentHandle,
        redirectUrl: consent.redirectUrl,
        provider: adapter.provider,
      };
    }),

  /**
   * Poll the TSP for consent status. Updates the `aa_consents` row in place.
   * Call this from the UI after the user returns from the AA app.
   */
  refreshStatus: withPermission('integrations:read')
    .input(consentIdSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const consents = await getAaConsentsCollection();
      const consent = await consents.findOne({
        _id: new ObjectId(input.consentDocId),
        householdId: auth.householdId,
      });
      if (!consent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Consent not found' });
      }

      const adapter = getAaAdapter();
      const snap = await adapter.getConsentStatus(consent.consentHandle);

      await consents.updateOne(
        { _id: consent._id },
        {
          $set: {
            status: snap.status,
            consentId: snap.consentId,
            lastStatusAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      return { status: snap.status, consentId: snap.consentId };
    }),

  /**
   * Step 2 — Once the consent is ACTIVE, request a data session and pull
   * the resulting transactions through the ingest pipeline. Idempotent:
   * dedupeKey collapses re-fetches.
   */
  syncNow: withPermission('integrations:write')
    .input(consentIdSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const consents = await getAaConsentsCollection();
      const consent = await consents.findOne({
        _id: new ObjectId(input.consentDocId),
        householdId: auth.householdId,
      });
      if (!consent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Consent not found' });
      }
      if (consent.status !== 'ACTIVE' || !consent.consentId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Consent is ${consent.status}; cannot sync`,
        });
      }

      const adapter = getAaAdapter();
      const requested = await adapter.requestData({
        consentId: consent.consentId,
        fromDate: consent.fromDate,
        toDate: consent.toDate,
      });

      const sessions = await getAaSessionsCollection();
      const now = new Date();
      const sessionDoc = await sessions.insertOne({
        householdId: auth.householdId!,
        consentDocId: consent._id,
        tspProvider: consent.tspProvider,
        sessionId: requested.sessionId,
        status: 'REQUESTED',
        fromDate: consent.fromDate,
        toDate: consent.toDate,
        requestedAt: now,
        transactionsCount: 0,
        accountsCount: 0,
        createdAt: now,
        updatedAt: now,
      } as never);

      const data = await adapter.fetchData(requested.sessionId);

      let created = 0;
      let updated = 0;
      let duplicate = 0;
      let failed = 0;

      for (const account of data.accounts) {
        for (const txn of account.transactions) {
          const parsed = aaTxnToParsed(account, txn);
          const result = await ingestParsed(parsed, {
            householdId: auth.householdId!,
            integrationAccountId: consent.integrationAccountId,
          });
          if (!result.ok) {
            failed += 1;
            continue;
          }
          if (result.status === 'created') created += 1;
          else if (result.status === 'updated') updated += 1;
          else duplicate += 1;
        }
      }

      const total = created + updated + duplicate;
      await sessions.updateOne(
        { _id: sessionDoc.insertedId },
        {
          $set: {
            status: 'READY',
            dataReceivedAt: new Date(),
            transactionsCount: total,
            accountsCount: data.accounts.length,
            updatedAt: new Date(),
          },
        }
      );

      return { created, updated, duplicate, failed, accounts: data.accounts.length };
    }),

  list: withPermission('integrations:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const consents = await getAaConsentsCollection();
    const items = await consents
      .find({ householdId: auth.householdId })
      .sort({ createdAt: -1 })
      .toArray();
    return items.map((c) => ({
      _id: c._id.toString(),
      tspProvider: c.tspProvider,
      status: c.status,
      fiTypes: c.fiTypes,
      fromDate: c.fromDate.toISOString(),
      toDate: c.toDate.toISOString(),
      consentExpiresAt: c.consentExpiresAt?.toISOString(),
      redirectUrl: c.redirectUrl,
      createdAt: c.createdAt.toISOString(),
    }));
  }),

  disconnect: withPermission('integrations:write')
    .input(consentIdSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const consents = await getAaConsentsCollection();
      const result = await consents.updateOne(
        {
          _id: new ObjectId(input.consentDocId),
          householdId: auth.householdId,
        },
        { $set: { status: 'REVOKED', updatedAt: new Date() } }
      );
      if (result.matchedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Consent not found' });
      }
      return { msg: 'Consent revoked locally; revoke at AA app for full effect' };
    }),
});
