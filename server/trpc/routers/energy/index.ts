import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getEnergyReadingsCollection,
  getEnergyBudgetsCollection,
  getDevicesCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';

const ingestReadingSchema = z.object({
  deviceId: z.string().optional(),
  power: z.number().min(0),
  energy: z.number().min(0),
  cost: z.number().min(0).optional(),
  timestamp: z.string().datetime().optional(),
});

const listReadingsSchema = z.object({
  deviceId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(500).default(100),
});

const summarySchema = z.object({
  range: z.enum(['day', 'week', 'month', 'year']).default('day'),
  deviceId: z.string().optional(),
});

const upsertBudgetSchema = z.object({
  name: z.string().min(1).max(80),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  limitKwh: z.number().min(0),
  limitCost: z.number().min(0),
  alertThreshold: z.number().min(0).max(100).default(80),
});

function rangeStart(range: 'day' | 'week' | 'month' | 'year'): Date {
  const now = new Date();
  const start = new Date(now);
  switch (range) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
  }
  return start;
}

function bucketFor(range: 'day' | 'week' | 'month' | 'year'): string {
  return range === 'day' ? '%Y-%m-%dT%H:00' : '%Y-%m-%d';
}

export const energyRouter = router({
  /**
   * Ingest a new energy reading (called by MQTT bridge or device)
   */
  ingest: withPermission('energy:manage')
    .input(ingestReadingSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const readings = await getEnergyReadingsCollection();
      const now = new Date();
      const timestamp = input.timestamp ? new Date(input.timestamp) : now;

      const doc = {
        householdId: auth.householdId!,
        deviceId: input.deviceId ? new ObjectId(input.deviceId) : undefined,
        timestamp,
        power: input.power,
        energy: input.energy,
        cost: input.cost,
        createdAt: now,
        updatedAt: now,
      };

      const result = await readings.insertOne(doc as never);
      return { _id: result.insertedId.toString() };
    }),

  /**
   * List recent energy readings with optional device + time filters
   */
  list: withPermission('energy:read')
    .input(listReadingsSchema)
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const readings = await getEnergyReadingsCollection();

      const query: Record<string, unknown> = { householdId: auth.householdId };
      if (input.deviceId) query.deviceId = new ObjectId(input.deviceId);
      if (input.startDate || input.endDate) {
        const range: Record<string, Date> = {};
        if (input.startDate) range.$gte = new Date(input.startDate);
        if (input.endDate) range.$lte = new Date(input.endDate);
        query.timestamp = range;
      }

      const skip = (input.page - 1) * input.pageSize;
      const [total, items] = await Promise.all([
        readings.countDocuments(query),
        readings
          .find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(input.pageSize)
          .toArray(),
      ]);

      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
        items: items.map((r) => ({
          _id: r._id.toString(),
          deviceId: r.deviceId?.toString(),
          timestamp: r.timestamp.toISOString(),
          power: r.power,
          energy: r.energy,
          cost: r.cost,
        })),
      };
    }),

  /**
   * Aggregate consumption summary bucketed by hour or day
   */
  summary: withPermission('energy:read')
    .input(summarySchema)
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const readings = await getEnergyReadingsCollection();

      const startDate = rangeStart(input.range);
      const match: Record<string, unknown> = {
        householdId: auth.householdId,
        timestamp: { $gte: startDate },
      };
      if (input.deviceId) match.deviceId = new ObjectId(input.deviceId);

      const buckets = await readings
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: bucketFor(input.range),
                  date: '$timestamp',
                },
              },
              energy: { $sum: '$energy' },
              cost: { $sum: '$cost' },
              avgPower: { $avg: '$power' },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      const totals = buckets.reduce(
        (acc, b) => {
          acc.energy += b.energy ?? 0;
          acc.cost += b.cost ?? 0;
          return acc;
        },
        { energy: 0, cost: 0 }
      );

      return {
        range: input.range,
        startDate: startDate.toISOString(),
        totals,
        points: buckets.map((b) => ({
          bucket: b._id as string,
          energy: b.energy ?? 0,
          cost: b.cost ?? 0,
          avgPower: b.avgPower ?? 0,
        })),
      };
    }),

  /**
   * Current realtime power across all devices (latest reading per device)
   */
  current: withPermission('energy:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const readings = await getEnergyReadingsCollection();
    const devices = await getDevicesCollection();

    const latestByDevice = await readings
      .aggregate([
        { $match: { householdId: auth.householdId } },
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: '$deviceId',
            power: { $first: '$power' },
            timestamp: { $first: '$timestamp' },
          },
        },
      ])
      .toArray();

      const deviceIds = latestByDevice
        .map((d) => d._id)
        .filter((id): id is ObjectId => id instanceof ObjectId);

    const deviceDocs = deviceIds.length
      ? await devices
          .find({ _id: { $in: deviceIds }, householdId: auth.householdId })
          .toArray()
      : [];
    const nameMap = new Map(deviceDocs.map((d) => [d._id.toString(), d.name]));

    const totalPower = latestByDevice.reduce((sum, r) => sum + (r.power ?? 0), 0);

    return {
      totalPower,
      perDevice: latestByDevice.map((r) => ({
        deviceId: r._id?.toString() ?? null,
        deviceName: r._id ? nameMap.get(r._id.toString()) ?? 'Unknown' : 'Whole home',
        power: r.power ?? 0,
        timestamp: r.timestamp?.toISOString?.() ?? null,
      })),
    };
  }),

  /**
   * List energy budgets
   */
  listBudgets: withPermission('energy:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const budgets = await getEnergyBudgetsCollection();
    const items = await budgets
      .find({ householdId: auth.householdId })
      .sort({ year: -1, month: -1 })
      .toArray();
    return items.map((b) => ({
      _id: b._id.toString(),
      name: b.name,
      month: b.month,
      year: b.year,
      limitKwh: b.limitKwh,
      limitCost: b.limitCost,
      alertThreshold: b.alertThreshold,
    }));
  }),

  /**
   * Create or update an energy budget for a given month/year
   */
  upsertBudget: withPermission('energy:manage')
    .input(upsertBudgetSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const budgets = await getEnergyBudgetsCollection();
      const now = new Date();

      const existing = await budgets.findOne({
        householdId: auth.householdId,
        month: input.month,
        year: input.year,
      });

      if (existing) {
        await budgets.updateOne(
          { _id: existing._id },
          {
            $set: {
              name: input.name,
              limitKwh: input.limitKwh,
              limitCost: input.limitCost,
              alertThreshold: input.alertThreshold,
              updatedAt: now,
            },
          }
        );
        await auditHelpers.logUpdate(
          auth.userId,
          auth.householdId!,
          'energy',
          existing._id,
          input
        );
        return { _id: existing._id.toString(), msg: 'Budget updated' };
      }

      const doc = {
        householdId: auth.householdId!,
        name: input.name,
        month: input.month,
        year: input.year,
        limitKwh: input.limitKwh,
        limitCost: input.limitCost,
        alertThreshold: input.alertThreshold,
        createdAt: now,
        updatedAt: now,
      };
      const result = await budgets.insertOne(doc as never);
      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'energy',
        result.insertedId,
        { name: input.name }
      );
      return { _id: result.insertedId.toString(), msg: 'Budget created' };
    }),

  /**
   * Delete an energy budget
   */
  deleteBudget: withPermission('energy:manage')
    .input(z.object({ budgetId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const budgets = await getEnergyBudgetsCollection();
      const result = await budgets.deleteOne({
        _id: new ObjectId(input.budgetId),
        householdId: auth.householdId,
      });
      if (result.deletedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget not found' });
      }
      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'energy',
        new ObjectId(input.budgetId)
      );
      return { msg: 'Budget deleted' };
    }),
});
