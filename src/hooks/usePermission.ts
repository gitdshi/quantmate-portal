import { useAuthStore, type UserRole } from '../stores/auth'

/**
 * Permission map: defines which roles are allowed for each feature.
 * Roles are ordered: admin > user > viewer.
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  user: 2,
  viewer: 1,
}

const FEATURE_PERMISSIONS: Record<string, UserRole> = {
  // Admin-only features
  'admin.users': 'admin',
  'admin.system-config': 'admin',
  'admin.audit-logs': 'admin',
  'admin.data-sync': 'admin',
  // Regular user features
  'strategy.create': 'user',
  'strategy.edit': 'user',
  'strategy.delete': 'user',
  'backtest.run': 'user',
  'trading.execute': 'user',
  'portfolio.manage': 'user',
  'team.create': 'user',
  'ai.chat': 'user',
  'factor.create': 'user',
  'template.publish': 'user',
  // Viewer features (read-only)
  'strategy.view': 'viewer',
  'backtest.view': 'viewer',
  'portfolio.view': 'viewer',
  'reports.view': 'viewer',
  'marketplace.browse': 'viewer',
}

/**
 * Hook to check if the current user has permission for a feature.
 *
 * Usage:
 *   const { can, role } = usePermission()
 *   if (can('strategy.create')) { ... }
 */
export function usePermission() {
  const user = useAuthStore((s) => s.user)
  const role: UserRole = user?.role ?? 'user'

  function can(feature: string): boolean {
    const required = FEATURE_PERMISSIONS[feature]
    if (!required) return true // unknown feature = allow
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[required]
  }

  function isAdmin(): boolean {
    return role === 'admin'
  }

  return { can, isAdmin, role }
}
