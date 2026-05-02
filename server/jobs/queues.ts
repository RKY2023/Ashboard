import { Queue, QueueEvents } from 'bullmq';
import IORedis, { Redis } from 'ioredis';

export const SCHEDULE_QUEUE = 'ashboard:schedules';
export const AUTOMATION_QUEUE = 'ashboard:automations';
export const ALERTS_QUEUE = 'ashboard:alerts';

export interface ScheduleJobData {
  scheduleId: string;
  reason: 'cron' | 'manual';
  triggeredBy?: string;
}

export interface AutomationJobData {
  automationId: string;
  reason: 'manual' | 'trigger' | 'schedule' | 'webhook' | 'voice';
  triggeredBy?: string;
  context?: Record<string, unknown>;
}

export interface AlertsJobData {
  reason?: 'cron' | 'manual';
}

let connection: Redis | null = null;
let scheduleQueue: Queue<ScheduleJobData> | null = null;
let automationQueue: Queue<AutomationJobData> | null = null;
let alertsQueue: Queue<AlertsJobData> | null = null;

function getConnection(): Redis {
  if (connection) return connection;
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is not set — required to enqueue scheduler/automation jobs');
  }
  connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  return connection;
}

export function getScheduleQueue(): Queue<ScheduleJobData> {
  if (!scheduleQueue) {
    scheduleQueue = new Queue<ScheduleJobData>(SCHEDULE_QUEUE, { connection: getConnection() });
  }
  return scheduleQueue;
}

export function getAutomationQueue(): Queue<AutomationJobData> {
  if (!automationQueue) {
    automationQueue = new Queue<AutomationJobData>(AUTOMATION_QUEUE, { connection: getConnection() });
  }
  return automationQueue;
}

export function getAlertsQueue(): Queue<AlertsJobData> {
  if (!alertsQueue) {
    alertsQueue = new Queue<AlertsJobData>(ALERTS_QUEUE, { connection: getConnection() });
  }
  return alertsQueue;
}

export function createQueueEvents() {
  return {
    schedule: new QueueEvents(SCHEDULE_QUEUE, { connection: getConnection() }),
    automation: new QueueEvents(AUTOMATION_QUEUE, { connection: getConnection() }),
  };
}

export async function closeQueues(): Promise<void> {
  await Promise.all([
    scheduleQueue?.close(),
    automationQueue?.close(),
    alertsQueue?.close(),
  ]);
  scheduleQueue = null;
  automationQueue = null;
  alertsQueue = null;
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
