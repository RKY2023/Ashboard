import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getVoiceIntentsCollection,
  getAutomationsCollection,
  getScenesCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';

const providerEnum = z.enum(['alexa', 'google', 'generic']);
const targetTypeEnum = z.enum(['automation', 'scene']);

const upsertSchema = z.object({
  intentId: z.string().optional(),
  provider: providerEnum,
  intent: z.string().min(1).max(120),
  targetType: targetTypeEnum,
  targetId: z.string(),
  isActive: z.boolean().default(true),
});

async function assertTargetExists(
  householdId: string,
  targetType: 'automation' | 'scene',
  targetId: string
): Promise<void> {
  const collection =
    targetType === 'automation'
      ? await getAutomationsCollection()
      : await getScenesCollection();
  const exists = await collection.findOne({
    _id: new ObjectId(targetId),
    householdId,
    isActive: true,
  } as never);
  if (!exists) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `${targetType} not found` });
  }
}

export const voiceRouter = router({
  list: withPermission('integrations:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const intents = await getVoiceIntentsCollection();
    const items = await intents
      .find({ householdId: auth.householdId } as never)
      .sort({ provider: 1, intent: 1 })
      .toArray();

    return items.map((v) => ({
      _id: v._id.toString(),
      provider: v.provider,
      intent: v.intent,
      targetType: v.targetType,
      targetId: v.targetId.toString(),
      isActive: v.isActive,
      lastTriggeredAt: v.lastTriggeredAt?.toISOString(),
      triggerCount: v.triggerCount ?? 0,
      createdAt: v.createdAt.toISOString(),
    }));
  }),

  upsert: withPermission('integrations:write')
    .input(upsertSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      await assertTargetExists(auth.householdId as unknown as string, input.targetType, input.targetId);

      const intents = await getVoiceIntentsCollection();
      const now = new Date();

      const fields = {
        provider: input.provider,
        intent: input.intent.toLowerCase(),
        targetType: input.targetType,
        targetId: new ObjectId(input.targetId),
        isActive: input.isActive,
        updatedAt: now,
      };

      if (input.intentId) {
        const result = await intents.updateOne(
          {
            _id: new ObjectId(input.intentId),
            householdId: auth.householdId,
          } as never,
          { $set: fields }
        );
        if (result.matchedCount === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Voice intent not found' });
        }
        return { _id: input.intentId, msg: 'Voice intent updated' };
      }

      const result = await intents.insertOne({
        householdId: auth.householdId,
        ...fields,
        triggerCount: 0,
        createdAt: now,
      } as never);
      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'integration',
        result.insertedId,
        { kind: 'voice', provider: input.provider, intent: input.intent }
      );
      return { _id: result.insertedId.toString(), msg: 'Voice intent created' };
    }),

  delete: withPermission('integrations:write')
    .input(z.object({ intentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const intents = await getVoiceIntentsCollection();
      const result = await intents.deleteOne({
        _id: new ObjectId(input.intentId),
        householdId: auth.householdId,
      } as never);
      if (result.deletedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Voice intent not found' });
      }
      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'integration',
        new ObjectId(input.intentId)
      );
      return { msg: 'Voice intent removed' };
    }),
});
