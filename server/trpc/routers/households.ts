import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { protectedProcedure, householdProcedure, ownerProcedure } from '@/server/trpc/middleware/auth';
import {
  getHouseholdsCollection,
  getHouseholdMembersCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext, HouseholdSettings } from '@/src/types';

// Schemas
const updateHouseholdSchema = z.object({
  name: z.string().min(2).max(100).optional(),
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

export const householdsRouter = router({
  /**
   * List all households the current user belongs to
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: { userId: ObjectId } }).auth;

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

      return userHouseholds.map(h => {
        const membership = memberships.find(m => m.householdId.equals(h._id));
        return {
          _id: h._id.toString(),
          name: h.name,
          slug: h.slug,
          role: membership?.role,
          subscription: h.subscription,
          isOwner: h.ownerId.equals(auth.userId),
          memberCount: 0, // Will be populated if needed
          createdAt: h.createdAt.toISOString(),
        };
      });
    }),

  /**
   * Get current household details
   */
  current: householdProcedure
    .query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      if (!auth.household) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Household not found',
        });
      }

      const members = await getHouseholdMembersCollection();
      const memberCount = await members.countDocuments({
        householdId: auth.householdId,
        isActive: true,
      });

      return {
        _id: auth.household._id.toString(),
        name: auth.household.name,
        slug: auth.household.slug,
        settings: auth.household.settings,
        subscription: auth.household.subscription,
        isOwner: auth.household.ownerId.equals(auth.userId),
        memberCount,
        createdAt: auth.household.createdAt.toISOString(),
      };
    }),

  /**
   * Get household by ID
   */
  get: protectedProcedure
    .input(z.object({ householdId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { householdId } = input;
      const auth = (ctx as unknown as { auth: { userId: ObjectId } }).auth;

      const households = await getHouseholdsCollection();
      const members = await getHouseholdMembersCollection();

      // Verify membership
      const membership = await members.findOne({
        userId: auth.userId,
        householdId: new ObjectId(householdId),
        isActive: true,
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a member of this household',
        });
      }

      const household = await households.findOne({
        _id: new ObjectId(householdId),
        isActive: true,
      });

      if (!household) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Household not found',
        });
      }

      const memberCount = await members.countDocuments({
        householdId: household._id,
        isActive: true,
      });

      return {
        _id: household._id.toString(),
        name: household.name,
        slug: household.slug,
        settings: household.settings,
        subscription: household.subscription,
        isOwner: household.ownerId.equals(auth.userId),
        role: membership.role,
        memberCount,
        createdAt: household.createdAt.toISOString(),
      };
    }),

  /**
   * Update household settings
   */
  update: ownerProcedure
    .input(updateHouseholdSchema)
    .mutation(async ({ input, ctx }) => {
      const { name, settings } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const households = await getHouseholdsCollection();
      const now = new Date();

      const updates: Record<string, unknown> = { updatedAt: now };

      if (name) {
        updates.name = name;
      }

      if (settings) {
        const currentSettings = auth.household!.settings;
        const newSettings: HouseholdSettings = {
          timezone: settings.timezone ?? currentSettings.timezone,
          currency: settings.currency ?? currentSettings.currency,
          temperatureUnit: settings.temperatureUnit ?? currentSettings.temperatureUnit,
          language: settings.language ?? currentSettings.language,
          notifications: {
            email: settings.notifications?.email ?? currentSettings.notifications.email,
            push: settings.notifications?.push ?? currentSettings.notifications.push,
            sms: settings.notifications?.sms ?? currentSettings.notifications.sms,
          },
        };
        updates.settings = newSettings;
      }

      await households.updateOne(
        { _id: auth.householdId },
        { $set: updates }
      );

      // Audit log
      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'household',
        auth.householdId!,
        updates
      );

      return { msg: 'Household updated successfully' };
    }),

  /**
   * Delete household (owner only, soft delete)
   */
  delete: ownerProcedure
    .mutation(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const households = await getHouseholdsCollection();
      const members = await getHouseholdMembersCollection();
      const now = new Date();

      // Soft delete household
      await households.updateOne(
        { _id: auth.householdId },
        { $set: { isActive: false, updatedAt: now } }
      );

      // Deactivate all memberships
      await members.updateMany(
        { householdId: auth.householdId },
        { $set: { isActive: false, updatedAt: now } }
      );

      // Audit log
      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'household',
        auth.householdId!
      );

      return { msg: 'Household deleted successfully' };
    }),

  /**
   * Get household statistics
   */
  stats: householdProcedure
    .query(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const members = await getHouseholdMembersCollection();

      // Member counts by role
      const memberStats = await members.aggregate([
        {
          $match: {
            householdId: auth.householdId,
            isActive: true,
          },
        },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]).toArray();

      const roleCount: Record<string, number> = {
        owner: 0,
        admin: 0,
        member: 0,
        guest: 0,
      };

      memberStats.forEach(stat => {
        roleCount[stat._id as string] = stat.count;
      });

      const totalMembers = Object.values(roleCount).reduce((a, b) => a + b, 0);

      return {
        members: {
          total: totalMembers,
          byRole: roleCount,
        },
      };
    }),

  /**
   * Get available subscription plans
   */
  subscriptionPlans: protectedProcedure
    .query(async () => {
      // Return available subscription tiers
      return [
        {
          tier: 'free',
          name: 'Free',
          price: 0,
          features: [
            'Up to 5 devices',
            'Basic automation',
            '1 household member',
            '7-day history',
          ],
        },
        {
          tier: 'basic',
          name: 'Basic',
          price: 9.99,
          features: [
            'Up to 25 devices',
            'Advanced automation',
            'Up to 5 household members',
            '30-day history',
            'Energy monitoring',
          ],
        },
        {
          tier: 'premium',
          name: 'Premium',
          price: 19.99,
          features: [
            'Unlimited devices',
            'Full automation suite',
            'Unlimited household members',
            '1-year history',
            'Energy & finance tracking',
            'Priority support',
          ],
        },
        {
          tier: 'enterprise',
          name: 'Enterprise',
          price: null, // Contact for pricing
          features: [
            'Everything in Premium',
            'Multiple households',
            'Custom integrations',
            'Dedicated support',
            'SLA guarantee',
          ],
        },
      ];
    }),
});
