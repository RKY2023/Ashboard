import { publicProcedure } from '@/server/trpc';
import {
  loginRateLimited,
  registerRateLimited,
  defaultRateLimited,
} from '@/server/middleware/rateLimit';

/**
 * Procedure with login rate limiting (5 requests per 15 minutes)
 */
export const loginProcedure = publicProcedure.use(loginRateLimited);

/**
 * Procedure with register rate limiting (3 requests per hour)
 */
export const registerProcedure = publicProcedure.use(registerRateLimited);

/**
 * Procedure with default rate limiting (100 requests per 15 minutes)
 */
export const rateLimitedProcedure = publicProcedure.use(defaultRateLimited);
