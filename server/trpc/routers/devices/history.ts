import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import { getDeviceHistoryCollection, getDevicesCollection } from '@/src/lib/db';
import { AuthContext } from '@/src/types';
import { TRPCError } from '@trpc/server';

const listHistorySchema = z.object({
  deviceId: z.string(),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(),
  property: z.string().optional(), // Filter by specific property (e.g., 'temperature')
  limit: z.number().min(1).max(1000).default(100),
  aggregation: z.enum(['none', 'hourly', 'daily']).default('none'),
});

export const deviceHistoryRouter = router({
  /**
   * Get device history/state changes
   */
  list: withPermission('devices:read')
    .input(listHistorySchema)
    .query(async ({ input, ctx }) => {
      const { deviceId, startDate, endDate, property, limit, aggregation } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      // Verify device exists and belongs to household
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

      const history = await getDeviceHistoryCollection();

      // Build query
      const query: Record<string, unknown> = {
        deviceId: new ObjectId(deviceId),
      };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) (query.timestamp as Record<string, Date>).$gte = new Date(startDate);
        if (endDate) (query.timestamp as Record<string, Date>).$lte = new Date(endDate);
      }

      if (property) {
        query.property = property;
      }

      if (aggregation === 'none') {
        // Raw data
        const results = await history
          .find(query)
          .sort({ timestamp: -1 })
          .limit(limit)
          .toArray();

        return {
          items: results.map((r) => ({
            _id: r._id.toString(),
            timestamp: r.timestamp.toISOString(),
            property: r.property,
            value: r.value,
            previousValue: r.previousValue,
            source: r.source,
          })),
          aggregation: 'none',
        };
      }

      // Aggregated data
      const groupByFormat = aggregation === 'hourly'
        ? { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' }, hour: { $hour: '$timestamp' } }
        : { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' } };

      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: {
              property: '$property',
              ...groupByFormat,
            },
            avgValue: { $avg: { $toDouble: '$value' } },
            minValue: { $min: { $toDouble: '$value' } },
            maxValue: { $max: { $toDouble: '$value' } },
            count: { $sum: 1 },
            firstTimestamp: { $first: '$timestamp' },
          },
        },
        { $sort: { firstTimestamp: -1 as const } },
        { $limit: limit },
      ];

      const results = await history.aggregate(pipeline).toArray();

      return {
        items: results.map((r) => ({
          timestamp: r.firstTimestamp.toISOString(),
          property: r._id.property,
          avgValue: r.avgValue,
          minValue: r.minValue,
          maxValue: r.maxValue,
          count: r.count,
        })),
        aggregation,
      };
    }),

  /**
   * Record a state change (typically called from MQTT handler)
   */
  record: withPermission('devices:control')
    .input(z.object({
      deviceId: z.string(),
      property: z.string(),
      value: z.unknown(),
      previousValue: z.unknown().optional(),
      source: z.enum(['user', 'automation', 'mqtt', 'schedule', 'api']).default('api'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { deviceId, property, value, previousValue, source } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      // Verify device exists and belongs to household
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

      const history = await getDeviceHistoryCollection();

      const historyDoc = {
        deviceId: new ObjectId(deviceId),
        householdId: auth.householdId,
        timestamp: new Date(),
        property,
        value,
        previousValue,
        source,
        userId: source === 'user' ? new ObjectId(auth.userId) : undefined,
      };

      await history.insertOne(historyDoc as never);

      return { msg: 'History recorded' };
    }),

  /**
   * Get summary statistics for a device
   */
  stats: withPermission('devices:read')
    .input(z.object({
      deviceId: z.string(),
      period: z.enum(['day', 'week', 'month']).default('day'),
    }))
    .query(async ({ input, ctx }) => {
      const { deviceId, period } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      // Verify device exists
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

      const history = await getDeviceHistoryCollection();

      // Calculate date range
      const now = new Date();
      const startDate = new Date(now);
      if (period === 'day') startDate.setDate(now.getDate() - 1);
      else if (period === 'week') startDate.setDate(now.getDate() - 7);
      else startDate.setMonth(now.getMonth() - 1);

      // Get state change count
      const changeCount = await history.countDocuments({
        deviceId: new ObjectId(deviceId),
        timestamp: { $gte: startDate },
      });

      // Get unique properties that changed
      const properties = await history.distinct('property', {
        deviceId: new ObjectId(deviceId),
        timestamp: { $gte: startDate },
      });

      // Get average values for numeric properties
      const numericStats = await history.aggregate([
        {
          $match: {
            deviceId: new ObjectId(deviceId),
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$property',
            avgValue: { $avg: { $toDouble: '$value' } },
            minValue: { $min: { $toDouble: '$value' } },
            maxValue: { $max: { $toDouble: '$value' } },
          },
        },
      ]).toArray();

      return {
        period,
        changeCount,
        properties,
        numericStats: numericStats.map((s) => ({
          property: s._id,
          avg: s.avgValue,
          min: s.minValue,
          max: s.maxValue,
        })),
      };
    }),
});
