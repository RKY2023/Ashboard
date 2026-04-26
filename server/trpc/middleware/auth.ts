import { TRPCError } from '@trpc/server';
import { ObjectId } from 'mongodb';
import { middleware, publicProcedure } from '../index';
import {
  verifyAccessToken,
  extractTokenFromHeader,
  hasPermission,
  hasAllPermissions,
  mergePermissions,
} from '@/src/lib/auth';
import {
  getUsersCollection,
  getHouseholdsCollection,
  getHouseholdMembersCollection,
  getSessionsCollection,
} from '@/src/lib/db';
import { Permission, AuthContext } from '@/src/types';

/**
 * Middleware that verifies the JWT token and loads user context
 */
const isAuthenticated = middleware(async ({ ctx, next }) => {
  const authHeader = ctx.req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Missing authentication token',
    });
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }

  // Verify session exists and is active
  const sessions = await getSessionsCollection();
  const session = await sessions.findOne({
    token,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Session expired or invalidated',
    });
  }

  // Load user
  const users = await getUsersCollection();
  const user = await users.findOne({
    _id: new ObjectId(payload.sub),
    isActive: true,
  });

  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not found or inactive',
    });
  }

  // Build auth context
  const authContext: AuthContext = {
    userId: user._id,
    user,
    permissions: [],
  };

  // If household context is set, load household and membership
  if (payload.householdId) {
    const householdId = new ObjectId(payload.householdId);

    const [households, members] = await Promise.all([
      getHouseholdsCollection(),
      getHouseholdMembersCollection(),
    ]);

    const [household, member] = await Promise.all([
      households.findOne({ _id: householdId, isActive: true }),
      members.findOne({
        userId: user._id,
        householdId,
        isActive: true,
      }),
    ]);

    if (household && member) {
      authContext.householdId = householdId;
      authContext.household = household;
      authContext.member = member;
      authContext.role = member.role;
      authContext.permissions = mergePermissions(member.role, member.permissions);
    }
  }

  return next({
    ctx: {
      ...ctx,
      auth: authContext,
    },
  });
});

/**
 * Middleware that requires a household context
 */
const requiresHousehold = middleware(async ({ ctx, next }) => {
  const auth = (ctx as { auth?: AuthContext }).auth;

  if (!auth?.householdId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Household context required',
    });
  }

  return next();
});

/**
 * Create a middleware that requires a specific permission
 */
function requiresPermission(permission: Permission) {
  return middleware(async ({ ctx, next }) => {
    const auth = (ctx as { auth?: AuthContext }).auth;

    if (!auth) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (!hasPermission(auth.permissions, permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Missing required permission: ${permission}`,
      });
    }

    return next();
  });
}

/**
 * Create a middleware that requires all of the specified permissions
 */
function requiresAllPermissions(permissions: Permission[]) {
  return middleware(async ({ ctx, next }) => {
    const auth = (ctx as { auth?: AuthContext }).auth;

    if (!auth) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (!hasAllPermissions(auth.permissions, permissions)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }

    return next();
  });
}

/**
 * Middleware that requires owner or admin role
 */
const requiresAdmin = middleware(async ({ ctx, next }) => {
  const auth = (ctx as { auth?: AuthContext }).auth;

  if (!auth?.role || !['owner', 'admin'].includes(auth.role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next();
});

/**
 * Middleware that requires owner role
 */
const requiresOwner = middleware(async ({ ctx, next }) => {
  const auth = (ctx as { auth?: AuthContext }).auth;

  if (!auth?.role || auth.role !== 'owner') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Owner access required',
    });
  }

  return next();
});

// Protected procedure - requires authentication
export const protectedProcedure = publicProcedure.use(isAuthenticated);

// Household procedure - requires authentication and household context
export const householdProcedure = protectedProcedure.use(requiresHousehold);

// Admin procedure - requires admin or owner role
export const adminProcedure = householdProcedure.use(requiresAdmin);

// Owner procedure - requires owner role
export const ownerProcedure = householdProcedure.use(requiresOwner);

// Permission-based procedures
export function withPermission(permission: Permission) {
  return householdProcedure.use(requiresPermission(permission));
}

export function withPermissions(permissions: Permission[]) {
  return householdProcedure.use(requiresAllPermissions(permissions));
}

// Export middleware for custom use
export {
  isAuthenticated,
  requiresHousehold,
  requiresPermission,
  requiresAllPermissions,
  requiresAdmin,
  requiresOwner,
};

// Extended context type with auth
export interface AuthenticatedContext {
  auth: AuthContext;
}
