import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { householdProcedure, withPermission } from '@/server/trpc/middleware/auth';
import { getDevicesCollection, getRoomsCollection, getAutomationsCollection } from '@/src/lib/db';
import { auditHelpers, getResourceAuditLogs } from '@/src/lib/db/audit';
import { AuthContext, DeviceType, DeviceProtocol, DeviceCapability } from '@/src/types';
import { deviceHistoryRouter } from './history';

// Schemas
const deviceTypeEnum = z.enum([
  'light', 'switch', 'thermostat', 'lock', 'sensor', 'camera',
  'doorbell', 'garage', 'plug', 'fan', 'blinds', 'speaker', 'tv', 'appliance', 'other'
]);

const deviceProtocolEnum = z.enum([
  'zigbee', 'zwave', 'wifi', 'bluetooth', 'mqtt', 'matter', 'thread'
]);

const deviceCapabilityEnum = z.enum([
  'on_off', 'brightness', 'color', 'color_temp', 'temperature', 'humidity',
  'motion', 'contact', 'lock', 'battery', 'energy', 'video', 'audio',
  'fan_speed', 'auto_lock'
]);

const createDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  type: deviceTypeEnum,
  protocol: deviceProtocolEnum,
  roomId: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  mqttTopic: z.string().optional(),
  capabilities: z.array(deviceCapabilityEnum).default([]),
  state: z.record(z.string(), z.unknown()).default({}),
});

const updateDeviceSchema = z.object({
  deviceId: z.string(),
  name: z.string().min(1).max(100).optional(),
  roomId: z.string().nullable().optional(),
  mqttTopic: z.string().optional(),
  capabilities: z.array(deviceCapabilityEnum).optional(),
});

const controlDeviceSchema = z.object({
  deviceId: z.string(),
  command: z.string(),
  value: z.unknown(),
});

const listDevicesSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  roomId: z.string().optional(),
  type: deviceTypeEnum.optional(),
  isOnline: z.boolean().optional(),
  search: z.string().optional(),
});

