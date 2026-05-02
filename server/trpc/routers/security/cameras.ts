import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import { getCamerasCollection } from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';

const registerSchema = z.object({
  name: z.string().min(1).max(80),
  hlsUrl: z.string().url(),
  snapshotUrl: z.string().url().optional(),
  roomId: z.string().optional(),
});

const updateSchema = z.object({
  cameraId: z.string(),
  name: z.string().min(1).max(80).optional(),
  hlsUrl: z.string().url().optional(),
  snapshotUrl: z.string().url().nullable().optional(),
  roomId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const camerasRouter = router({
  list: withPermission('security:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const cameras = await getCamerasCollection();
    const items = await cameras
      .find({ householdId: auth.householdId, isActive: true } as never)
      .sort({ name: 1 })
      .toArray();
    return items.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      hlsUrl: c.hlsUrl,
      snapshotUrl: c.snapshotUrl,
      roomId: c.roomId?.toString(),
      lastSeenAt: c.lastSeenAt?.toISOString(),
      createdAt: c.createdAt.toISOString(),
    }));
  }),

  get: withPermission('security:read')
    .input(z.object({ cameraId: z.string() }))
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const cameras = await getCamerasCollection();
      const camera = await cameras.findOne({
        _id: new ObjectId(input.cameraId),
        householdId: auth.householdId,
        isActive: true,
      } as never);
      if (!camera) throw new TRPCError({ code: 'NOT_FOUND', message: 'Camera not found' });
      return {
        _id: camera._id.toString(),
        name: camera.name,
        hlsUrl: camera.hlsUrl,
        snapshotUrl: camera.snapshotUrl,
        roomId: camera.roomId?.toString(),
        lastSeenAt: camera.lastSeenAt?.toISOString(),
        createdAt: camera.createdAt.toISOString(),
      };
    }),

  register: withPermission('security:manage')
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const cameras = await getCamerasCollection();
      const now = new Date();

      const doc = {
        householdId: auth.householdId,
        name: input.name,
        hlsUrl: input.hlsUrl,
        snapshotUrl: input.snapshotUrl,
        roomId: input.roomId ? new ObjectId(input.roomId) : undefined,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await cameras.insertOne(doc as never);
      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'security',
        result.insertedId,
        { type: 'camera', name: input.name }
      );

      return { _id: result.insertedId.toString(), msg: 'Camera registered' };
    }),

  update: withPermission('security:manage')
    .input(updateSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const cameras = await getCamerasCollection();

      const update: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) update.name = input.name;
      if (input.hlsUrl !== undefined) update.hlsUrl = input.hlsUrl;
      if (input.snapshotUrl !== undefined) update.snapshotUrl = input.snapshotUrl;
      if (input.roomId !== undefined) {
        update.roomId = input.roomId === null ? null : new ObjectId(input.roomId);
      }
      if (input.isActive !== undefined) update.isActive = input.isActive;

      const result = await cameras.updateOne(
        {
          _id: new ObjectId(input.cameraId),
          householdId: auth.householdId,
        } as never,
        { $set: update }
      );
      if (result.matchedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Camera not found' });
      }
      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'security',
        new ObjectId(input.cameraId),
        input
      );
      return { msg: 'Camera updated' };
    }),

  delete: withPermission('security:manage')
    .input(z.object({ cameraId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const cameras = await getCamerasCollection();
      const result = await cameras.updateOne(
        {
          _id: new ObjectId(input.cameraId),
          householdId: auth.householdId,
        } as never,
        { $set: { isActive: false, updatedAt: new Date() } }
      );
      if (result.matchedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Camera not found' });
      }
      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'security',
        new ObjectId(input.cameraId)
      );
      return { msg: 'Camera removed' };
    }),
});
