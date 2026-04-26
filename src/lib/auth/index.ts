// JWT utilities
export {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  isTokenExpiringSoon,
  type TokenPayload,
  type TokenPair,
} from './jwt';

// Permission utilities
export {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
  mergePermissions,
  canManageRole,
  getRoleDisplayName,
  getPermissionLabel,
  PERMISSION_GROUPS,
} from './permissions';

// Re-export AuthProvider and useAuth for client components
// Note: These are client-only exports
export { AuthProvider, useAuth } from './AuthProvider';
