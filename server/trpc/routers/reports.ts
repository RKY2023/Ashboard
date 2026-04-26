import { z } from 'zod';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getDevicesCollection,
  getEnergyReadingsCollection,
  getSecurityEventsCollection,
  getTransactionsCollection,
  getGroceriesCollection,
  getRecipesCollection,
  getAutomationsCollection,
} from '@/src/lib/db';
import { AuthContext } from '@/src/types';

export const reportsRouter = router({
  /**
   * Cross-domain dashboard KPIs — one query, fast.
   */
  kpis: withPermission('reports:read').query(async ({ ctx }) => {
    const auth = (ctx as unknown as { auth: AuthContext }).auth;
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDays = new Date(now);
    sevenDays.setDate(now.getDate() + 7);

    const [
      devices,
      energy,
      security,
      transactions,
      groceries,
      recipes,
      automations,
    ] = await Promise.all([
      getDevicesCollection(),
      getEnergyReadingsCollection(),
      getSecurityEventsCollection(),
      getTransactionsCollection(),
      getGroceriesCollection(),
      getRecipesCollection(),
      getAutomationsCollection(),
    ]);

    const [
      deviceTotal,
      deviceOnline,
      energyToday,
      securityTodayCount,
      securityCritical,
      monthExpense,
      monthIncome,
      groceryTotal,
      groceryExpiring,
      groceryLow,
      recipeTotal,
      automationActive,
    ] = await Promise.all([
      devices.countDocuments({
        householdId: auth.householdId,
        isActive: true,
      }),
      devices.countDocuments({
        householdId: auth.householdId,
        isActive: true,
        isOnline: true,
      }),
      energy
        .aggregate([
          {
            $match: {
              householdId: auth.householdId,
              timestamp: { $gte: dayStart },
            },
          },
          {
            $group: {
              _id: null,
              energy: { $sum: '$energy' },
              cost: { $sum: '$cost' },
            },
          },
        ])
        .toArray(),
      security.countDocuments({
        householdId: auth.householdId,
        createdAt: { $gte: dayStart },
      }),
      security.countDocuments({
        householdId: auth.householdId,
        isAcknowledged: false,
        severity: { $in: ['alert', 'critical'] },
      }),
      transactions
        .aggregate([
          {
            $match: {
              householdId: auth.householdId,
              type: 'expense',
              date: { $gte: monthStart },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .toArray(),
      transactions
        .aggregate([
          {
            $match: {
              householdId: auth.householdId,
              type: 'income',
              date: { $gte: monthStart },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .toArray(),
      groceries.countDocuments({ householdId: auth.householdId }),
      groceries.countDocuments({
        householdId: auth.householdId,
        expiryDate: { $gte: now, $lte: sevenDays },
      }),
      groceries.countDocuments({
        householdId: auth.householdId,
        isLow: true,
      }),
      recipes.countDocuments({ householdId: auth.householdId }),
      automations.countDocuments({
        householdId: auth.householdId,
        isEnabled: true,
      }),
    ]);

    return {
      devices: { total: deviceTotal, online: deviceOnline },
      energy: {
        todayKwh: energyToday[0]?.energy ?? 0,
        todayCost: energyToday[0]?.cost ?? 0,
      },
      security: {
        todayEvents: securityTodayCount,
        criticalOpen: securityCritical,
      },
      finance: {
        monthIncome: monthIncome[0]?.total ?? 0,
        monthExpense: monthExpense[0]?.total ?? 0,
        net: (monthIncome[0]?.total ?? 0) - (monthExpense[0]?.total ?? 0),
      },
      grocery: {
        total: groceryTotal,
        expiringSoon: groceryExpiring,
        lowStock: groceryLow,
      },
      recipes: { total: recipeTotal },
      automations: { enabled: automationActive },
    };
  }),

  /**
   * Export transactions as CSV-friendly rows. Client can download as a file.
   */
  exportTransactions: withPermission('reports:export')
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const txs = await getTransactionsCollection();

      const query: Record<string, unknown> = { householdId: auth.householdId };
      if (input.startDate || input.endDate) {
        const range: Record<string, Date> = {};
        if (input.startDate) range.$gte = new Date(input.startDate);
        if (input.endDate) range.$lte = new Date(input.endDate);
        query.date = range;
      }

      const items = await txs.find(query).sort({ date: -1 }).toArray();
      return items.map((t) => ({
        Date: t.date.toISOString().slice(0, 10),
        Type: t.type,
        Amount: t.amount,
        Currency: t.currency,
        Description: t.description,
        Payee: t.payee ?? '',
        Tags: (t.tags ?? []).join('|'),
      }));
    }),

  /**
   * Export device history as a CSV-friendly array
   */
  exportDeviceActivity: withPermission('reports:export')
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        limit: z.number().min(1).max(10000).default(1000),
      })
    )
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const energy = await getEnergyReadingsCollection();

      const query: Record<string, unknown> = { householdId: auth.householdId };
      if (input.startDate || input.endDate) {
        const range: Record<string, Date> = {};
        if (input.startDate) range.$gte = new Date(input.startDate);
        if (input.endDate) range.$lte = new Date(input.endDate);
        query.timestamp = range;
      }

      const items = await energy
        .find(query)
        .sort({ timestamp: -1 })
        .limit(input.limit)
        .toArray();

      return items.map((r) => ({
        Timestamp: r.timestamp.toISOString(),
        DeviceId: r.deviceId?.toString() ?? '',
        Power: r.power,
        Energy: r.energy,
        Cost: r.cost ?? '',
      }));
    }),
});
