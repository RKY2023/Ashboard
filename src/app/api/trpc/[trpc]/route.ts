import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/routers/_app';
import { createContext } from '@/server/trpc';
import type { NextRequest } from 'next/server';

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => {
      // Create a mock context for App Router
      // The fetch adapter doesn't have traditional req/res objects
      return {
        req: {
          headers: Object.fromEntries(req.headers.entries()),
        },
        res: {},
        clientIp: req.headers.get('x-forwarded-for')?.split(',')[0] ||
                  req.headers.get('x-real-ip') ||
                  '127.0.0.1',
      } as unknown as Awaited<ReturnType<typeof createContext>>;
    },
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
