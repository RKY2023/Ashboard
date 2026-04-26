import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import {
  householdProcedure,
  ownerProcedure,
  withPermission,
} from '@/server/trpc/middleware/auth';
import {
  getUsersCollection,
  getHouseholdMembersCollection,
  getNotificationsCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { canManageRole, getPermissionsForRole } from '@/src/lib/auth';
import { UserRole, Permission, ROLE_PERMISSIONS, AuthContext } from '@/src/types';

// Schemas
const listUsersSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  role: z.enum(['owner', 'admin', 'member', 'guest']).optional(),
  search: z.string().optional(),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'guest']),
  permissions: z.array(z.string()).optional(),
});

const updateMemberSchema = z.object({
  memberId: z.string(),
  role: z.enum(['admin', 'member', 'guest']).optional(),
  permissions: z.array(z.string()).optional(),
});

const removeMemberSchema = z.object({
  memberId: z.string(),
});

export const usersRouter = router({
  /**
   * List all members of the current household
   */
  list: withPermission('users:read')
    .input(listUsersSchema)
    .query(async ({ input, ctx }) => {
      const { page, pageSize, role, search } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const members = await getHouseholdMembersCollection();
      const users = await getUsersCollection();

      // Build query
      const query: Record<string, unknown> = {
        householdId: auth.householdId,
        isActive: true,
      };

      if (role) {
        query.role = role;
      }

      // Get members with pagination
      const skip = (page - 1) * pageSize;
      const [membersList, total] = await Promise.all([
        members.find(query).skip(skip).limit(pageSize).toArray(),
        members.countDocuments(query),
      ]);

      // Get user details
      const userIds = membersList.map(m => m.userId);
      const usersList = await users.find({
        _id: { $in: userIds },
        isActive: true,
      }).toArray();

      // Create user map for quick lookup
      const userMap = new Map(usersList.map(u => [u._id.toString(), u]));

      // Filter by search if provided
      let results = membersList.map(m => {
        const user = userMap.get(m.userId.toString());
        return {
          _id: m._id.toString(),
          userId: m.userId.toString(),
          name: user?.name || 'Unknown',
          email: user?.email || '',
          avatar: user?.avatar,
          role: m.role,
          permissions: m.permissions,
          joinedAt: m.joinedAt.toISOString(),
        };
      });

      if (search) {
        const searchLower = search.toLowerCase();
        results = results.filter(r =>
          r.name.toLowerCase().includes(searchLower) ||
          r.email.toLowerCase().includes(searchLower)
        );
      }

      return {
        items: results,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  /**
   * Get a specific member's details
   */
  get: withPermission('users:read')
    .input(z.object({ memberId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { memberId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const members = await getHouseholdMembersCollection();
      const users = await getUsersCollection();

      const member = await members.findOne({
        _id: new ObjectId(memberId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      const user = await users.findOne({ _id: member.userId });

      return {
        _id: member._id.toString(),
        userId: member.userId.toString(),
        name: user?.name || 'Unknown',
        email: user?.email || '',
        avatar: user?.avatar,
        phone: user?.phone,
        role: member.role,
        permissions: member.permissions,
        joinedAt: member.joinedAt.toISOString(),
        invitedBy: member.invitedBy.toString(),
      };
    }),

  /**
   * Invite a new user to the household
   */
  invite: withPermission('users:invite')
    .input(inviteUserSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, role, permissions: customPermissions } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      // Check if current user can assign this role
      if (!canManageRole(auth.role!, role as UserRole)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot assign a role equal to or higher than your own',
        });
      }

      const users = await getUsersCollection();
      const members = await getHouseholdMembersCollection();

      // Check if user exists
      let user = await users.findOne({ email });
      let isNewUser = false;

      if (!user) {
        // Create a placeholder user that will be completed on registration
        isNewUser = true;
        const now = new Date();
        const result = await users.insertOne({
          email,
          name: email.split('@')[0],
          passwordHash: '', // Empty - user will set on registration
          isEmailVerified: false,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        } as never);
        user = { _id: result.insertedId, email, name: email.split('@')[0] } as never;
      }

      // Check if already a member
      const existingMember = await members.findOne({
        userId: user._id,
        householdId: auth.householdId,
      });

      if (existingMember) {
        if (existingMember.isActive) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User is already a member of this household',
          });
        } else {
          // Reactivate membership
          const rolePermissions = getPermissionsForRole(role as UserRole);
          const allPermissions = [...new Set([...rolePermissions, ...(customPermissions || [])])] as Permission[];

          await members.updateOne(
            { _id: existingMember._id },
            {
              $set: {
                role,
                permissions: allPermissions,
                isActive: true,
                invitedBy: auth.userId,
                joinedAt: new Date(),
                updatedAt: new Date(),
              },
            }
          );

          return {
            msg: 'User membership reactivated',
            memberId: existingMember._id.toString(),
          };
        }
      }

      // Create membership
      const rolePermissions = getPermissionsForRole(role as UserRole);
      const allPermissions = [...new Set([...rolePermissions, ...(customPermissions || [])])];
      const now = new Date();

      const result = await members.insertOne({
        userId: user._id,
        householdId: auth.householdId,
        role,
        permissions: allPermissions,
        invitedBy: auth.userId,
        joinedAt: now,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as never);

      // Create notification for the invited user
      const notifications = await getNotificationsCollection();
      await notifications.insertOne({
        userId: user._id,
        householdId: auth.householdId,
        type: 'info',
        title: 'Household Invitation',
        message: `You have been invited to join ${auth.household?.name}`,
        resourceType: 'household',
        resourceId: auth.householdId,
        isRead: false,
        channels: ['app', 'email'],
        createdAt: now,
        updatedAt: now,
      } as never);

      // Audit log
      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'user',
        result.insertedId,
        { email, role, isNewUser }
      );

      return {
        msg: isNewUser
          ? 'Invitation sent - user will need to create an account'
          : 'User added to household',
        memberId: result.insertedId.toString(),
      };
    }),

  /**
   * Update a member's role or permissions
   */
  update: withPermission('users:manage')
    .input(updateMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const { memberId, role, permissions: customPermissions } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const members = await getHouseholdMembersCollection();

      const member = await members.findOne({
        _id: new ObjectId(memberId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      // Cannot modify owner
      if (member.role === 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify owner permissions',
        });
      }

      // Check if current user can manage this member's role
      if (!canManageRole(auth.role!, member.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot manage a user with equal or higher role',
        });
      }

      // If changing role, verify permission
      if (role && !canManageRole(auth.role!, role as UserRole)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot assign a role equal to or higher than your own',
        });
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (role) {
        updates.role = role;
        const rolePermissions = getPermissionsForRole(role as UserRole);
        updates.permissions = [...new Set([...rolePermissions, ...(customPermissions || [])])];
      } else if (customPermissions) {
        const rolePermissions = getPermissionsForRole(member.role);
        updates.permissions = [...new Set([...rolePermissions, ...customPermissions])];
      }

      await members.updateOne(
        { _id: member._id },
        { $set: updates }
      );

      // Audit log
      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'user',
        member._id,
        updates
      );

      return { msg: 'Member updated successfully' };
    }),

  /**
   * Remove a member from the household
   */
  remove: withPermission('users:manage')
    .input(removeMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const { memberId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const members = await getHouseholdMembersCollection();

      const member = await members.findOne({
        _id: new ObjectId(memberId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      // Cannot remove owner
      if (member.role === 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove household owner',
        });
      }

      // Cannot remove self
      if (member.userId.equals(auth.userId)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove yourself - use leave household instead',
        });
      }

      // Check if current user can manage this member
      if (!canManageRole(auth.role!, member.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove a user with equal or higher role',
        });
      }

      // Soft delete
      await members.updateOne(
        { _id: member._id },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      // Audit log
      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'user',
        member._id
      );

      return { msg: 'Member removed from household' };
    }),

  /**
   * Leave the current household
   */
  leave: householdProcedure
    .mutation(async ({ ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const members = await getHouseholdMembersCollection();

      const member = await members.findOne({
        userId: auth.userId,
        householdId: auth.householdId,
        isActive: true,
      });

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Membership not found',
        });
      }

      // Owner cannot leave - must transfer ownership first
      if (member.role === 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Owner cannot leave household - transfer ownership first',
        });
      }

      // Soft delete membership
      await members.updateOne(
        { _id: member._id },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      // Audit log
      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'user',
        auth.userId
      );

      return { msg: 'Left household successfully' };
    }),

  /**
   * Transfer household ownership
   */
  transferOwnership: ownerProcedure
    .input(z.object({ newOwnerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { newOwnerId } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;

      const members = await getHouseholdMembersCollection();
      const households = await getHouseholdsCollection();

      // Verify new owner is a member
      const newOwnerMember = await members.findOne({
        userId: new ObjectId(newOwnerId),
        householdId: auth.householdId,
        isActive: true,
      });

      if (!newOwnerMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User is not a member of this household',
        });
      }

      const now = new Date();

      // Update new owner to owner role
      await members.updateOne(
        { _id: newOwnerMember._id },
        {
          $set: {
            role: 'owner',
            permissions: ROLE_PERMISSIONS.owner,
            updatedAt: now,
          },
        }
      );

      // Demote current owner to admin
      await members.updateOne(
        { userId: auth.userId, householdId: auth.householdId },
        {
          $set: {
            role: 'admin',
            permissions: ROLE_PERMISSIONS.admin,
            updatedAt: now,
          },
        }
      );

      // Update household owner
      await households.updateOne(
        { _id: auth.householdId },
        { $set: { ownerId: new ObjectId(newOwnerId), updatedAt: now } }
      );

      return { msg: 'Ownership transferred successfully' };
    }),

  /**
   * Get available roles and permissions
   */
  getRolesAndPermissions: householdProcedure
    .query(async () => {
      const roles: { role: UserRole; label: string; permissions: Permission[] }[] = [
        { role: 'admin', label: 'Administrator', permissions: ROLE_PERMISSIONS.admin },
        { role: 'member', label: 'Member', permissions: ROLE_PERMISSIONS.member },
        { role: 'guest', label: 'Guest', permissions: ROLE_PERMISSIONS.guest },
      ];

      return { roles };
    }),
});

// Import for households
import { getHouseholdsCollection } from '@/src/lib/db';
