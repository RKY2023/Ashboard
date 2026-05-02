import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { initializeMQTT, mqttClient } from '@/server/mqtt';
import { ensureIndexes } from '@/src/lib/db';
import {
  SCHEDULE_QUEUE,
  AUTOMATION_QUEUE,
  ALERTS_QUEUE,
  ScheduleJobData,
  AutomationJobData,
  AlertsJobData,
  getAlertsQueue,
  closeQueues,
} from './queues';
import { runSchedule } from './processors/runSchedule';
import { runAutomation } from './processors/runAutomation';
import { evaluateAlerts } from './processors/evaluateAlerts';
import { startProducer, stopProducer } from './producer';

async function main() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('[worker] REDIS_URL is required');
    process.exit(1);
  }
  if (!process.env.API_URL) {
    console.error('[worker] API_URL (Mongo connection string) is required');
    process.exit(1);
  }

  await ensureIndexes();
  await initializeMQTT();

  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const scheduleWorker = new Worker<ScheduleJobData>(SCHEDULE_QUEUE, runSchedule, {
    connection,
    concurrency: 5,
  });
  const automationWorker = new Worker<AutomationJobData>(AUTOMATION_QUEUE, runAutomation, {
    connection,
    concurrency: 5,
  });
  const alertsWorker = new Worker<AlertsJobData>(ALERTS_QUEUE, evaluateAlerts, {
    connection,
    concurrency: 1,
  });

  scheduleWorker.on('failed', (job, err) => {
    console.error(`[worker] schedule job ${job?.id} failed:`, err);
  });
  automationWorker.on('failed', (job, err) => {
    console.error(`[worker] automation job ${job?.id} failed:`, err);
  });
  alertsWorker.on('failed', (job, err) => {
    console.error(`[worker] alerts job ${job?.id} failed:`, err);
  });

  // Schedule the recurring alert evaluator. Clear any prior repeatables first
  // so restarting the worker doesn't accumulate duplicates.
  const alerts = getAlertsQueue();
  for (const r of await alerts.getRepeatableJobs()) {
    await alerts.removeRepeatableByKey(r.key);
  }
  await alerts.add(
    'eval',
    { reason: 'cron' },
    { repeat: { every: 60_000 }, removeOnComplete: 100, removeOnFail: 100 }
  );

  startProducer();

  console.log('[worker] ready (schedules + automations + alerts)');

  const shutdown = async (signal: string) => {
    console.log(`[worker] received ${signal}, shutting down`);
    stopProducer();
    await Promise.all([scheduleWorker.close(), automationWorker.close(), alertsWorker.close()]);
    await closeQueues();
    await connection.quit();
    if (mqttClient.isClientConnected()) await mqttClient.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[worker] fatal:', err);
  process.exit(1);
});
