import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getWebhooksCollection,
  getAutomationsCollection,
  getScenesCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';
import { generateSecret } from '@/server/integrations/hmac';

const targetTypeEnum = z.enum(['automation', 'scene']);

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  targetType: targetTypeEnum,
  targetId: z.string(),
});

const updateSchema = z.object({
  webhookId: z.string(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  targetType: targetTypeEnum.optional(),
  targetId: z.string().optional(),
  isActive: z.boolean().optional(),
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

export const webhooksRouter = router({
  list: withPermission('integrations:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const webhooks = await getWebhooksCollection();

    const items = await webhooks
      .find({ householdId: auth.householdId } as never)
      .sort({ name: 1 })
      .toArray();

    return items.map((w) => ({
      _id: w._id.toString(),
      name: w.name,
      description: w.description,
      secret: w.secret,
      targetType: w.targetType,
      targetId: w.targetId.toString(),
      isActive: w.isActive,
      lastTriggeredAt: w.lastTriggeredAt?.toISOString(),
      triggerCount: w.triggerCount ?? 0,
      createdAt: w.createdAt.toISOString(),
    }));
  }),

  create: withPermission('integrations:write')
    .input(createSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      await assertTargetExists(auth.householdId as unknown as string, input.targetType, input.targetId);

      const webhooks = await getWebhooksCollection();
      const now = new Date();
      const secret = generateSecret();

      const result = await webhooks.insertOne({
        householdId: auth.householdId,
        name: input.name,
        description: input.description,
        secret,
        targetType: input.targetType,
        targetId: new ObjectId(input.targetId),
        isActive: true,
        triggerCount: 0,
        createdAt: now,
        updatedAt: now,
      } as never);

      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'webhook',
        result.insertedId,
        { name: input.name, targetType: input.targetType }
      );

      return { _id: result.insertedId.toString(), secret };
    }),

  update: withPermission('integrations:write')
    .input(updateSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const webhooks = await getWebhooksCollection();

      const update: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) update.name = input.name;
      if (input.description !== undefined) update.description = input.description;
      if (input.isActive !== undefined) update.isActive = input.isActive;

      if (input.targetType !== undefined && input.targetId !== undefined) {
        await assertTargetExists(auth.householdId as unknown as string, input.targetType, input.targetId);
        update.targetType = input.targetType;
        update.targetId = new ObjectId(input.targetId);
      }

      const result = await webhooks.updateOne(
        {
          _id: new ObjectId(input.webhookId),
          householdId: auth.householdId,
        } as never,
        { $set: update }
      );
      if (result.matchedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook not found' });
      }
      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'webhook',
        new ObjectId(input.webhookId),
        input
      );
      return { msg: 'Webhook updated' };
    }),

  rotateSecret: withPermission('integrations:write')
    .input(z.object({ webhookId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const webhooks = await getWebhooksCollection();
      const newSecret = generateSecret();

      const result = await webhooks.updateOne(
        {
          _id: new ObjectId(input.webhookId),
          householdId: auth.householdId,
        } as never,
        { $set: { secret: newSecret, updatedAt: new Date() } }
      );
      if (result.matchedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook not found' });
      }
      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'webhook',
        new ObjectId(input.webhookId),
        { rotatedAt: new Date().toISOString() }
      );
      return { secret: newSecret };
    }),

  delete: withPermission('integrations:write')
    .input(z.object({ webhookId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const webhooks = await getWebhooksCollection();
      const result = await webhooks.deleteOne({
        _id: new ObjectId(input.webhookId),
        householdId: auth.householdId,
      } as never);
      if (result.deletedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook not found' });
      }
      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'webhook',
        new ObjectId(input.webhookId)
      );
      return { msg: 'Webhook removed' };
    }),
});
