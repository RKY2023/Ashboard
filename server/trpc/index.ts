import { initTRPC } from '@trpc/server';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { getClientIp } from '@/lib/rateLimit';

/**
 * Context available to all tRPC procedures
 */
export interface Context {
  req: CreateNextContextOptions['req'];
  res: CreateNextContextOptions['res'];
  clientIp: string;
}

/**
 * Create context for each tRPC request
 */
export async function createContext(opts: CreateNextContextOptions): Promise<Context> {
  const { req, res } = opts;
  const clientIp = getClientIp(req);

  return {
    req,
    res,
    clientIp,
  };
}

/**
 * Initialize tRPC with superjson transformer and error formatting
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
