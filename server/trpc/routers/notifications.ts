import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getNotificationsCollection,
  getAlertRulesCollection,
} from '@/src/lib/db';
import { AuthContext, ResourceType } from '@/src/types';

const channelEnum = z.enum(['app', 'email', 'push', 'sms']);
const typeEnum = z.enum(['info', 'warning', 'alert', 'success']);
const resourceEnum = z.enum([
  'user',
  'household',
  'device',
  'room',
  'automation',
  'scene',
  'schedule',
  'security',
  'energy',
  'grocery',
  'recipe',
  'transaction',
  'budget',
]);

const listSchema = z.object({
  isRead: z.boolean().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(200).default(50),
});

const createNotificationSchema = z.object({
  type: typeEnum.default('info'),
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(1000),
  resourceType: resourceEnum.optional(),
  resourceId: z.string().optional(),
  channels: z.array(channelEnum).default(['app']),
});

const ruleConditionSchema = z.object({
  metric: z.string().min(1),
  op: z.enum(['gt', 'lt', 'gte', 'lte', 'eq', 'ne']),
  threshold: z.number(),
});

const upsertRuleSchema = z.object({
  ruleId: z.string().optional(),
  name: z.string().min(1).max(80),
  resourceType: resourceEnum,
  condition: ruleConditionSchema,
  channels: z.array(channelEnum).default(['app']),
  cooldownMinutes: z.number().min(0).max(1440).default(60),
  isEnabled: z.boolean().default(true),
});

export const notificationsRouter = router({
  /**
   * List notifications for the current user
   */
  list: withPermission('notifications:read')
    .input(listSchema)
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const notifications = await getNotificationsCollection();

      const query: Record<string, unknown> = {
        userId: auth.userId,
        householdId: auth.householdId,
      };
      if (input.isRead !== undefined) query.isRead = input.isRead;

      const skip = (input.page - 1) * input.pageSize;
      const [total, items, unread] = await Promise.all([
        notifications.countDocuments(query),
        notifications
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(input.pageSize)
          .toArray(),
        notifications.countDocuments({
          userId: auth.userId,
          householdId: auth.householdId,
          isRead: false,
        }),
      ]);

      return {
        total,
        unread,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
        items: items.map((n) => ({
          _id: n._id.toString(),
          type: n.type,
          title: n.title,
          message: n.message,
          resourceType: n.resourceType,
          resourceId: n.resourceId?.toString(),
          isRead: n.isRead,
          readAt: n.readAt?.toISOString(),
          channels: n.channels,
          createdAt: n.createdAt.toISOString(),
        })),
      };
    }),

  /**
   * Mark notification as read
   */
  markRead: withPermission('notifications:read')
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const notifications = await getNotificationsCollection();
      await notifications.updateOne(
        {
          _id: new ObjectId(input.notificationId),
          userId: auth.userId,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      return { msg: 'Marked read' };
    }),

  markAllRead: withPermission('notifications:read').mutation(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const notifications = await getNotificationsCollection();
    const result = await notifications.updateMany(
      {
        userId: auth.userId,
        householdId: auth.householdId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    return { count: result.modifiedCount };
  }),

  delete: withPermission('notifications:read')
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const notifications = await getNotificationsCollection();
      await notifications.deleteOne({
        _id: new ObjectId(input.notificationId),
        userId: auth.userId,
      });
      return { msg: 'Deleted' };
    }),

  /**
   * Create a notification (internal use, but exposed for now)
   */
  create: withPermission('notifications:manage')
    .input(createNotificationSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const notifications = await getNotificationsCollection();
      const now = new Date();
      const result = await notifications.insertOne({
        userId: auth.userId,
        householdId: auth.householdId!,
        type: input.type,
        title: input.title,
        message: input.message,
        resourceType: input.resourceType as ResourceType | undefined,
        resourceId: input.resourceId
          ? new ObjectId(input.resourceId)
          : undefined,
        isRead: false,
        channels: input.channels,
        createdAt: now,
        updatedAt: now,
      } as never);
      return { _id: result.insertedId.toString() };
    }),

  /**
   * Alert rules
   */
  rules: router({
    list: withPermission('notifications:manage').query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const rules = await getAlertRulesCollection();
      const items = await rules
        .find({ householdId: auth.householdId })
        .sort({ name: 1 })
        .toArray();
      return items.map((r) => ({
        _id: r._id.toString(),
        name: r.name,
        resourceType: r.resourceType,
        condition: r.condition,
        channels: r.channels,
        isEnabled: r.isEnabled,
        cooldownMinutes: r.cooldownMinutes,
        lastFiredAt: r.lastFiredAt?.toISOString(),
        lastEvaluatedAt: r.lastEvaluatedAt?.toISOString(),
        lastValue: r.lastValue,
      }));
    }),

    metrics: withPermission('notifications:manage').query(async () => {
      const { listAvailableMetrics } = await import('@/server/jobs/lib/metrics');
      return listAvailableMetrics();
    }),

    upsert: withPermission('notifications:manage')
      .input(upsertRuleSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const rules = await getAlertRulesCollection();
        const now = new Date();

        if (input.ruleId) {
          await rules.updateOne(
            {
              _id: new ObjectId(input.ruleId),
              householdId: auth.householdId,
            },
            {
              $set: {
                name: input.name,
                resourceType: input.resourceType,
                condition: input.condition,
                channels: input.channels,
                cooldownMinutes: input.cooldownMinutes,
                isEnabled: input.isEnabled,
                updatedAt: now,
              },
            }
          );
          return { _id: input.ruleId };
        }

        const result = await rules.insertOne({
          householdId: auth.householdId!,
          name: input.name,
          resourceType: input.resourceType,
          condition: input.condition,
          channels: input.channels,
          cooldownMinutes: input.cooldownMinutes,
          isEnabled: input.isEnabled,
          createdAt: now,
          updatedAt: now,
        } as never);
        return { _id: result.insertedId.toString() };
      }),

    delete: withPermission('notifications:manage')
      .input(z.object({ ruleId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const rules = await getAlertRulesCollection();
        const result = await rules.deleteOne({
          _id: new ObjectId(input.ruleId),
          householdId: auth.householdId,
        });
        if (result.deletedCount === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Rule not found' });
        }
        return { msg: 'Rule removed' };
      }),
  }),
});
