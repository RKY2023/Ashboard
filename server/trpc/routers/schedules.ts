import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import { getSchedulesCollection, getScenesCollection, getDevicesCollection } from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';
import { nextRunAt } from '@/server/jobs/lib/nextRunAt';
import { getScheduleQueue } from '@/server/jobs/queues';

// Schedule action types
const scheduleActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('device_control'),
    deviceId: z.string(),
    command: z.string(),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('scene'),
    sceneId: z.string(),
  }),
  z.object({
    type: z.literal('automation'),
    automationId: z.string(),
  }),
]);

// Schedule timing
const scheduleTimingSchema = z.object({
  type: z.enum(['daily', 'weekly', 'once', 'cron']),
  time: z.string().optional(),         // HH:mm format
  days: z.array(z.number().min(0).max(6)).optional(), // For weekly: 0=Sun, 6=Sat
  date: z.string().optional(),          // For once: ISO date
  cron: z.string().optional(),          // For cron
  timezone: z.string().default('America/New_York'),
});

// Create schedule schema
const createScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  timing: scheduleTimingSchema,
  action: scheduleActionSchema,
  isEnabled: z.boolean().default(true),
});

// Update schedule schema
const updateScheduleSchema = z.object({
  scheduleId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  timing: scheduleTimingSchema.optional(),
  action: scheduleActionSchema.optional(),
  isEnabled: z.boolean().optional(),
});

function calculateNextRun(timing: z.infer<typeof scheduleTimingSchema>): Date | null {
  return nextRunAt(timing);
}

