import crypto from 'crypto';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';
import { router, publicProcedure } from '@/server/trpc';
import { loginProcedure, registerProcedure } from '@/server/trpc/trpc';
import { protectedProcedure } from '@/server/trpc/middleware/auth';
import { userRegistrationSchema, loginSchema } from '@/lib/validation';
import {
  getUsersCollection,
  getHouseholdsCollection,
  getHouseholdMembersCollection,
  getSessionsCollection,
  getPasswordResetTokensCollection,
} from '@/src/lib/db';
import { sendPasswordResetEmail } from '@/src/lib/email';
import { auditHelpers } from '@/src/lib/db/audit';
import {
  generateTokenPair,
  verifyRefreshToken,
  extractTokenFromHeader,
} from '@/src/lib/auth';
import {
  ROLE_PERMISSIONS,
  HouseholdSettings,
  User,
  Session,
  PasswordResetToken,
} from '@/src/types';

// Schemas
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

const selectHouseholdSchema = z.object({
  householdId: z.string().min(1),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: userRegistrationSchema.shape.password,
});

// Reset tokens are short-lived (30 minutes). The raw token is sent in the
// email; only the SHA-256 hash is stored, so a DB leak doesn't yield a usable
// reset link.
const RESET_TOKEN_TTL_MINUTES = 30;

