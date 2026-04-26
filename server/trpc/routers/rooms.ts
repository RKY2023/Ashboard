import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import { getRoomsCollection, getDevicesCollection } from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';

// Schemas
const createRoomSchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().optional(),
  floor: z.number().optional(),
});

const updateRoomSchema = z.object({
  roomId: z.string(),
  name: z.string().min(1).max(50).optional(),
  icon: z.string().optional(),
  floor: z.number().optional(),
});

const reorderRoomsSchema = z.object({
  roomIds: z.array(z.string()),
});

export const roomsRouter = router({
  /**
   * List all rooms in the household
   */
  list: withPermission('devices:read')
    .query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const rooms = await getRoomsCollection();
      const devices = await getDevicesCollection();

      const roomsList = await rooms
        .find({
          householdId: auth.householdId,
          isActive: true,
        })
        .sort({ order: 1, name: 1 })
        .toArray();

      // Get device counts per room
      const deviceCounts = await devices.aggregate([
        {
          $match: {
            householdId: auth.householdId,
            isActive: true,
            roomId: { $ne: null },
          },
        },
        {
          $group: {
            _id: '$roomId',
            total: { $sum: 1 },
            online: {
              $sum: { $cond: ['$isOnline', 1, 0] },
            },
          },
        },
      ]).toArray();

      const countMap = new Map(
        deviceCounts.map(c => [c._id?.toString(), { total: c.total, online: c.online }])
      );

      return roomsList.map(room => ({
        _id: room._id.toString(),
        name: room.name,
        icon: room.icon,
        floor: room.floor,
        order: room.order,
        deviceCount: countMap.get(room._id.toString())?.total || 0,
        onlineCount: countMap.get(room._id.toString())?.online || 0,
        createdAt: room.createdAt.toISOString(),
      }));
    }),

  /**
   * Get a single room with its devices
   */
  get: withPermission('devices:read')
    .input(z.object({ roomId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { roomId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const rooms = await getRoomsCollection();
      const devices = await getDevicesCollection();

      const room = await rooms.findOne({
        _id: new ObjectId(roomId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found',
        });
      }

      // Get devices in this room
      const roomDevices = await devices
        .find({
          householdId: auth.householdId,
          roomId: room._id,
          isActive: true,
        })
        .toArray();

      return {
        _id: room._id.toString(),
        name: room.name,
        icon: room.icon,
        floor: room.floor,
        order: room.order,
        createdAt: room.createdAt.toISOString(),
        devices: roomDevices.map(d => ({
          _id: d._id.toString(),
          name: d.name,
          type: d.type,
          state: d.state,
          isOnline: d.isOnline,
          capabilities: d.capabilities,
        })),
      };
    }),

  /**
   * Create a new room
   */
  create: withPermission('devices:write')
    .input(createRoomSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const rooms = await getRoomsCollection();
      const now = new Date();

      // Get max order for new room
      const maxOrderRoom = await rooms
        .findOne(
          { householdId: auth.householdId, isActive: true },
          { sort: { order: -1 } }
        );

      const order = (maxOrderRoom?.order || 0) + 1;

      const roomDoc = {
        householdId: auth.householdId,
        name: input.name,
        icon: input.icon,
        floor: input.floor,
        order,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await rooms.insertOne(roomDoc as never);

      // Audit log
      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'room',
        result.insertedId,
        { name: input.name }
      );

      return {
        _id: result.insertedId.toString(),
        msg: 'Room created successfully',
      };
    }),

  /**
   * Update a room
   */
  update: withPermission('devices:write')
    .input(updateRoomSchema)
    .mutation(async ({ input, ctx }) => {
      const { roomId, ...updates } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const rooms = await getRoomsCollection();

      const room = await rooms.findOne({
        _id: new ObjectId(roomId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found',
        });
      }

      const updateDoc: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (updates.name) updateDoc.name = updates.name;
      if (updates.icon !== undefined) updateDoc.icon = updates.icon;
      if (updates.floor !== undefined) updateDoc.floor = updates.floor;

      await rooms.updateOne(
        { _id: new ObjectId(roomId) },
        { $set: updateDoc }
      );

      // Audit log
      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'room',
        new ObjectId(roomId),
        updates
      );

      return { msg: 'Room updated successfully' };
    }),

  /**
   * Delete a room (soft delete)
   */
  delete: withPermission('devices:delete')
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { roomId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const rooms = await getRoomsCollection();
      const devices = await getDevicesCollection();

      const room = await rooms.findOne({
        _id: new ObjectId(roomId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Room not found',
        });
      }

      // Unassign devices from this room
      await devices.updateMany(
        { roomId: new ObjectId(roomId) },
        { $unset: { roomId: '' }, $set: { updatedAt: new Date() } }
      );

      // Soft delete room
      await rooms.updateOne(
        { _id: new ObjectId(roomId) },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      // Audit log
      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'room',
        new ObjectId(roomId)
      );

      return { msg: 'Room deleted successfully' };
    }),

  /**
   * Reorder rooms
   */
  reorder: withPermission('devices:write')
    .input(reorderRoomsSchema)
    .mutation(async ({ input, ctx }) => {
      const { roomIds } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const rooms = await getRoomsCollection();

      // Update order for each room
      const bulkOps = roomIds.map((roomId, index) => ({
        updateOne: {
          filter: {
            _id: new ObjectId(roomId),
            householdId: auth.householdId,
          },
          update: { $set: { order: index, updatedAt: new Date() } },
        },
      }));

      await rooms.bulkWrite(bulkOps);

      return { msg: 'Rooms reordered successfully' };
    }),

  /**
   * Get unassigned devices (devices without a room)
   */
  unassignedDevices: withPermission('devices:read')
    .query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const devices = await getDevicesCollection();

      const unassigned = await devices
        .find({
          householdId: auth.householdId,
          roomId: { $exists: false },
          isActive: true,
        })
        .toArray();

      return unassigned.map(d => ({
        _id: d._id.toString(),
        name: d.name,
        type: d.type,
        state: d.state,
        isOnline: d.isOnline,
        capabilities: d.capabilities,
      }));
    }),
});
