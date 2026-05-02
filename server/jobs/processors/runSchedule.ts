import { ObjectId } from 'mongodb';
import { Job } from 'bullmq';
import { getSchedulesCollection } from '@/src/lib/db';
import { ScheduleAction } from '@/src/types';
import { ScheduleJobData } from '../queues';
import { nextRunAt } from '../lib/nextRunAt';
import { publishDeviceCommand } from '../lib/publishCommand';
import { runScene } from '../lib/runScene';
import { getAutomationQueue } from '../queues';

export async function runSchedule(job: Job<ScheduleJobData>): Promise<{ ok: boolean; ranAt: string }> {
  const { scheduleId, reason } = job.data;
  const schedules = await getSchedulesCollection();

  const schedule = await schedules.findOne({ _id: new ObjectId(scheduleId), isActive: true });
  if (!schedule) {
    return { ok: false, ranAt: new Date().toISOString() };
  }
  if (!schedule.isEnabled) {
    return { ok: false, ranAt: new Date().toISOString() };
  }

  const action = schedule.action as ScheduleAction;
  const householdId = schedule.householdId as unknown as string;

  switch (action.type) {
    case 'device_control': {
      await publishDeviceCommand({
        householdId,
        deviceId: action.deviceId,
        command: action.command,
        value: action.value,
      });
      break;
    }
    case 'scene': {
      await runScene({ householdId, sceneId: action.sceneId });
      break;
    }
    case 'automation': {
      await getAutomationQueue().add('run', {
        automationId: action.automationId,
        reason: 'schedule',
      });
      break;
    }
  }

  const ranAt = new Date();
  const next = nextRunAt(schedule.timing, ranAt);

  await schedules.updateOne(
    { _id: new ObjectId(scheduleId) },
    {
      $set: {
        lastRunAt: ranAt,
        nextRunAt: next ?? undefined,
        updatedAt: ranAt,
      },
      $inc: { runCount: 1 },
    }
  );

  console.log(`[jobs] schedule ${scheduleId} (${reason}) ran; next=${next?.toISOString() ?? 'none'}`);
  return { ok: true, ranAt: ranAt.toISOString() };
}
