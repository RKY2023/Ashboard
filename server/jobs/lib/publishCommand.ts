import { ObjectId } from 'mongodb';
import { mqttClient } from '@/server/mqtt';
import { getDevicesCollection } from '@/src/lib/db';

/**
 * Send a device command: publish over MQTT (best-effort) and persist the
 * desired state to Mongo so the UI reflects it even before the device acks.
 *
 * The MQTT publish is a no-op when the broker isn't connected (e.g. local dev
 * without mosquitto, or before the worker connects).
 */
export async function publishDeviceCommand(params: {
  householdId: string;
  deviceId: string;
  command: string;
  value: unknown;
}): Promise<void> {
  const { householdId, deviceId, command, value } = params;

  const devices = await getDevicesCollection();
  await devices.updateOne(
    { _id: new ObjectId(deviceId), householdId, isActive: true } as never,
    {
      $set: {
        [`state.${command}`]: value,
        updatedAt: new Date(),
      },
    }
  );

  if (mqttClient.isClientConnected()) {
    try {
      await mqttClient.publishCommand(householdId, deviceId, command, value);
    } catch (err) {
      console.warn(`[jobs] MQTT publish failed for device ${deviceId}:`, err);
    }
  }
}
