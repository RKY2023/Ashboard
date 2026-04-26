import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getClimateZonesCollection,
  getClimateSchedulesCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';

const modeEnum = z.enum(['off', 'heat', 'cool', 'auto', 'fan']);
const unitEnum = z.enum(['celsius', 'fahrenheit']);

const createZoneSchema = z.object({
  name: z.string().min(1).max(60),
  thermostatDeviceIds: z.array(z.string()).default([]),
  targetTemperature: z.number(),
  unit: unitEnum.default('fahrenheit'),
  mode: modeEnum.default('off'),
});

const updateZoneSchema = z.object({
  zoneId: z.string(),
  name: z.string().min(1).max(60).optional(),
  thermostatDeviceIds: z.array(z.string()).optional(),
  targetTemperature: z.number().optional(),
  unit: unitEnum.optional(),
  mode: modeEnum.optional(),
});

const scheduleEntrySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  targetTemperature: z.number(),
  mode: modeEnum,
});

const upsertScheduleSchema = z.object({
  scheduleId: z.string().optional(),
  zoneId: z.string(),
  name: z.string().min(1).max(60),
  entries: z.array(scheduleEntrySchema),
  isEnabled: z.boolean().default(true),
});

export const climateRouter = router({
  /**
   * List climate zones
   */
  listZones: withPermission('climate:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const zones = await getClimateZonesCollection();
    const items = await zones
      .find({ householdId: auth.householdId, isActive: true })
      .sort({ name: 1 })
      .toArray();
    return items.map((z) => ({
      _id: z._id.toString(),
      name: z.name,
      thermostatDeviceIds: z.thermostatDeviceIds.map((id) => id.toString()),
      targetTemperature: z.targetTemperature,
      unit: z.unit,
      mode: z.mode,
      humidity: z.humidity,
    }));
  }),

  createZone: withPermission('climate:write')
    .input(createZoneSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const zones = await getClimateZonesCollection();
      const now = new Date();
      const doc = {
        householdId: auth.householdId!,
        name: input.name,
        thermostatDeviceIds: input.thermostatDeviceIds.map(
          (id) => new ObjectId(id)
        ),
        targetTemperature: input.targetTemperature,
        unit: input.unit,
        mode: input.mode,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      const result = await zones.insertOne(doc as never);
      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'device',
        result.insertedId,
        { name: input.name, type: 'climate_zone' }
      );
      return { _id: result.insertedId.toString() };
    }),

  updateZone: withPermission('climate:write')
    .input(updateZoneSchema)
    .mutation(async ({ input, ctx }) => {
      const { zoneId, ...updates } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const zones = await getClimateZonesCollection();

      const updateDoc: Record<string, unknown> = { updatedAt: new Date() };
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) continue;
        if (key === 'thermostatDeviceIds' && Array.isArray(value)) {
          updateDoc.thermostatDeviceIds = (value as string[]).map(
            (id) => new ObjectId(id)
          );
        } else {
          updateDoc[key] = value;
        }
      }

      const result = await zones.updateOne(
        {
          _id: new ObjectId(zoneId),
          householdId: auth.householdId,
        },
        { $set: updateDoc }
      );
      if (result.matchedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Zone not found' });
      }
      return { msg: 'Zone updated' };
    }),

  deleteZone: withPermission('climate:write')
    .input(z.object({ zoneId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const zones = await getClimateZonesCollection();
      const result = await zones.updateOne(
        {
          _id: new ObjectId(input.zoneId),
          householdId: auth.householdId,
        },
        { $set: { isActive: false, updatedAt: new Date() } }
      );
      if (result.matchedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Zone not found' });
      }
      return { msg: 'Zone removed' };
    }),

  /**
   * Quickly adjust the target temperature for a zone
   */
  setTemperature: withPermission('climate:write')
    .input(
      z.object({
        zoneId: z.string(),
        targetTemperature: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const zones = await getClimateZonesCollection();
      const result = await zones.updateOne(
        {
          _id: new ObjectId(input.zoneId),
          householdId: auth.householdId,
        },
        {
          $set: {
            targetTemperature: input.targetTemperature,
            updatedAt: new Date(),
          },
        }
      );
      if (result.matchedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Zone not found' });
      }
      return { msg: 'Temperature updated' };
    }),

  /**
   * Schedule endpoints
   */
  schedules: router({
    listForZone: withPermission('climate:read')
      .input(z.object({ zoneId: z.string() }))
      .query(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const schedules = await getClimateSchedulesCollection();
        const items = await schedules
          .find({
            householdId: auth.householdId,
            zoneId: new ObjectId(input.zoneId),
          })
          .toArray();
        return items.map((s) => ({
          _id: s._id.toString(),
          zoneId: s.zoneId.toString(),
          name: s.name,
          entries: s.entries,
          isEnabled: s.isEnabled,
        }));
      }),

    upsert: withPermission('climate:write')
      .input(upsertScheduleSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const schedules = await getClimateSchedulesCollection();
        const now = new Date();

        if (input.scheduleId) {
          await schedules.updateOne(
            {
              _id: new ObjectId(input.scheduleId),
              householdId: auth.householdId,
            },
            {
              $set: {
                name: input.name,
                entries: input.entries,
                isEnabled: input.isEnabled,
                updatedAt: now,
              },
            }
          );
          return { _id: input.scheduleId };
        }

        const result = await schedules.insertOne({
          householdId: auth.householdId!,
          zoneId: new ObjectId(input.zoneId),
          name: input.name,
          entries: input.entries,
          isEnabled: input.isEnabled,
          createdAt: now,
          updatedAt: now,
        } as never);
        return { _id: result.insertedId.toString() };
      }),

    delete: withPermission('climate:write')
      .input(z.object({ scheduleId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const schedules = await getClimateSchedulesCollection();
        const result = await schedules.deleteOne({
          _id: new ObjectId(input.scheduleId),
          householdId: auth.householdId,
        });
        if (result.deletedCount === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Schedule not found',
          });
        }
        return { msg: 'Schedule removed' };
      }),
  }),
});
