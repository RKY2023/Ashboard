import { ObjectId } from 'mongodb';
import { Job } from 'bullmq';
import { getAutomationsCollection } from '@/src/lib/db';
import { AutomationJobData } from '../queues';
import { runAutomationActions, AutomationActionDoc } from '../lib/runAutomationActions';
import { evaluateConditions, AutomationCondition } from '../lib/evaluateConditions';

export async function runAutomation(
  job: Job<AutomationJobData>
): Promise<{ ok: boolean; skipped?: boolean; failedAt?: number; results: unknown }> {
  const { automationId, reason } = job.data;
  const automations = await getAutomationsCollection();

  const automation = await automations.findOne({
    _id: new ObjectId(automationId),
    isActive: true,
  });
  if (!automation) return { ok: false, results: [] };
  if (!automation.isEnabled) return { ok: false, results: [] };

  const householdId = automation.householdId as unknown as string;
  const conditions = (automation.conditions as unknown as AutomationCondition[]) ?? [];

  // Manual trigger bypasses conditions — the user explicitly asked for this run.
  if (reason !== 'manual') {
    const check = await evaluateConditions(conditions, { householdId });
    if (!check.pass) {
      console.log(`[jobs] automation ${automationId} (${reason}) skipped: condition #${check.failedAt} false`);
      return { ok: true, skipped: true, failedAt: check.failedAt, results: [] };
    }
  }

  const actions = (automation.actions as unknown as AutomationActionDoc[]) ?? [];
  const results = await runAutomationActions({ householdId, actions, reason });

  await automations.updateOne(
    { _id: new ObjectId(automationId) },
    {
      $set: { lastTriggeredAt: new Date(), updatedAt: new Date() },
      $inc: { executionCount: 1 },
    }
  );

  console.log(`[jobs] automation ${automationId} (${reason}) ran; ${results.filter((r) => r.success).length}/${results.length} actions ok`);
  return { ok: true, results };
}
