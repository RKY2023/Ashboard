import { ObjectId } from 'mongodb';
import { getAutomationQueue } from '@/server/jobs/queues';
import { runScene } from '@/server/jobs/lib/runScene';
import { WebhookTargetType } from '@/src/types';

/**
 * Trigger a webhook/voice target. Automations are queued so condition
 * evaluation and action lists run on the worker; scenes execute inline
 * because they are deterministic batches that don't need queue durability.
 */
export async function fireTarget(params: {
  householdId: string;
  targetType: WebhookTargetType;
  targetId: ObjectId | string;
  reason: 'webhook' | 'voice';
}): Promise<{ ok: boolean; details: string }> {
  const targetId = typeof params.targetId === 'string'
    ? params.targetId
    : params.targetId.toString();

  if (params.targetType === 'automation') {
    try {
      await getAutomationQueue().add(
        'run',
        { automationId: targetId, reason: params.reason },
        { removeOnComplete: 1000, removeOnFail: 1000 }
      );
      return { ok: true, details: `automation ${targetId} queued` };
    } catch (err) {
      return {
        ok: false,
        details: err instanceof Error ? err.message : 'queue add failed',
      };
    }
  }

  try {
    const results = await runScene({ householdId: params.householdId, sceneId: targetId });
    return {
      ok: true,
      details: `scene ${targetId} ran (${results.filter((r) => r.success).length}/${results.length})`,
    };
  } catch (err) {
    return {
      ok: false,
      details: err instanceof Error ? err.message : 'scene activation failed',
    };
  }
}
