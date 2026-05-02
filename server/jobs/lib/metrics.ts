import {
  getEnergyReadingsCollection,
  getGroceriesCollection,
  getSecurityEventsCollection,
  getNotificationsCollection,
  getMaintenanceTasksCollection,
  getInventoryCollection,
} from '@/src/lib/db';

export type MetricLoader = (householdId: string) => Promise<number>;

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d = new Date()): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function startOfMonth(d = new Date()): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

async function sumEnergy(householdId: string, since: Date, field: 'energy' | 'cost'): Promise<number> {
  const readings = await getEnergyReadingsCollection();
  const result = await readings
    .aggregate([
      { $match: { householdId, timestamp: { $gte: since } } },
      { $group: { _id: null, total: { $sum: `$${field}` } } },
    ] as never)
    .toArray();
  return (result[0] as { total?: number } | undefined)?.total ?? 0;
}

export const METRICS: Record<string, MetricLoader> = {
  'energy.todayKwh': (h) => sumEnergy(h, startOfDay(), 'energy'),
  'energy.weekKwh': (h) => sumEnergy(h, startOfWeek(), 'energy'),
  'energy.monthKwh': (h) => sumEnergy(h, startOfMonth(), 'energy'),
  'energy.todayCost': (h) => sumEnergy(h, startOfDay(), 'cost'),
  'energy.monthCost': (h) => sumEnergy(h, startOfMonth(), 'cost'),

  'pantry.expiringSoon': async (h) => {
    const groceries = await getGroceriesCollection();
    const cutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return groceries.countDocuments({
      householdId: h,
      expiryDate: { $lte: cutoff, $gte: new Date() },
    } as never);
  },
  'pantry.lowStock': async (h) => {
    const groceries = await getGroceriesCollection();
    return groceries.countDocuments({ householdId: h, isLow: true } as never);
  },

  'security.unackEvents': async (h) => {
    const events = await getSecurityEventsCollection();
    return events.countDocuments({ householdId: h, isAcknowledged: false } as never);
  },
  'security.criticalUnack': async (h) => {
    const events = await getSecurityEventsCollection();
    return events.countDocuments({
      householdId: h,
      isAcknowledged: false,
      severity: { $in: ['alert', 'critical'] },
    } as never);
  },

  'notifications.unread': async (h) => {
    const notifications = await getNotificationsCollection();
    return notifications.countDocuments({ householdId: h, isRead: false } as never);
  },

  'maintenance.dueSoon': async (h) => {
    const tasks = await getMaintenanceTasksCollection();
    const cutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return tasks.countDocuments({
      householdId: h,
      isActive: true,
      isComplete: false,
      nextDueAt: { $lte: cutoff },
    } as never);
  },
  'maintenance.overdue': async (h) => {
    const tasks = await getMaintenanceTasksCollection();
    return tasks.countDocuments({
      householdId: h,
      isActive: true,
      isComplete: false,
      nextDueAt: { $lt: new Date() },
    } as never);
  },
  'inventory.warrantyExpiringSoon': async (h) => {
    const items = await getInventoryCollection();
    const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return items.countDocuments({
      householdId: h,
      isActive: true,
      warrantyExpiresAt: { $lte: cutoff, $gte: new Date() },
    } as never);
  },
};

export function listAvailableMetrics(): string[] {
  return Object.keys(METRICS).sort();
}

export async function loadMetric(name: string, householdId: string): Promise<number | null> {
  const loader = METRICS[name];
  if (!loader) return null;
  return loader(householdId);
}
