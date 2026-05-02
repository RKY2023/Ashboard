import { ObjectId } from 'mongodb';
import { getScenesCollection } from '@/src/lib/db';
import { publishDeviceCommand } from './publishCommand';

/**
 * Activate a scene: run every action in order, publish MQTT commands, and
 * bump activation stats. Returns the per-action result list for logging.
 */
export async function runScene(params: {
  householdId: string;
  sceneId: string;
}): Promise<{ deviceId: string; success: boolean; error?: string }[]> {
  const { householdId, sceneId } = params;
  const scenes = await getScenesCollection();

  const scene = await scenes.findOne({
    _id: new ObjectId(sceneId),
    householdId,
    isActive: true,
  } as never);

  if (!scene) {
    throw new Error(`Scene ${sceneId} not found for household ${householdId}`);
  }

  const results: { deviceId: string; success: boolean; error?: string }[] = [];

  for (const action of scene.actions) {
    const deviceId = action.deviceId.toString();
    try {
      await publishDeviceCommand({
        householdId,
        deviceId,
        command: action.command,
        value: action.value,
      });
      results.push({ deviceId, success: true });
    } catch (err) {
      results.push({
        deviceId,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  await scenes.updateOne(
    { _id: new ObjectId(sceneId) },
    {
      $set: { lastActivatedAt: new Date() },
      $inc: { activationCount: 1 },
    }
  );

  return results;
}
