import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import { getAccessLogsCollection } from '@/src/lib/db';
import { AuthContext } from '@/src/types';

const listSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(200).default(50),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const recordSchema = z.object({
  action: z.string().min(1).max(60),
  detail: z.string().max(500).optional(),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
});

export const accessRouter = router({
  list: withPermission('security:read')
    .input(listSchema)
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const logs = await getAccessLogsCollection();

      const query: Record<string, unknown> = { householdId: auth.householdId };
      if (input.action) query.action = input.action;
      if (input.startDate || input.endDate) {
        const range: Record<string, Date> = {};
        if (input.startDate) range.$gte = new Date(input.startDate);
        if (input.endDate) range.$lte = new Date(input.endDate);
        query.at = range;
      }

      const skip = (input.page - 1) * input.pageSize;
      const [total, items] = await Promise.all([
        logs.countDocuments(query),
        logs.find(query).sort({ at: -1 }).skip(skip).limit(input.pageSize).toArray(),
      ]);

      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
        items: items.map((e) => ({
          _id: e._id.toString(),
          actorId: e.actorId?.toString(),
          actorName: e.actorName,
          deviceId: e.deviceId?.toString(),
          deviceName: e.deviceName,
          action: e.action,
          detail: e.detail,
          at: e.at.toISOString(),
        })),
      };
    }),

  record: withPermission('security:manage')
    .input(recordSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const logs = await getAccessLogsCollection();
      const now = new Date();

      await logs.insertOne({
        householdId: auth.householdId,
        actorId: auth.userId,
        actorName: auth.user?.name,
        deviceId: input.deviceId ? new ObjectId(input.deviceId) : undefined,
        deviceName: input.deviceName,
        action: input.action,
        detail: input.detail,
        at: now,
        createdAt: now,
        updatedAt: now,
      } as never);

      return { msg: 'Recorded' };
    }),
});

/**
 * Helper for routers that want to record an access log entry without going
 * through the tRPC layer (e.g. from the security mode arm/disarm flow).
 */
export async function recordAccess(params: {
  householdId: ObjectId | string;
  actorId?: ObjectId;
  actorName?: string;
  action: string;
  detail?: string;
  deviceId?: ObjectId;
  deviceName?: string;
}): Promise<void> {
  const logs = await getAccessLogsCollection();
  const now = new Date();
  await logs.insertOne({
    householdId: params.householdId,
    actorId: params.actorId,
    actorName: params.actorName,
    deviceId: params.deviceId,
    deviceName: params.deviceName,
    action: params.action,
    detail: params.detail,
    at: now,
    createdAt: now,
    updatedAt: now,
  } as never);
}
