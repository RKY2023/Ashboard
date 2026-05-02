import { getSchedulesCollection } from '@/src/lib/db';
import { getScheduleQueue } from './queues';

const POLL_MS = 30_000;
const LOOK_AHEAD_MS = 60_000;

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * Poll the schedules collection for rows whose nextRunAt has passed (or is
 * within LOOK_AHEAD_MS) and enqueue them. We claim a row by clearing
 * nextRunAt atomically so the next tick doesn't re-enqueue the same job;
 * the processor recomputes the real nextRunAt after running.
 */
async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const schedules = await getSchedulesCollection();
    const horizon = new Date(Date.now() + LOOK_AHEAD_MS);
    const queue = getScheduleQueue();

    while (true) {
      const claimed = await schedules.findOneAndUpdate(
        {
          isActive: true,
          isEnabled: true,
          nextRunAt: { $ne: null, $lte: horizon },
        } as never,
        { $unset: { nextRunAt: '' } } as never,
        { sort: { nextRunAt: 1 }, returnDocument: 'before' }
      );

      const doc = (claimed as unknown as { value?: { _id: { toString(): string }; nextRunAt?: Date } } | null)?.value
        ?? (claimed as unknown as { _id?: { toString(): string }; nextRunAt?: Date } | null);

      if (!doc || !doc._id) break;

      const runAt = doc.nextRunAt ? new Date(doc.nextRunAt) : new Date();
      const delay = Math.max(0, runAt.getTime() - Date.now());

      await queue.add(
        'run',
        { scheduleId: doc._id.toString(), reason: 'cron' },
        { delay, removeOnComplete: 1000, removeOnFail: 1000 }
      );
    }
  } catch (err) {
    console.error('[jobs] producer tick failed:', err);
  } finally {
    running = false;
  }
}

export function startProducer(): void {
  if (timer) return;
  console.log(`[jobs] schedule producer starting (poll every ${POLL_MS}ms, look-ahead ${LOOK_AHEAD_MS}ms)`);
  // Fire immediately, then on interval.
  void tick();
  timer = setInterval(() => { void tick(); }, POLL_MS);
}

export function stopProducer(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
