import { createTRPCReact, type CreateTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@/server/trpc/routers/_app';

/**
 * tRPC React hooks
 */
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();

/**
 * Get base URL for tRPC client
 */
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser - use relative URL
    return '';
  }

  // SSR - use localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Create tRPC client with superjson transformer
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
      }),
    ],
  });
}
