import { ObjectId } from 'mongodb';
import { getDevicesCollection, getSecurityModesCollection } from '@/src/lib/db';

export type ConditionType = 'device_state' | 'time_range' | 'day_of_week' | 'sun_position' | 'mode';
export type ConditionOp = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte';

export interface AutomationCondition {
  id?: string;
  type: ConditionType;
  // device_state
  deviceId?: string;
  property?: string;
  operator?: ConditionOp;
  value?: unknown;
  // time_range
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  // day_of_week
  days?: number[];    // 0=Sun..6=Sat
  // sun_position
  sunCondition?: 'before_sunrise' | 'after_sunrise' | 'before_sunset' | 'after_sunset';
  // mode
  mode?: string;
  // logic
  negate?: boolean;
}

export interface ConditionContext {
  householdId: string;
  now?: Date;
}

const NUMERIC_OPS: Record<ConditionOp, (a: number, b: number) => boolean> = {
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  gt: (a, b) => a > b,
  lt: (a, b) => a < b,
  gte: (a, b) => a >= b,
  lte: (a, b) => a <= b,
};

function compareValues(actual: unknown, op: ConditionOp, expected: unknown): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') {
    return NUMERIC_OPS[op](actual, expected);
  }
  if (op === 'eq') return actual === expected;
  if (op === 'ne') return actual !== expected;
  return false;
}

function parseHHmm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

async function checkOne(
  condition: AutomationCondition,
  ctx: ConditionContext
): Promise<boolean> {
  const now = ctx.now ?? new Date();

  switch (condition.type) {
    case 'device_state': {
      if (!condition.deviceId || !condition.property || !condition.operator) return false;
      const devices = await getDevicesCollection();
      const device = await devices.findOne({
        _id: new ObjectId(condition.deviceId),
        householdId: ctx.householdId,
      } as never);
      if (!device) return false;
      const actual = (device.state as Record<string, unknown> | undefined)?.[condition.property];
      return compareValues(actual, condition.operator, condition.value);
    }

    case 'time_range': {
      if (!condition.startTime || !condition.endTime) return false;
      const start = parseHHmm(condition.startTime);
      const end = parseHHmm(condition.endTime);
      if (start === null || end === null) return false;
      const minutes = now.getHours() * 60 + now.getMinutes();
      return start <= end
        ? minutes >= start && minutes <= end
        : minutes >= start || minutes <= end; // wraps midnight
    }

    case 'day_of_week': {
      if (!condition.days || condition.days.length === 0) return false;
      return condition.days.includes(now.getDay());
    }

    case 'mode': {
      if (!condition.mode) return false;
      const modes = await getSecurityModesCollection();
      const active = await modes
        .find({ householdId: ctx.householdId, isActive: true } as never)
        .sort({ updatedAt: -1 })
        .limit(1)
        .next();
      const current = active?.mode ?? 'disarmed';
      return current === condition.mode;
    }

    case 'sun_position': {
      // TODO: requires household lat/lon + sun calc — pass-through for now.
      return true;
    }

    default:
      return false;
  }
}

/**
 * Evaluate an automation's condition list. All conditions must pass (AND).
 * Each condition may set `negate: true` to invert its result.
 */
export async function evaluateConditions(
  conditions: AutomationCondition[] | undefined,
  ctx: ConditionContext
): Promise<{ pass: boolean; failedAt?: number }> {
  if (!conditions || conditions.length === 0) return { pass: true };

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    let result = await checkOne(condition, ctx);
    if (condition.negate) result = !result;
    if (!result) return { pass: false, failedAt: i };
  }
  return { pass: true };
}
