import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { JwtPayload, UserRole, Permission } from '@/src/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-characters-long'
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-min-32-chars'
);

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  householdId?: string;
  role?: UserRole;
  permissions?: Permission[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

/**
 * Generate an access token
 */
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    sub: payload.userId,
    email: payload.email,
    householdId: payload.householdId,
    role: payload.role,
    permissions: payload.permissions,
    type: 'access',
  } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setIssuer('ashboard')
    .setAudience('ashboard-client')
    .sign(JWT_SECRET);
}

/**
 * Generate a refresh token
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    sub: userId,
    type: 'refresh',
  } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setIssuer('ashboard')
    .setAudience('ashboard-client')
    .sign(REFRESH_SECRET);
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload.userId),
  ]);

  // Calculate expiration dates
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    accessToken,
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
  };
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'ashboard',
      audience: 'ashboard-client',
    });

    if (payload.type !== 'access') {
      return null;
    }

    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET, {
      issuer: 'ashboard',
      audience: 'ashboard-client',
    });

    if (payload.type !== 'refresh' || !payload.sub) {
      return null;
    }

    return { userId: payload.sub };
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Parse token expiration time to milliseconds
 */
export function parseExpiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

/**
 * Check if token is about to expire (within threshold)
 */
export function isTokenExpiringSoon(exp: number, thresholdMs: number = 60000): boolean {
  const expiresAt = exp * 1000;
  const now = Date.now();
  return expiresAt - now < thresholdMs;
}