export const devicesRouter = router({
  /**
   * List all devices in the household
   */
  list: withPermission('devices:read')
    .input(listDevicesSchema)
    .query(async ({ input, ctx }) => {
      const { page, pageSize, roomId, type, isOnline, search } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const devices = await getDevicesCollection();

      // Build query
      const query: Record<string, unknown> = {
        householdId: auth.householdId,
        isActive: true,
      };

      if (roomId) query.roomId = new ObjectId(roomId);
      if (type) query.type = type;
      if (isOnline !== undefined) query.isOnline = isOnline;
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }

      const skip = (page - 1) * pageSize;

      const [devicesList, total] = await Promise.all([
        devices
          .find(query)
          .sort({ name: 1 })
          .skip(skip)
          .limit(pageSize)
          .toArray(),
        devices.countDocuments(query),
      ]);

      return {
        items: devicesList.map(d => ({
          _id: d._id.toString(),
          name: d.name,
          type: d.type,
          protocol: d.protocol,
          roomId: d.roomId?.toString(),
          manufacturer: d.manufacturer,
          model: d.model,
          state: d.state,
          capabilities: d.capabilities,
          isOnline: d.isOnline,
          lastSeenAt: d.lastSeenAt?.toISOString(),
          createdAt: d.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  /**
   * Get a single device by ID
   */
  get: withPermission('devices:read')
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { deviceId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const devices = await getDevicesCollection();
      const device = await devices.findOne({
        _id: new ObjectId(deviceId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!device) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Device not found',
        });
      }

      // Get room name if assigned
      let roomName: string | undefined;
      if (device.roomId) {
        const rooms = await getRoomsCollection();
        const room = await rooms.findOne({ _id: device.roomId });
        roomName = room?.name;
      }

      return {
        _id: device._id.toString(),
        name: device.name,
        type: device.type,
        protocol: device.protocol,
        roomId: device.roomId?.toString(),
        roomName,
        manufacturer: device.manufacturer,
        model: device.model,
        firmwareVersion: device.firmwareVersion,
        mqttTopic: device.mqttTopic,
        state: device.state,
        capabilities: device.capabilities,
        isOnline: device.isOnline,
        lastSeenAt: device.lastSeenAt?.toISOString(),
        createdAt: device.createdAt.toISOString(),
        updatedAt: device.updatedAt.toISOString(),
      };
    }),

  /**
   * Create a new device
   */
  create: withPermission('devices:write')
    .input(createDeviceSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const devices = await getDevicesCollection();
      const now = new Date();

      // Verify room exists if provided
      if (input.roomId) {
        const rooms = await getRoomsCollection();
        const room = await rooms.findOne({
          _id: new ObjectId(input.roomId),
          householdId: auth.householdId,
          isActive: true,
        });

        if (!room) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Room not found',
          });
        }
      }

      const deviceDoc = {
        householdId: auth.householdId,
        roomId: input.roomId ? new ObjectId(input.roomId) : undefined,
        name: input.name,
        type: input.type as DeviceType,
        protocol: input.protocol as DeviceProtocol,
        manufacturer: input.manufacturer,
        model: input.model,
        mqttTopic: input.mqttTopic,
        state: input.state,
        capabilities: input.capabilities as DeviceCapability[],
        isOnline: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await devices.insertOne(deviceDoc as never);

      // Audit log
      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'device',
        result.insertedId,
        { name: input.name, type: input.type }
      );

      return {
        _id: result.insertedId.toString(),
        msg: 'Device created successfully',
      };
    }),

  /**
   * Update a device
   */
  update: withPermission('devices:write')
    .input(updateDeviceSchema)
    .mutation(async ({ input, ctx }) => {
      const { deviceId, ...updates } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const devices = await getDevicesCollection();

      const device = await devices.findOne({
        _id: new ObjectId(deviceId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!device) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Device not found',
        });
      }

      const updateDoc: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (updates.name) updateDoc.name = updates.name;
      if (updates.mqttTopic !== undefined) updateDoc.mqttTopic = updates.mqttTopic;
      if (updates.capabilities) updateDoc.capabilities = updates.capabilities;

      if (updates.roomId !== undefined) {
        if (updates.roomId === null) {
          updateDoc.roomId = null;
        } else {
          // Verify room exists
          const rooms = await getRoomsCollection();
          const room = await rooms.findOne({
            _id: new ObjectId(updates.roomId),
            householdId: auth.householdId,
            isActive: true,
          });

          if (!room) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Room not found',
            });
          }
          updateDoc.roomId = new ObjectId(updates.roomId);
        }
      }

      await devices.updateOne(
        { _id: new ObjectId(deviceId) },
        { $set: updateDoc }
      );

      // Audit log
      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'device',
        new ObjectId(deviceId),
        updates
      );

      return { msg: 'Device updated successfully' };
    }),

  /**
   * Delete a device (soft delete)
   */
  delete: withPermission('devices:delete')
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { deviceId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const devices = await getDevicesCollection();

      const device = await devices.findOne({
        _id: new ObjectId(deviceId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!device) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Device not found',
        });
      }

      await devices.updateOne(
        { _id: new ObjectId(deviceId) },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      // Audit log
      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'device',
        new ObjectId(deviceId)
      );

      return { msg: 'Device deleted successfully' };
    }),

  /**
   * Control a device (send command)
   */
  control: withPermission('devices:control')
    .input(controlDeviceSchema)
    .mutation(async ({ input, ctx }) => {
      const { deviceId, command, value } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const devices = await getDevicesCollection();

      const device = await devices.findOne({
        _id: new ObjectId(deviceId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!device) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Device not found',
        });
      }

      // Update device state
      const newState = { ...device.state, [command]: value };

      await devices.updateOne(
        { _id: new ObjectId(deviceId) },
        {
          $set: {
            state: newState,
            updatedAt: new Date(),
          },
        }
      );

      // Audit log
      await auditHelpers.logDeviceControl(
        auth.userId,
        auth.householdId!,
        new ObjectId(deviceId),
        command,
        newState
      );

      // TODO: Send command via MQTT
      // This will be implemented when we add MQTT support

      return {
        msg: 'Command sent successfully',
        state: newState,
      };
    }),

  /**
   * Update device state (from MQTT/WebSocket)
   */
  updateState: householdProcedure
    .input(z.object({
      deviceId: z.string(),
      state: z.record(z.string(), z.unknown()),
      isOnline: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { deviceId, state, isOnline } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const devices = await getDevicesCollection();

      const updateDoc: Record<string, unknown> = {
        state,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      };

      if (isOnline !== undefined) {
        updateDoc.isOnline = isOnline;
      }

      const result = await devices.updateOne(
        {
          _id: new ObjectId(deviceId),
          householdId: auth.householdId,
          isActive: true,
        },
        { $set: updateDoc }
      );

      if (result.matchedCount === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Device not found',
        });
      }

      return { msg: 'State updated' };
    }),

  /**
   * Get device statistics
   */
  stats: withPermission('devices:read')
    .query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const devices = await getDevicesCollection();

      const [total, online, byType, byRoom] = await Promise.all([
        devices.countDocuments({
          householdId: auth.householdId,
          isActive: true,
        }),
        devices.countDocuments({
          householdId: auth.householdId,
          isActive: true,
          isOnline: true,
        }),
        devices.aggregate([
          { $match: { householdId: auth.householdId, isActive: true } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]).toArray(),
        devices.aggregate([
          { $match: { householdId: auth.householdId, isActive: true } },
          { $group: { _id: '$roomId', count: { $sum: 1 } } },
        ]).toArray(),
      ]);

      return {
        total,
        online,
        offline: total - online,
        byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
        byRoom: Object.fromEntries(
          byRoom.map(r => [r._id?.toString() || 'unassigned', r.count])
        ),
      };
    }),

  /**
   * Bulk control devices
   */
  bulkControl: withPermission('devices:control')
    .input(z.object({
      deviceIds: z.array(z.string()),
      command: z.string(),
      value: z.unknown(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { deviceIds, command, value } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const devices = await getDevicesCollection();

      const objectIds = deviceIds.map(id => new ObjectId(id));

      // Verify all devices exist and belong to household
      const deviceCount = await devices.countDocuments({
        _id: { $in: objectIds },
        householdId: auth.householdId,
        isActive: true,
      });

      if (deviceCount !== deviceIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more devices not found',
        });
      }

      // Update all devices
      await devices.updateMany(
        {
          _id: { $in: objectIds },
          householdId: auth.householdId,
          isActive: true,
        },
        {
          $set: {
            [`state.${command}`]: value,
            updatedAt: new Date(),
          },
        }
      );

      return {
        msg: `Command sent to ${deviceIds.length} devices`,
        affected: deviceIds.length,
      };
    }),

  /**
   * Recent control commands for a device — sourced from the audit log so
   * the detail page can show "what happened to this device lately" without
   * a separate command-history collection.
   */
  recentCommands: withPermission('devices:read')
    .input(z.object({ deviceId: z.string(), limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const devices = await getDevicesCollection();
      const device = await devices.findOne({
        _id: new ObjectId(input.deviceId),
        householdId: auth.householdId,
        isActive: true,
      });
      if (!device) throw new TRPCError({ code: 'NOT_FOUND', message: 'Device not found' });

      const logs = await getResourceAuditLogs('device', new ObjectId(input.deviceId), input.limit);
      return logs.map((l) => ({
        _id: l._id.toString(),
        action: l.action,
        userId: l.userId.toString(),
        details: l.details,
        at: l.createdAt.toISOString(),
      }));
    }),

  /**
   * Automations that reference this device anywhere in their trigger,
   * condition, or action lists.
   */
  automationsUsing: withPermission('devices:read')
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const automations = await getAutomationsCollection();
      const matches = await automations
        .find({
          householdId: auth.householdId,
          isActive: true,
          $or: [
            { 'triggers.deviceId': input.deviceId },
            { 'conditions.deviceId': input.deviceId },
            { 'actions.deviceId': input.deviceId },
          ],
        } as never)
        .sort({ name: 1 })
        .toArray();
      return matches.map((a) => ({
        _id: a._id.toString(),
        name: a.name,
        isEnabled: a.isEnabled,
      }));
    }),

  // Sub-router for device history
  history: deviceHistoryRouter,
});
