import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import { getAutomationsCollection, getDevicesCollection } from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';
import { getAutomationQueue } from '@/server/jobs/queues';

// Trigger types
const triggerTypeEnum = z.enum([
  'device_state',    // When device state changes
  'time',            // At specific time
  'sun',             // Sunrise/sunset
  'webhook',         // External webhook
  'manual',          // Manual trigger only
]);

const triggerSchema = z.object({
  id: z.string(),
  type: triggerTypeEnum,
  // Device state trigger
  deviceId: z.string().optional(),
  property: z.string().optional(),
  operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'changed']).optional(),
  value: z.unknown().optional(),
  // Time trigger
  time: z.string().optional(),          // HH:mm format
  days: z.array(z.number().min(0).max(6)).optional(), // 0=Sun, 6=Sat
  cron: z.string().optional(),          // Cron expression
  // Sun trigger
  sunEvent: z.enum(['sunrise', 'sunset']).optional(),
  offset: z.number().optional(),        // Minutes offset from sun event
});

// Condition types
const conditionTypeEnum = z.enum([
  'device_state',    // Check device state
  'time_range',      // Within time range
  'day_of_week',     // Specific days
  'sun_position',    // Before/after sunrise/sunset
  'mode',            // Home mode (home, away, sleep, etc.)
]);

const conditionSchema = z.object({
  id: z.string(),
  type: conditionTypeEnum,
  // Device state condition
  deviceId: z.string().optional(),
  property: z.string().optional(),
  operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte']).optional(),
  value: z.unknown().optional(),
  // Time range condition
  startTime: z.string().optional(),     // HH:mm
  endTime: z.string().optional(),       // HH:mm
  // Day of week
  days: z.array(z.number().min(0).max(6)).optional(),
  // Sun position
  sunCondition: z.enum(['before_sunrise', 'after_sunrise', 'before_sunset', 'after_sunset']).optional(),
  // Mode condition
  mode: z.string().optional(),
  // Logic
  negate: z.boolean().default(false),
});

// Action types
const actionTypeEnum = z.enum([
  'device_control',  // Control a device
  'scene',           // Activate a scene
  'delay',           // Wait before next action
  'notification',    // Send notification
  'webhook',         // Call external webhook
]);

const actionSchema = z.object({
  id: z.string(),
  type: actionTypeEnum,
  // Device control
  deviceId: z.string().optional(),
  command: z.string().optional(),
  value: z.unknown().optional(),
  // Scene activation
  sceneId: z.string().optional(),
  // Delay
  delaySeconds: z.number().optional(),
  // Notification
  title: z.string().optional(),
  message: z.string().optional(),
  // Webhook
  webhookUrl: z.string().optional(),
  webhookMethod: z.enum(['GET', 'POST']).optional(),
  webhookBody: z.string().optional(),
});

// Automation schemas
const createAutomationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  triggers: z.array(triggerSchema).min(1),
  conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema).min(1),
  isEnabled: z.boolean().default(true),
});

const updateAutomationSchema = z.object({
  automationId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  triggers: z.array(triggerSchema).optional(),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).optional(),
  isEnabled: z.boolean().optional(),
});

