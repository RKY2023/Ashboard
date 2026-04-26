import { Permission, UserRole, ROLE_PERMISSIONS } from '@/src/types';

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if a user has all of the required permissions
 */
export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every(p => userPermissions.includes(p));
}

/**
 * Check if a user has any of the required permissions
 */
export function hasAnyPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some(p => userPermissions.includes(p));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Merge role permissions with custom permissions
 */
export function mergePermissions(
  role: UserRole,
  customPermissions: Permission[] = []
): Permission[] {
  const rolePermissions = getPermissionsForRole(role);
  const allPermissions = new Set([...rolePermissions, ...customPermissions]);
  return Array.from(allPermissions);
}

/**
 * Check if a role can manage another role
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    guest: 1,
  };

  return hierarchy[managerRole] > hierarchy[targetRole];
}

/**
 * Get role from permissions (for display purposes)
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Member',
    guest: 'Guest',
  };
  return names[role] || 'Unknown';
}

/**
 * Permission groups for UI organization
 */
export const PERMISSION_GROUPS: Record<string, { label: string; permissions: Permission[] }> = {
  devices: {
    label: 'Devices',
    permissions: ['devices:read', 'devices:write', 'devices:control', 'devices:delete'],
  },
  automation: {
    label: 'Automations',
    permissions: ['automation:read', 'automation:write', 'automation:delete', 'automation:execute'],
  },
  security: {
    label: 'Security',
    permissions: ['security:read', 'security:arm', 'security:disarm', 'security:manage'],
  },
  energy: {
    label: 'Energy',
    permissions: ['energy:read', 'energy:manage'],
  },
  climate: {
    label: 'Climate',
    permissions: ['climate:read', 'climate:write'],
  },
  notifications: {
    label: 'Notifications',
    permissions: ['notifications:read', 'notifications:manage'],
  },
  grocery: {
    label: 'Grocery',
    permissions: ['grocery:read', 'grocery:write', 'grocery:delete'],
  },
  recipes: {
    label: 'Recipes',
    permissions: ['recipes:read', 'recipes:write', 'recipes:delete'],
  },
  finance: {
    label: 'Finance',
    permissions: ['finance:read', 'finance:write', 'finance:delete', 'finance:reports'],
  },
  users: {
    label: 'Users',
    permissions: ['users:read', 'users:invite', 'users:manage'],
  },
  settings: {
    label: 'Settings',
    permissions: ['settings:read', 'settings:write'],
  },
  reports: {
    label: 'Reports',
    permissions: ['reports:read', 'reports:export'],
  },
};

/**
 * Get human-readable permission name
 */
export function getPermissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    'devices:read': 'View devices',
    'devices:write': 'Edit devices',
    'devices:control': 'Control devices',
    'devices:delete': 'Delete devices',
    'automation:read': 'View automations',
    'automation:write': 'Edit automations',
    'automation:delete': 'Delete automations',
    'automation:execute': 'Run automations',
    'security:read': 'View security',
    'security:arm': 'Arm security',
    'security:disarm': 'Disarm security',
    'security:manage': 'Manage security',
    'energy:read': 'View energy',
    'energy:manage': 'Manage energy',
    'climate:read': 'View climate',
    'climate:write': 'Manage climate',
    'notifications:read': 'View notifications',
    'notifications:manage': 'Manage notifications',
    'grocery:read': 'View grocery',
    'grocery:write': 'Edit grocery',
    'grocery:delete': 'Delete grocery',
    'recipes:read': 'View recipes',
    'recipes:write': 'Edit recipes',
    'recipes:delete': 'Delete recipes',
    'finance:read': 'View finance',
    'finance:write': 'Edit finance',
    'finance:delete': 'Delete finance',
    'finance:reports': 'Financial reports',
    'users:read': 'View users',
    'users:invite': 'Invite users',
    'users:manage': 'Manage users',
    'settings:read': 'View settings',
    'settings:write': 'Edit settings',
    'reports:read': 'View reports',
    'reports:export': 'Export reports',
  };
  return labels[permission] || permission;
}