function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function buildResetUrl(rawToken: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

const createHouseholdSchema = z.object({
  name: z.string().min(2).max(100),
  settings: z.object({
    timezone: z.string().optional(),
    currency: z.string().optional(),
    temperatureUnit: z.enum(['celsius', 'fahrenheit']).optional(),
    language: z.string().optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

export const authRouter = router({
  /**
   * Register a new user with optional household creation
   */
  register: registerProcedure
    .input(userRegistrationSchema.extend({
      createHousehold: z.boolean().optional(),
      householdName: z.string().min(2).max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { name, email, password, phoneno, createHousehold, householdName } = input;

      const users = await getUsersCollection();

      // Check if user already exists
      const existingUser = await users.findOne({ email });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Hash password with bcrypt (12 rounds)
      const hashedPassword = await bcrypt.hash(password, 12);
      const now = new Date();

      // Create user document
      const userDocument: Omit<User, '_id'> = {
        name,
        email,
        passwordHash: hashedPassword,
        phone: phoneno || undefined,
        isEmailVerified: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      // Insert user into database
      const userResult = await users.insertOne(userDocument as User);

      if (!userResult.acknowledged || !userResult.insertedId) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
        });
      }

      const userId = userResult.insertedId;
      let householdId: ObjectId | undefined;

      // Optionally create a household
      if (createHousehold && householdName) {
        const households = await getHouseholdsCollection();
        const members = await getHouseholdMembersCollection();

        // Generate unique slug
        const slug = `${householdName.toLowerCase().replace(/\s+/g, '-')}-${nanoid(6)}`;

        const defaultSettings: HouseholdSettings = {
          timezone: 'UTC',
          currency: 'USD',
          temperatureUnit: 'celsius',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
        };

        const householdResult = await households.insertOne({
          name: householdName,
          slug,
          ownerId: userId,
          settings: defaultSettings,
          subscription: 'free',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        } as never);

        if (householdResult.acknowledged) {
          householdId = householdResult.insertedId;

          // Add user as owner member
          await members.insertOne({
            userId,
            householdId,
            role: 'owner',
            permissions: ROLE_PERMISSIONS.owner,
            invitedBy: userId,
            joinedAt: now,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          } as never);
        }
      }

      // Generate tokens
      const tokens = await generateTokenPair({
        userId: userId.toString(),
        email,
        householdId: householdId?.toString(),
        role: householdId ? 'owner' : undefined,
        permissions: householdId ? ROLE_PERMISSIONS.owner : [],
      });

      // Create session
      const sessions = await getSessionsCollection();
      await sessions.insertOne({
        userId,
        householdId,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessExpiresAt,
        refreshExpiresAt: tokens.refreshExpiresAt,
        userAgent: ctx.req.headers['user-agent'],
        ipAddress: ctx.clientIp,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as Session);

      return {
        msg: 'User created successfully',
        userId: userId.toString(),
        householdId: householdId?.toString(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessExpiresAt.toISOString(),
      };
    }),

  /**
   * Login a user
   */
  login: loginProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      const users = await getUsersCollection();

      // Find user by email
      const user = await users.findOne({ email, isActive: true });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Compare provided password with hashed password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatch) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Get user's households
      const members = await getHouseholdMembersCollection();
      const households = await getHouseholdsCollection();

      const memberships = await members.find({
        userId: user._id,
        isActive: true,
      }).toArray();

      const householdIds = memberships.map(m => m.householdId);
      const userHouseholds = await households.find({
        _id: { $in: householdIds },
        isActive: true,
      }).toArray();

      // If user has exactly one household, auto-select it
      let selectedHouseholdId: ObjectId | undefined;
      let selectedRole: string | undefined;
      let selectedPermissions: string[] = [];

      if (memberships.length === 1) {
        selectedHouseholdId = memberships[0].householdId;
        selectedRole = memberships[0].role;
        selectedPermissions = memberships[0].permissions;
      }

      // Generate tokens
      const tokens = await generateTokenPair({
        userId: user._id.toString(),
        email: user.email,
        householdId: selectedHouseholdId?.toString(),
        role: selectedRole as never,
        permissions: selectedPermissions as never,
      });

      // Create session
      const sessions = await getSessionsCollection();
      const now = new Date();

      await sessions.insertOne({
        userId: user._id,
        householdId: selectedHouseholdId,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessExpiresAt,
        refreshExpiresAt: tokens.refreshExpiresAt,
        userAgent: ctx.req.headers['user-agent'],
        ipAddress: ctx.clientIp,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as Session);

      // Update last login
      await users.updateOne(
        { _id: user._id },
        { $set: { lastLoginAt: now, updatedAt: now } }
      );

      // Log audit event
      if (selectedHouseholdId) {
        await auditHelpers.logLogin(
          user._id,
          selectedHouseholdId,
          ctx.clientIp,
          ctx.req.headers['user-agent']
        );
      }

      return {
        msg: 'Login successful',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        households: userHouseholds.map(h => ({
          _id: h._id.toString(),
          name: h.name,
          role: memberships.find(m => m.householdId.equals(h._id))?.role,
        })),
        selectedHouseholdId: selectedHouseholdId?.toString(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessExpiresAt.toISOString(),
      };
    }),

  /**
   * Request a password reset link via email.
   *
   * Always returns the same generic response regardless of whether the email
   * exists, so that callers cannot enumerate accounts. Email-send failures are
   * logged server-side but not surfaced.
   */
  requestPasswordReset: loginProcedure
    .input(requestPasswordResetSchema)
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      const users = await getUsersCollection();
      const user = await users.findOne({ email, isActive: true });

      if (user) {
        try {
          const tokens = await getPasswordResetTokensCollection();
          const rawToken = crypto.randomBytes(32).toString('base64url');
          const now = new Date();
          const expiresAt = new Date(
            now.getTime() + RESET_TOKEN_TTL_MINUTES * 60_000
          );

          await tokens.insertOne({
            userId: user._id,
            tokenHash: hashResetToken(rawToken),
            expiresAt,
            ipAddress: ctx.clientIp,
            userAgent: ctx.req.headers['user-agent'],
            createdAt: now,
            updatedAt: now,
          } as PasswordResetToken);

          const resetUrl = buildResetUrl(rawToken);

          try {
            await sendPasswordResetEmail({
              to: user.email,
              name: user.name,
              resetUrl,
              expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
            });
          } catch (sendErr) {
            console.error(
              '[auth.requestPasswordReset] email delivery failed',
              sendErr
            );
            if (process.env.NODE_ENV !== 'production') {
              console.warn(
                `[auth.requestPasswordReset] dev fallback — reset URL: ${resetUrl}`
              );
            }
          }
        } catch (err) {
          console.error(
            '[auth.requestPasswordReset] failed to issue reset token',
            err
          );
        }
      }

      return {
        msg: 'If an account exists for that email, a reset link has been sent.',
      };
    }),

  /**
   * Complete a password reset using the token from the emailed link.
   *
   * Verifies the hashed token, replaces the user's password, marks the token
   * used, and invalidates all of that user's sessions so a stolen session
   * cannot outlive the reset.
   */
  resetPassword: loginProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input }) => {
      const { token, password } = input;
      const tokenHash = hashResetToken(token);
      const now = new Date();

      const tokens = await getPasswordResetTokensCollection();
      const record = await tokens.findOne({ tokenHash });

      if (!record || record.usedAt || record.expiresAt <= now) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This reset link is invalid or has expired.',
        });
      }

      const users = await getUsersCollection();
      const user = await users.findOne({ _id: record.userId, isActive: true });

      if (!user) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This reset link is invalid or has expired.',
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await users.updateOne(
        { _id: user._id },
        { $set: { passwordHash, updatedAt: now } }
      );

      await tokens.updateOne(
        { _id: record._id },
        { $set: { usedAt: now, updatedAt: now } }
      );

      // Invalidate all existing sessions — anything issued before the reset
      // should not survive it.
      const sessions = await getSessionsCollection();
      await sessions.updateMany(
        { userId: user._id, isActive: true },
        { $set: { isActive: false, updatedAt: now } }
      );

      return { msg: 'Password updated. You can now sign in.' };
    }),

  /**
   * Refresh access token
   */
  refresh: publicProcedure
    .input(refreshTokenSchema)
    .mutation(async ({ input }) => {
      const { refreshToken } = input;

      // Verify refresh token
      const payload = await verifyRefreshToken(refreshToken);

      if (!payload) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
        });
      }

      // Find existing session
      const sessions = await getSessionsCollection();
      const session = await sessions.findOne({
        refreshToken,
        isActive: true,
        refreshExpiresAt: { $gt: new Date() },
      });

      if (!session) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Session not found or expired',
        });
      }

      // Load user
      const users = await getUsersCollection();
      const user = await users.findOne({
        _id: session.userId,
        isActive: true,
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found',
        });
      }

      // Load membership if household is set
      let role: string | undefined;
      let permissions: string[] = [];

      if (session.householdId) {
        const members = await getHouseholdMembersCollection();
        const member = await members.findOne({
          userId: user._id,
          householdId: session.householdId,
          isActive: true,
        });

        if (member) {
          role = member.role;
          permissions = member.permissions;
        }
      }

      // Generate new tokens
      const tokens = await generateTokenPair({
        userId: user._id.toString(),
        email: user.email,
        householdId: session.householdId?.toString(),
        role: role as never,
        permissions: permissions as never,
      });

      // Update session with new tokens
      const now = new Date();
      await sessions.updateOne(
        { _id: session._id },
        {
          $set: {
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.accessExpiresAt,
            refreshExpiresAt: tokens.refreshExpiresAt,
            updatedAt: now,
          },
        }
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessExpiresAt.toISOString(),
      };
    }),

  /**
   * Logout - invalidate session
   */
  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      const authHeader = ctx.req.headers.authorization;
      const token = extractTokenFromHeader(authHeader);

      if (token) {
        const sessions = await getSessionsCollection();
        await sessions.updateOne(
          { token },
          { $set: { isActive: false, updatedAt: new Date() } }
        );
      }

      return { msg: 'Logged out successfully' };
    }),

  /**
   * Logout all sessions for current user
   */
  logoutAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      const auth = (ctx as { auth: { userId: ObjectId } }).auth;
      const sessions = await getSessionsCollection();

      await sessions.updateMany(
        { userId: auth.userId },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      return { msg: 'All sessions logged out' };
    }),

  /**
   * Select/switch household context
   */
  selectHousehold: protectedProcedure
    .input(selectHouseholdSchema)
    .mutation(async ({ input, ctx }) => {
      const { householdId } = input;
      const auth = (ctx as { auth: { userId: ObjectId } }).auth;

      const householdObjectId = new ObjectId(householdId);

      // Verify membership
      const members = await getHouseholdMembersCollection();
      const member = await members.findOne({
        userId: auth.userId,
        householdId: householdObjectId,
        isActive: true,
      });

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a member of this household',
        });
      }

      // Verify household exists
      const households = await getHouseholdsCollection();
      const household = await households.findOne({
        _id: householdObjectId,
        isActive: true,
      });

      if (!household) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Household not found',
        });
      }

      // Get current user
      const users = await getUsersCollection();
      const user = await users.findOne({ _id: auth.userId });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Generate new tokens with household context
      const tokens = await generateTokenPair({
        userId: auth.userId.toString(),
        email: user.email,
        householdId,
        role: member.role as never,
        permissions: member.permissions as never,
      });

      // Update current session
      const authHeader = ctx.req.headers.authorization;
      const currentToken = extractTokenFromHeader(authHeader);

      if (currentToken) {
        const sessions = await getSessionsCollection();
        const now = new Date();

        await sessions.updateOne(
          { token: currentToken },
          {
            $set: {
              householdId: householdObjectId,
              token: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: tokens.accessExpiresAt,
              refreshExpiresAt: tokens.refreshExpiresAt,
              updatedAt: now,
            },
          }
        );
      }

      return {
        msg: 'Household selected',
        household: {
          _id: household._id.toString(),
          name: household.name,
        },
        role: member.role,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessExpiresAt.toISOString(),
      };
    }),

  /**
   * Create a new household
   */
  createHousehold: protectedProcedure
    .input(createHouseholdSchema)
    .mutation(async ({ input, ctx }) => {
      const { name, settings } = input;
      const auth = (ctx as { auth: { userId: ObjectId } }).auth;

      const households = await getHouseholdsCollection();
      const members = await getHouseholdMembersCollection();
      const now = new Date();

      // Generate unique slug
      const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${nanoid(6)}`;

      const householdSettings: HouseholdSettings = {
        timezone: settings?.timezone || 'UTC',
        currency: settings?.currency || 'USD',
        temperatureUnit: settings?.temperatureUnit || 'celsius',
        language: settings?.language || 'en',
        notifications: {
          email: settings?.notifications?.email ?? true,
          push: settings?.notifications?.push ?? true,
          sms: settings?.notifications?.sms ?? false,
        },
      };

      // Create household
      const householdResult = await households.insertOne({
        name,
        slug,
        ownerId: auth.userId,
        settings: householdSettings,
        subscription: 'free',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as never);

      const householdId = householdResult.insertedId;

      // Add user as owner
      await members.insertOne({
        userId: auth.userId,
        householdId,
        role: 'owner',
        permissions: ROLE_PERMISSIONS.owner,
        invitedBy: auth.userId,
        joinedAt: now,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as never);

      return {
        msg: 'Household created',
        householdId: householdId.toString(),
        slug,
      };
    }),

  /**
   * Get current user info
   */
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const auth = (ctx as { auth: { userId: ObjectId; householdId?: ObjectId; role?: string; permissions: string[] } }).auth;

      const users = await getUsersCollection();
      const user = await users.findOne({ _id: auth.userId });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Get user's households
      const members = await getHouseholdMembersCollection();
      const households = await getHouseholdsCollection();

      const memberships = await members.find({
        userId: auth.userId,
        isActive: true,
      }).toArray();

      const householdIds = memberships.map(m => m.householdId);
      const userHouseholds = await households.find({
        _id: { $in: householdIds },
        isActive: true,
      }).toArray();

      return {
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt.toISOString(),
        },
        households: userHouseholds.map(h => ({
          _id: h._id.toString(),
          name: h.name,
          role: memberships.find(m => m.householdId.equals(h._id))?.role,
        })),
        currentHouseholdId: auth.householdId?.toString(),
        currentRole: auth.role,
        permissions: auth.permissions,
      };
    }),

  /**
   * Get active sessions for current user
   */
  sessions: protectedProcedure
    .query(async ({ ctx }) => {
      const auth = (ctx as { auth: { userId: ObjectId } }).auth;
      const sessions = await getSessionsCollection();

      const activeSessions = await sessions.find({
        userId: auth.userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      }).toArray();

      return activeSessions.map(s => ({
        _id: s._id.toString(),
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      }));
    }),
});
