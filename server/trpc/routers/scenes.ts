import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import { getScenesCollection, getDevicesCollection } from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';

// Scene action schema
const sceneActionSchema = z.object({
  deviceId: z.string(),
  command: z.string(),
  value: z.unknown(),
});

// Scene schemas
const createSceneSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  roomId: z.string().optional(),
  actions: z.array(sceneActionSchema).min(1),
});

const updateSceneSchema = z.object({
  sceneId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  roomId: z.string().nullable().optional(),
  actions: z.array(sceneActionSchema).optional(),
});

export const scenesRouter = router({
  /**
   * List all scenes
   */
  list: withPermission('automation:read')
    .input(z.object({
      roomId: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const scenes = await getScenesCollection();

      const query: Record<string, unknown> = {
        householdId: auth.householdId,
        isActive: true,
      };

      if (input?.roomId) {
        query.roomId = new ObjectId(input.roomId);
      }

      if (input?.search) {
        query.name = { $regex: input.search, $options: 'i' };
      }

      const results = await scenes
        .find(query)
        .sort({ order: 1, name: 1 })
        .toArray();

      return results.map((s) => ({
        _id: s._id.toString(),
        name: s.name,
        description: s.description,
        icon: s.icon,
        color: s.color,
        roomId: s.roomId?.toString(),
        actions: s.actions,
        lastActivatedAt: s.lastActivatedAt?.toISOString(),
        activationCount: s.activationCount || 0,
        createdAt: s.createdAt.toISOString(),
      }));
    }),

  /**
   * Get a single scene
   */
  get: withPermission('automation:read')
    .input(z.object({ sceneId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { sceneId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const scenes = await getScenesCollection();

      const scene = await scenes.findOne({
        _id: new ObjectId(sceneId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!scene) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scene not found',
        });
      }

      // Get device names for actions
      const devices = await getDevicesCollection();
      const deviceIds = scene.actions.map((a: { deviceId: ObjectId }) => a.deviceId);
      const deviceDocs = await devices
        .find({ _id: { $in: deviceIds } })
        .toArray();

      const deviceMap = new Map(
        deviceDocs.map((d) => [d._id.toString(), d.name])
      );

      return {
        _id: scene._id.toString(),
        name: scene.name,
        description: scene.description,
        icon: scene.icon,
        color: scene.color,
        roomId: scene.roomId?.toString(),
        actions: scene.actions.map((a: { deviceId: ObjectId; command: string; value: unknown }) => ({
          deviceId: a.deviceId.toString(),
          deviceName: deviceMap.get(a.deviceId.toString()),
          command: a.command,
          value: a.value,
        })),
        lastActivatedAt: scene.lastActivatedAt?.toISOString(),
        activationCount: scene.activationCount || 0,
        createdAt: scene.createdAt.toISOString(),
        updatedAt: scene.updatedAt.toISOString(),
      };
    }),

  /**
   * Create a new scene
   */
  create: withPermission('automation:write')
    .input(createSceneSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const scenes = await getScenesCollection();
      const devices = await getDevicesCollection();
      const now = new Date();

      // Validate device IDs
      const deviceIds = input.actions.map((a) => new ObjectId(a.deviceId));
      const validDevices = await devices.countDocuments({
        _id: { $in: deviceIds },
        householdId: auth.householdId,
        isActive: true,
      });

      if (validDevices !== deviceIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more device IDs are invalid',
        });
      }

      // Get max order for positioning
      const maxOrderScene = await scenes
        .find({ householdId: auth.householdId, isActive: true })
        .sort({ order: -1 })
        .limit(1)
        .toArray();

      const order = (maxOrderScene[0]?.order || 0) + 1;

      const sceneDoc = {
        householdId: auth.householdId,
        name: input.name,
        description: input.description,
        icon: input.icon,
        color: input.color,
        roomId: input.roomId ? new ObjectId(input.roomId) : undefined,
        actions: input.actions.map((a) => ({
          deviceId: new ObjectId(a.deviceId),
          command: a.command,
          value: a.value,
        })),
        order,
        activationCount: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await scenes.insertOne(sceneDoc as never);

      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'scene',
        result.insertedId,
        { name: input.name }
      );

      return {
        _id: result.insertedId.toString(),
        msg: 'Scene created successfully',
      };
    }),

  /**
   * Update a scene
   */
  update: withPermission('automation:write')
    .input(updateSceneSchema)
    .mutation(async ({ input, ctx }) => {
      const { sceneId, ...updates } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const scenes = await getScenesCollection();

      const scene = await scenes.findOne({
        _id: new ObjectId(sceneId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!scene) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scene not found',
        });
      }

      const updateDoc: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (updates.name !== undefined) updateDoc.name = updates.name;
      if (updates.description !== undefined) updateDoc.description = updates.description;
      if (updates.icon !== undefined) updateDoc.icon = updates.icon;
      if (updates.color !== undefined) updateDoc.color = updates.color;

      if (updates.roomId !== undefined) {
        updateDoc.roomId = updates.roomId === null
          ? null
          : new ObjectId(updates.roomId);
      }

      if (updates.actions !== undefined) {
        // Validate device IDs
        const devices = await getDevicesCollection();
        const deviceIds = updates.actions.map((a) => new ObjectId(a.deviceId));
        const validDevices = await devices.countDocuments({
          _id: { $in: deviceIds },
          householdId: auth.householdId,
          isActive: true,
        });

        if (validDevices !== deviceIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more device IDs are invalid',
          });
        }

        updateDoc.actions = updates.actions.map((a) => ({
          deviceId: new ObjectId(a.deviceId),
          command: a.command,
          value: a.value,
        }));
      }

      await scenes.updateOne(
        { _id: new ObjectId(sceneId) },
        { $set: updateDoc }
      );

      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'scene',
        new ObjectId(sceneId),
        updates
      );

      return { msg: 'Scene updated successfully' };
    }),

  /**
   * Delete a scene (soft delete)
   */
  delete: withPermission('automation:delete')
    .input(z.object({ sceneId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { sceneId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const scenes = await getScenesCollection();

      const scene = await scenes.findOne({
        _id: new ObjectId(sceneId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!scene) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scene not found',
        });
      }

      await scenes.updateOne(
        { _id: new ObjectId(sceneId) },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'scene',
        new ObjectId(sceneId)
      );

      return { msg: 'Scene deleted successfully' };
    }),

  /**
   * Activate a scene - execute all actions
   */
  activate: withPermission('automation:execute')
    .input(z.object({ sceneId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { sceneId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const scenes = await getScenesCollection();
      const devices = await getDevicesCollection();

      const scene = await scenes.findOne({
        _id: new ObjectId(sceneId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!scene) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scene not found',
        });
      }

      // Execute each action
      const results: { deviceId: string; success: boolean; error?: string }[] = [];

      for (const action of scene.actions) {
        try {
          // Update device state
          await devices.updateOne(
            {
              _id: action.deviceId,
              householdId: auth.householdId,
              isActive: true,
            },
            {
              $set: {
                [`state.${action.command}`]: action.value,
                updatedAt: new Date(),
              },
            }
          );

          // TODO: Send MQTT command via WebSocket/BullMQ
          results.push({ deviceId: action.deviceId.toString(), success: true });
        } catch (error) {
          results.push({
            deviceId: action.deviceId.toString(),
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Update activation stats
      await scenes.updateOne(
        { _id: new ObjectId(sceneId) },
        {
          $set: { lastActivatedAt: new Date() },
          $inc: { activationCount: 1 },
        }
      );

      const successCount = results.filter((r) => r.success).length;

      return {
        msg: `Scene activated (${successCount}/${results.length} devices)`,
        results,
      };
    }),

  /**
   * Reorder scenes
   */
  reorder: withPermission('automation:write')
    .input(z.object({
      sceneIds: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const { sceneIds } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const scenes = await getScenesCollection();

      // Update order for each scene
      const bulkOps = sceneIds.map((id, index) => ({
        updateOne: {
          filter: {
            _id: new ObjectId(id),
            householdId: auth.householdId,
            isActive: true,
          },
          update: {
            $set: { order: index, updatedAt: new Date() },
          },
        },
      }));

      await scenes.bulkWrite(bulkOps);

      return { msg: 'Scenes reordered' };
    }),

  /**
   * Duplicate a scene
   */
  duplicate: withPermission('automation:write')
    .input(z.object({ sceneId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { sceneId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const scenes = await getScenesCollection();

      const scene = await scenes.findOne({
        _id: new ObjectId(sceneId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!scene) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scene not found',
        });
      }

      const now = new Date();
      const maxOrderScene = await scenes
        .find({ householdId: auth.householdId, isActive: true })
        .sort({ order: -1 })
        .limit(1)
        .toArray();

      const newScene = {
        householdId: auth.householdId,
        name: `${scene.name} (Copy)`,
        description: scene.description,
        icon: scene.icon,
        color: scene.color,
        roomId: scene.roomId,
        actions: scene.actions,
        order: (maxOrderScene[0]?.order || 0) + 1,
        activationCount: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await scenes.insertOne(newScene as never);

      return {
        _id: result.insertedId.toString(),
        msg: 'Scene duplicated',
      };
    }),

  /**
   * Create scene from current device states
   */
  createFromCurrent: withPermission('automation:write')
    .input(z.object({
      name: z.string().min(1).max(100),
      deviceIds: z.array(z.string()).min(1),
      properties: z.array(z.string()).default(['on', 'brightness', 'color', 'colorTemp']),
    }))
    .mutation(async ({ input, ctx }) => {
      const { name, deviceIds, properties } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const devices = await getDevicesCollection();
      const scenes = await getScenesCollection();
      const now = new Date();

      // Fetch current device states
      const deviceDocs = await devices
        .find({
          _id: { $in: deviceIds.map((id) => new ObjectId(id)) },
          householdId: auth.householdId,
          isActive: true,
        })
        .toArray();

      if (deviceDocs.length !== deviceIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more device IDs are invalid',
        });
      }

      // Build actions from current states
      const actions: { deviceId: ObjectId; command: string; value: unknown }[] = [];

      for (const device of deviceDocs) {
        for (const prop of properties) {
          if (device.state[prop] !== undefined) {
            actions.push({
              deviceId: device._id,
              command: prop,
              value: device.state[prop],
            });
          }
        }
      }

      if (actions.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No valid device states found for selected properties',
        });
      }

      const maxOrderScene = await scenes
        .find({ householdId: auth.householdId, isActive: true })
        .sort({ order: -1 })
        .limit(1)
        .toArray();

      const sceneDoc = {
        householdId: auth.householdId,
        name,
        actions,
        order: (maxOrderScene[0]?.order || 0) + 1,
        activationCount: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await scenes.insertOne(sceneDoc as never);

      return {
        _id: result.insertedId.toString(),
        msg: 'Scene created from current states',
        actionCount: actions.length,
      };
    }),
});
