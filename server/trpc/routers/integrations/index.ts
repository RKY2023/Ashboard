import { router } from '@/server/trpc';
import { webhooksRouter } from './webhooks';
import { voiceRouter } from './voice';
import { aaRouter } from './aa';
import { expenseRouter } from './expense';

export const integrationsRouter = router({
  webhooks: webhooksRouter,
  voice: voiceRouter,
  aa: aaRouter,
  expense: expenseRouter,
});
