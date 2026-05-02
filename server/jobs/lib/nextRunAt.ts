import cronParser from 'cron-parser';
import { ScheduleTiming } from '@/src/types';

/**
 * Compute the next run time for a schedule timing.
 * Returns null if the timing has no future occurrence (e.g. a past one-shot).
 *
 * Shared between the schedules tRPC router and the BullMQ worker so that
 * cron expressions actually receive a nextRunAt instead of null.
 */
export function nextRunAt(timing: ScheduleTiming, from: Date = new Date()): Date | null {
  switch (timing.type) {
    case 'daily': {
      if (!timing.time) return null;
      const [hours, minutes] = timing.time.split(':').map(Number);
      const next = new Date(from);
      next.setSeconds(0, 0);
      next.setHours(hours, minutes, 0, 0);
      if (next <= from) next.setDate(next.getDate() + 1);
      return next;
    }

    case 'weekly': {
      if (!timing.time || !timing.days || timing.days.length === 0) return null;
      const [hours, minutes] = timing.time.split(':').map(Number);
      const sortedDays = [...timing.days].sort((a, b) => a - b);

      for (let offset = 0; offset < 14; offset++) {
        const candidate = new Date(from);
        candidate.setDate(candidate.getDate() + offset);
        candidate.setHours(hours, minutes, 0, 0);
        if (sortedDays.includes(candidate.getDay()) && candidate > from) {
          return candidate;
        }
      }
      return null;
    }

    case 'once': {
      if (!timing.date) return null;
      const date = new Date(timing.date);
      return date > from ? date : null;
    }

    case 'cron': {
      if (!timing.cron) return null;
      try {
        const interval = cronParser.parseExpression(timing.cron, {
          currentDate: from,
          tz: timing.timezone,
        });
        return interval.next().toDate();
      } catch {
        return null;
      }
    }

    default:
      return null;
  }
}
