import { Job } from 'bullmq';
import { getAlertRulesCollection } from '@/src/lib/db';
import { dispatchNotification } from '@/server/notifications/dispatch';
import { evaluateRule, parseCondition } from '../lib/evaluateRule';

export interface EvaluateAlertsJobData {
  reason?: 'cron' | 'manual';
}

const DEFAULT_COOLDOWN_MINUTES = 60;

/**
 * Walk every enabled alert rule across all households, evaluate, and fire
 * notifications respecting per-rule cooldown.
 */
export async function evaluateAlerts(_job: Job<EvaluateAlertsJobData>): Promise<{ checked: number; fired: number }> {
  const rules = await getAlertRulesCollection();
  const cursor = rules.find({ isEnabled: true });

  const now = new Date();
  let checked = 0;
  let fired = 0;

  for await (const rule of cursor) {
    checked++;

    const cooldownMs = (rule.cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES) * 60_000;
    if (rule.lastFiredAt && now.getTime() - new Date(rule.lastFiredAt).getTime() < cooldownMs) {
      continue;
    }

    const householdId = rule.householdId as unknown as string;
    const result = await evaluateRule(householdId, rule.condition);

    await rules.updateOne(
      { _id: rule._id },
      {
        $set: {
          lastEvaluatedAt: now,
          lastValue: result.value,
          updatedAt: now,
        },
      }
    );

    if (!result.fired) continue;

    const parsed = parseCondition(rule.condition);
    const detail = parsed
      ? `${parsed.metric} ${parsed.op} ${parsed.threshold} (current: ${result.value})`
      : 'condition matched';

    await dispatchNotification({
      householdId,
      type: 'alert',
      title: rule.name,
      message: detail,
      channels: rule.channels,
    });

    await rules.updateOne(
      { _id: rule._id },
      { $set: { lastFiredAt: now } }
    );
    fired++;
  }

  if (checked > 0) {
    console.log(`[jobs] alert eval: checked=${checked} fired=${fired}`);
  }
  return { checked, fired };
}
