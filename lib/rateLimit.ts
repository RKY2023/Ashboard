import type { NextApiRequest } from 'next';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// In-memory rate limiters for different endpoints
// Using memory instead of Redis for simplicity (can be upgraded to Redis later)

const loginLimiter = new RateLimiterMemory({
  points: 5, // Number of requests
  duration: 15 * 60, // Per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes after limit
});

const registerLimiter = new RateLimiterMemory({
  points: 3, // Number of requests
  duration: 60 * 60, // Per hour
  blockDuration: 60 * 60, // Block for 1 hour after limit
});

const defaultLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 15 * 60, // Per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes after limit
});

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: NextApiRequest): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  let ip: string | undefined;

  if (Array.isArray(xForwardedFor)) {
    ip = xForwardedFor[0];
  } else if (xForwardedFor) {
    ip = xForwardedFor.split(',')[0];
  }

  const xRealIp = req.headers['x-real-ip'];
  const realIp = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;

  return (ip || realIp || req.socket?.remoteAddress || 'unknown') as string;
}

/**
 * Check if login attempt is rate limited
 */
export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    await loginLimiter.consume(ip, 1);
    return { allowed: true };
  } catch (error: any) {
    return {
      allowed: false,
      retryAfter: Math.ceil(error.msBeforeNext / 1000),
    };
  }
}

/**
 * Check if registration attempt is rate limited
 */
export async function checkRegisterRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    await registerLimiter.consume(ip, 1);
    return { allowed: true };
  } catch (error: any) {
    return {
      allowed: false,
      retryAfter: Math.ceil(error.msBeforeNext / 1000),
    };
  }
}

/**
 * Check if general API request is rate limited
 */
export async function checkDefaultRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    await defaultLimiter.consume(ip, 1);
    return { allowed: true };
  } catch (error: any) {
    return {
      allowed: false,
      retryAfter: Math.ceil(error.msBeforeNext / 1000),
    };
  }
}

/**
 * Reset rate limit for an IP (useful for testing)
 */
export async function resetRateLimit(ip: string, limiterType: 'login' | 'register' | 'default' = 'default') {
  const limiter = limiterType === 'login' ? loginLimiter : limiterType === 'register' ? registerLimiter : defaultLimiter;

  try {
    await limiter.delete(ip);
  } catch (error) {
    console.error(`Failed to reset ${limiterType} rate limit for ${ip}:`, error);
  }
}