export const schedulesRouter = router({
  /**
   * List all schedules
   */
  list: withPermission('automation:read')
    .input(z.object({
      isEnabled: z.boolean().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const schedules = await getSchedulesCollection();

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

      const results = await schedules
        .find(query)
        .sort({ 'timing.time': 1, name: 1 })
        .toArray();

      return results.map((s) => ({
        _id: s._id.toString(),
        name: s.name,
        description: s.description,
        timing: s.timing,
        action: s.action,
        isEnabled: s.isEnabled,
        nextRunAt: s.nextRunAt?.toISOString(),
        lastRunAt: s.lastRunAt?.toISOString(),
        runCount: s.runCount || 0,
        createdAt: s.createdAt.toISOString(),
      }));
    }),

  /**
   * Get a single schedule
   */
  get: withPermission('automation:read')
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { scheduleId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const schedules = await getSchedulesCollection();

      const schedule = await schedules.findOne({
        _id: new ObjectId(scheduleId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!schedule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      return {
        _id: schedule._id.toString(),
        name: schedule.name,
        description: schedule.description,
        timing: schedule.timing,
        action: schedule.action,
        isEnabled: schedule.isEnabled,
        nextRunAt: schedule.nextRunAt?.toISOString(),
        lastRunAt: schedule.lastRunAt?.toISOString(),
        runCount: schedule.runCount || 0,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString(),
      };
    }),

  /**
   * Create a new schedule
   */
  create: withPermission('automation:write')
    .input(createScheduleSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const schedules = await getSchedulesCollection();
      const now = new Date();

      // Validate cron if provided
      if (input.timing.type === 'cron' && input.timing.cron) {
        if (nextRunAt(input.timing) === null) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid cron expression',
          });
        }
      }

      // Validate action target exists
      if (input.action.type === 'device_control') {
        const devices = await getDevicesCollection();
        const device = await devices.findOne({
          _id: new ObjectId(input.action.deviceId),
          householdId: auth.householdId,
          isActive: true,
        });
        if (!device) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Device not found',
          });
        }
      } else if (input.action.type === 'scene') {
        const scenes = await getScenesCollection();
        const scene = await scenes.findOne({
          _id: new ObjectId(input.action.sceneId),
          householdId: auth.householdId,
          isActive: true,
        });
        if (!scene) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Scene not found',
          });
        }
      }

      const computedNextRun = calculateNextRun(input.timing);

      const scheduleDoc = {
        householdId: auth.householdId,
        name: input.name,
        description: input.description,
        timing: input.timing,
        action: input.action,
        isEnabled: input.isEnabled,
        nextRunAt: computedNextRun,
        runCount: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await schedules.insertOne(scheduleDoc as never);

      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'schedule',
        result.insertedId,
        { name: input.name }
      );

      return {
        _id: result.insertedId.toString(),
        msg: 'Schedule created successfully',
        nextRunAt: computedNextRun?.toISOString(),
      };
    }),

  /**
   * Update a schedule
   */
  update: withPermission('automation:write')
    .input(updateScheduleSchema)
    .mutation(async ({ input, ctx }) => {
      const { scheduleId, ...updates } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const schedules = await getSchedulesCollection();

      const schedule = await schedules.findOne({
        _id: new ObjectId(scheduleId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!schedule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      const updateDoc: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (updates.name !== undefined) updateDoc.name = updates.name;
      if (updates.description !== undefined) updateDoc.description = updates.description;
      if (updates.isEnabled !== undefined) updateDoc.isEnabled = updates.isEnabled;
      if (updates.timing !== undefined) {
        updateDoc.timing = updates.timing;
        updateDoc.nextRunAt = calculateNextRun(updates.timing);
      }
      if (updates.action !== undefined) updateDoc.action = updates.action;

      await schedules.updateOne(
        { _id: new ObjectId(scheduleId) },
        { $set: updateDoc }
      );

      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'schedule',
        new ObjectId(scheduleId),
        updates
      );

      return { msg: 'Schedule updated successfully' };
    }),

  /**
   * Delete a schedule (soft delete)
   */
  delete: withPermission('automation:delete')
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { scheduleId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const schedules = await getSchedulesCollection();

      const schedule = await schedules.findOne({
        _id: new ObjectId(scheduleId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!schedule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      await schedules.updateOne(
        { _id: new ObjectId(scheduleId) },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'schedule',
        new ObjectId(scheduleId)
      );

      return { msg: 'Schedule deleted successfully' };
    }),

  /**
   * Toggle schedule enabled/disabled
   */
  toggle: withPermission('automation:write')
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { scheduleId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const schedules = await getSchedulesCollection();

      const schedule = await schedules.findOne({
        _id: new ObjectId(scheduleId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!schedule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      const newEnabled = !schedule.isEnabled;
      const computedNextRun = newEnabled ? (calculateNextRun(schedule.timing) ?? undefined) : undefined;

      await schedules.updateOne(
        { _id: new ObjectId(scheduleId) },
        { $set: { isEnabled: newEnabled, nextRunAt: computedNextRun, updatedAt: new Date() } }
      );

      return {
        msg: `Schedule ${newEnabled ? 'enabled' : 'disabled'}`,
        isEnabled: newEnabled,
      };
    }),

  /**
   * Run a schedule immediately
   */
  runNow: withPermission('automation:execute')
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { scheduleId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const schedules = await getSchedulesCollection();

      const schedule = await schedules.findOne({
        _id: new ObjectId(scheduleId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!schedule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      try {
        await getScheduleQueue().add(
          'run',
          { scheduleId, reason: 'manual', triggeredBy: auth.userId.toString() },
          { removeOnComplete: 1000, removeOnFail: 1000 }
        );
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to enqueue schedule: ${err instanceof Error ? err.message : 'unknown'}`,
        });
      }

      return { msg: 'Schedule queued for execution' };
    }),

  /**
   * Get upcoming schedules
   */
  upcoming: withPermission('automation:read')
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
    }).optional())
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const schedules = await getSchedulesCollection();

      const results = await schedules
        .find({
          householdId: auth.householdId,
          isActive: true,
          isEnabled: true,
          nextRunAt: { $gte: new Date() },
        })
        .sort({ nextRunAt: 1 })
        .limit(input?.limit || 10)
        .toArray();

      return results.map((s) => ({
        _id: s._id.toString(),
        name: s.name,
        timing: s.timing,
        action: s.action,
        nextRunAt: s.nextRunAt?.toISOString(),
      }));
    }),
});
