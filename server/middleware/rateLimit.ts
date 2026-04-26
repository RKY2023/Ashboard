import { TRPCError } from '@trpc/server';
import { middleware } from '@/server/trpc';
import {
  checkLoginRateLimit,
  checkRegisterRateLimit,
  checkDefaultRateLimit,
} from '@/lib/rateLimit';

/**
 * Login rate limit middleware (5 requests per 15 minutes)
 */
export const loginRateLimited = middleware(async ({ ctx, next }) => {
  const result = await checkLoginRateLimit(ctx.clientIp);

  if (!result.allowed) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Too many login attempts. Please try again in ${result.retryAfter} seconds`,
    });
  }

  return next();
});

/**
 * Register rate limit middleware (3 requests per hour)
 */
export const registerRateLimited = middleware(async ({ ctx, next }) => {
  const result = await checkRegisterRateLimit(ctx.clientIp);

  if (!result.allowed) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Too many registration attempts. Please try again in ${result.retryAfter} seconds`,
    });
  }

  return next();
});

/**
 * Default rate limit middleware (100 requests per 15 minutes)
 */
export const defaultRateLimited = middleware(async ({ ctx, next }) => {
  const result = await checkDefaultRateLimit(ctx.clientIp);

  if (!result.allowed) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Too many requests. Please try again in ${result.retryAfter} seconds`,
    });
  }

  return next();
});
