import { router } from '@/server/trpc';
import { webhooksRouter } from './webhooks';
import { voiceRouter } from './voice';

export const integrationsRouter = router({
  webhooks: webhooksRouter,
  voice: voiceRouter,
});