export const automationRouter = router({
  /**
   * List all automations
   */
  list: withPermission('automation:read')
    .input(z.object({
      isEnabled: z.boolean().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const automations = await getAutomationsCollection();

      const query: Record<string, unknown> = {
        householdId: auth.householdId,
        isActive: true,
      };

      if (input?.isEnabled !== undefined) {
        query.isEnabled = input.isEnabled;
      }

      if (input?.search) {
        query.name = { $regex: input.search, $options: 'i' };
      }

      const results = await automations
        .find(query)
        .sort({ name: 1 })
        .toArray();

      return results.map((a) => ({
        _id: a._id.toString(),
        name: a.name,
        description: a.description,
        triggers: a.triggers,
        conditions: a.conditions,
        actions: a.actions,
        isEnabled: a.isEnabled,
        lastTriggeredAt: a.lastTriggeredAt?.toISOString(),
        executionCount: a.executionCount,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));
    }),

  /**
   * Get a single automation
   */
  get: withPermission('automation:read')
    .input(z.object({ automationId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { automationId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const automations = await getAutomationsCollection();

      const automation = await automations.findOne({
        _id: new ObjectId(automationId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!automation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation not found',
        });
      }

      return {
        _id: automation._id.toString(),
        name: automation.name,
        description: automation.description,
        triggers: automation.triggers,
        conditions: automation.conditions,
        actions: automation.actions,
        isEnabled: automation.isEnabled,
        lastTriggeredAt: automation.lastTriggeredAt?.toISOString(),
        executionCount: automation.executionCount,
        createdAt: automation.createdAt.toISOString(),
        updatedAt: automation.updatedAt.toISOString(),
      };
    }),

  /**
   * Create a new automation
   */
  create: withPermission('automation:write')
    .input(createAutomationSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const automations = await getAutomationsCollection();
      const now = new Date();

      // Validate device IDs in triggers and actions
      const deviceIds = new Set<string>();
      input.triggers.forEach((t) => {
        if (t.deviceId) deviceIds.add(t.deviceId);
      });
      input.conditions.forEach((c) => {
        if (c.deviceId) deviceIds.add(c.deviceId);
      });
      input.actions.forEach((a) => {
        if (a.deviceId) deviceIds.add(a.deviceId);
      });

      if (deviceIds.size > 0) {
        const devices = await getDevicesCollection();
        const validDevices = await devices.countDocuments({
          _id: { $in: Array.from(deviceIds).map((id) => new ObjectId(id)) },
          householdId: auth.householdId,
          isActive: true,
        });

        if (validDevices !== deviceIds.size) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more device IDs are invalid',
          });
        }
      }

      const automationDoc = {
        householdId: auth.householdId,
        name: input.name,
        description: input.description,
        triggers: input.triggers,
        conditions: input.conditions,
        actions: input.actions,
        isEnabled: input.isEnabled,
        isActive: true,
        executionCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      const result = await automations.insertOne(automationDoc as never);

      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'automation',
        result.insertedId,
        { name: input.name }
      );

      return {
        _id: result.insertedId.toString(),
        msg: 'Automation created successfully',
      };
    }),

  /**
   * Update an automation
   */
  update: withPermission('automation:write')
    .input(updateAutomationSchema)
    .mutation(async ({ input, ctx }) => {
      const { automationId, ...updates } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const automations = await getAutomationsCollection();

      const automation = await automations.findOne({
        _id: new ObjectId(automationId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!automation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation not found',
        });
      }

      const updateDoc: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (updates.name !== undefined) updateDoc.name = updates.name;
      if (updates.description !== undefined) updateDoc.description = updates.description;
      if (updates.triggers !== undefined) updateDoc.triggers = updates.triggers;
      if (updates.conditions !== undefined) updateDoc.conditions = updates.conditions;
      if (updates.actions !== undefined) updateDoc.actions = updates.actions;
      if (updates.isEnabled !== undefined) updateDoc.isEnabled = updates.isEnabled;

      await automations.updateOne(
        { _id: new ObjectId(automationId) },
        { $set: updateDoc }
      );

      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'automation',
        new ObjectId(automationId),
        updates
      );

      return { msg: 'Automation updated successfully' };
    }),

  /**
   * Delete an automation (soft delete)
   */
  delete: withPermission('automation:delete')
    .input(z.object({ automationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { automationId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const automations = await getAutomationsCollection();

      const automation = await automations.findOne({
        _id: new ObjectId(automationId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!automation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation not found',
        });
      }

      await automations.updateOne(
        { _id: new ObjectId(automationId) },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'automation',
        new ObjectId(automationId)
      );

      return { msg: 'Automation deleted successfully' };
    }),

  /**
   * Toggle automation enabled/disabled
   */
  toggle: withPermission('automation:write')
    .input(z.object({ automationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { automationId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const automations = await getAutomationsCollection();

      const automation = await automations.findOne({
        _id: new ObjectId(automationId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!automation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation not found',
        });
      }

      const newEnabled = !automation.isEnabled;

      await automations.updateOne(
        { _id: new ObjectId(automationId) },
        { $set: { isEnabled: newEnabled, updatedAt: new Date() } }
      );

      return {
        msg: `Automation ${newEnabled ? 'enabled' : 'disabled'}`,
        isEnabled: newEnabled,
      };
    }),

  /**
   * Manually trigger an automation
   */
  trigger: withPermission('automation:execute')
    .input(z.object({ automationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { automationId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const automations = await getAutomationsCollection();

      const automation = await automations.findOne({
        _id: new ObjectId(automationId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!automation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation not found',
        });
      }

      try {
        await getAutomationQueue().add(
          'run',
          { automationId, reason: 'manual', triggeredBy: auth.userId.toString() },
          { removeOnComplete: 1000, removeOnFail: 1000 }
        );
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to enqueue automation: ${err instanceof Error ? err.message : 'unknown'}`,
        });
      }

      return { msg: 'Automation queued for execution' };
    }),

  /**
   * Get automation execution history
   */
  history: withPermission('automation:read')
    .input(z.object({
      automationId: z.string(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const { automationId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const automations = await getAutomationsCollection();

      const automation = await automations.findOne({
        _id: new ObjectId(automationId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!automation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation not found',
        });
      }

      // TODO: Fetch from execution history collection
      // For now, return mock data
      return {
        items: [],
        total: 0,
      };
    }),

  /**
   * Duplicate an automation
   */
  duplicate: withPermission('automation:write')
    .input(z.object({ automationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { automationId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const automations = await getAutomationsCollection();

      const automation = await automations.findOne({
        _id: new ObjectId(automationId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!automation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation not found',
        });
      }

      const now = new Date();
      const newAutomation = {
        householdId: auth.householdId,
        name: `${automation.name} (Copy)`,
        description: automation.description,
        triggers: automation.triggers,
        conditions: automation.conditions,
        actions: automation.actions,
        isEnabled: false, // Start disabled
        isActive: true,
        executionCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      const result = await automations.insertOne(newAutomation as never);

      return {
        _id: result.insertedId.toString(),
        msg: 'Automation duplicated',
      };
    }),
});
