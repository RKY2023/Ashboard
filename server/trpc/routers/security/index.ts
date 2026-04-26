import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getSecurityEventsCollection,
  getSecurityModesCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';

const eventTypeEnum = z.enum([
  'motion',
  'door',
  'window',
  'alarm',
  'tamper',
  'smoke',
  'co',
  'water',
]);

const severityEnum = z.enum(['info', 'warning', 'alert', 'critical']);

const modeEnum = z.enum(['disarmed', 'home', 'away', 'night', 'vacation']);

const listEventsSchema = z.object({
  type: eventTypeEnum.optional(),
  severity: severityEnum.optional(),
  isAcknowledged: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(200).default(50),
});

const recordEventSchema = z.object({
  deviceId: z.string().optional(),
  type: eventTypeEnum,
  severity: severityEnum.default('info'),
  message: z.string().min(1).max(500),
});

const upsertModeSchema = z.object({
  modeId: z.string().optional(),
  name: z.string().min(1).max(60),
  mode: modeEnum,
  deviceSettings: z.record(z.string(), z.unknown()).default({}),
});

export const securityRouter = router({
  /**
   * Active security mode for the household (most recent isActive)
   */
  currentMode: withPermission('security:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const modes = await getSecurityModesCollection();
    const active = await modes
      .find({ householdId: auth.householdId, isActive: true })
      .sort({ updatedAt: -1 })
      .limit(1)
      .next();

    if (!active) {
      return { mode: 'disarmed' as const, name: 'Disarmed', _id: null };
    }
    return {
      _id: active._id.toString(),
      name: active.name,
      mode: active.mode,
      deviceSettings: active.deviceSettings,
    };
  }),

  /**
   * List configured security modes (presets)
   */
  listModes: withPermission('security:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const modes = await getSecurityModesCollection();
    const items = await modes
      .find({ householdId: auth.householdId })
      .sort({ updatedAt: -1 })
      .toArray();
    return items.map((m) => ({
      _id: m._id.toString(),
      name: m.name,
      mode: m.mode,
      isActive: m.isActive,
      deviceSettings: m.deviceSettings,
    }));
  }),

  /**
   * Create or update a security mode preset
   */
  upsertMode: withPermission('security:manage')
    .input(upsertModeSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const modes = await getSecurityModesCollection();
      const now = new Date();

      if (input.modeId) {
        const existing = await modes.findOne({
          _id: new ObjectId(input.modeId),
          householdId: auth.householdId,
        });
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Mode not found' });
        }
        await modes.updateOne(
          { _id: existing._id },
          {
            $set: {
              name: input.name,
              mode: input.mode,
              deviceSettings: input.deviceSettings,
              updatedAt: now,
            },
          }
        );
        await auditHelpers.logUpdate(
          auth.userId,
          auth.householdId!,
          'security',
          existing._id,
          input
        );
        return { _id: existing._id.toString(), msg: 'Mode updated' };
      }

      const doc = {
        householdId: auth.householdId!,
        name: input.name,
        mode: input.mode,
        deviceSettings: input.deviceSettings,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      };
      const result = await modes.insertOne(doc as never);
      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'security',
        result.insertedId,
        { name: input.name, mode: input.mode }
      );
      return { _id: result.insertedId.toString(), msg: 'Mode created' };
    }),

  /**
   * Activate a security mode (arm/disarm)
   */
  activateMode: withPermission('security:arm')
    .input(z.object({ modeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const modes = await getSecurityModesCollection();

      const target = await modes.findOne({
        _id: new ObjectId(input.modeId),
        householdId: auth.householdId,
      });
      if (!target) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Mode not found' });
      }

      const now = new Date();
      // Deactivate all others, activate this one
      await modes.updateMany(
        { householdId: auth.householdId, _id: { $ne: target._id } },
        { $set: { isActive: false, updatedAt: now } }
      );
      await modes.updateOne(
        { _id: target._id },
        { $set: { isActive: true, updatedAt: now } }
      );

      const action = target.mode === 'disarmed' ? 'disarm' : 'arm';
      await auditHelpers.logSecurityAction(
        auth.userId,
        auth.householdId!,
        action,
        target.mode
      );

      return { msg: `Activated ${target.name}`, mode: target.mode };
    }),

  /**
   * Disarm — convenience action that activates any disarmed-type mode or
   * deactivates the current armed one.
   */
  disarm: withPermission('security:disarm').mutation(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const modes = await getSecurityModesCollection();
    const now = new Date();

    await modes.updateMany(
      { householdId: auth.householdId, isActive: true },
      { $set: { isActive: false, updatedAt: now } }
    );

    await auditHelpers.logSecurityAction(
      auth.userId,
      auth.householdId!,
      'disarm',
      'disarmed'
    );

    return { msg: 'System disarmed' };
  }),

  /**
   * List security events with filters
   */
  listEvents: withPermission('security:read')
    .input(listEventsSchema)
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const events = await getSecurityEventsCollection();

      const query: Record<string, unknown> = { householdId: auth.householdId };
      if (input.type) query.type = input.type;
      if (input.severity) query.severity = input.severity;
      if (input.isAcknowledged !== undefined) {
        query.isAcknowledged = input.isAcknowledged;
      }
      if (input.startDate || input.endDate) {
        const range: Record<string, Date> = {};
        if (input.startDate) range.$gte = new Date(input.startDate);
        if (input.endDate) range.$lte = new Date(input.endDate);
        query.createdAt = range;
      }

      const skip = (input.page - 1) * input.pageSize;
      const [total, items] = await Promise.all([
        events.countDocuments(query),
        events
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(input.pageSize)
          .toArray(),
      ]);

      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
        items: items.map((e) => ({
          _id: e._id.toString(),
          deviceId: e.deviceId?.toString(),
          type: e.type,
          severity: e.severity,
          message: e.message,
          isAcknowledged: e.isAcknowledged,
          acknowledgedBy: e.acknowledgedBy?.toString(),
          acknowledgedAt: e.acknowledgedAt?.toISOString(),
          createdAt: e.createdAt.toISOString(),
        })),
      };
    }),

  /**
   * Record a new security event (called by automation/devices)
   */
  recordEvent: withPermission('security:manage')
    .input(recordEventSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const events = await getSecurityEventsCollection();
      const now = new Date();

      const doc = {
        householdId: auth.householdId!,
        deviceId: input.deviceId ? new ObjectId(input.deviceId) : undefined,
        type: input.type,
        severity: input.severity,
        message: input.message,
        isAcknowledged: false,
        createdAt: now,
        updatedAt: now,
      };
      const result = await events.insertOne(doc as never);
      return { _id: result.insertedId.toString() };
    }),

  /**
   * Acknowledge a security event
   */
  acknowledge: withPermission('security:manage')
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const events = await getSecurityEventsCollection();
      const now = new Date();

      const result = await events.updateOne(
        {
          _id: new ObjectId(input.eventId),
          householdId: auth.householdId,
        },
        {
          $set: {
            isAcknowledged: true,
            acknowledgedBy: auth.userId,
            acknowledgedAt: now,
            updatedAt: now,
          },
        }
      );

      if (result.matchedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
      }
      return { msg: 'Event acknowledged' };
    }),

  /**
   * Quick stats for the security dashboard
   */
  stats: withPermission('security:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const events = await getSecurityEventsCollection();
    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const [todayCount, unack, criticalUnack] = await Promise.all([
      events.countDocuments({
        householdId: auth.householdId,
        createdAt: { $gte: since },
      }),
      events.countDocuments({
        householdId: auth.householdId,
        isAcknowledged: false,
      }),
      events.countDocuments({
        householdId: auth.householdId,
        isAcknowledged: false,
        severity: { $in: ['alert', 'critical'] },
      }),
    ]);

    return { todayCount, unacknowledged: unack, criticalUnacknowledged: criticalUnack };
  }),
});
