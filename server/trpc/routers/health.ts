import { router, publicProcedure } from '@/server/trpc';

export const healthRouter = router({
  /**
   * Health check endpoint
   */
  check: publicProcedure.query(() => {
    return {
      status: 'ok' as const,
      timestamp: new Date(),
    };
  }),
});
