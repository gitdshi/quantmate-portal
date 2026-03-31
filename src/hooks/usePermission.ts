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

const FEATURE_PERMISSIONS: Record<string, { role: UserRole; permission: string }> = {
  'admin.users': { role: 'admin', permission: 'account.manage' },
  'admin.system-config': { role: 'admin', permission: 'system.manage' },
  'admin.audit-logs': { role: 'admin', permission: 'system.manage' },
  'admin.data-sync': { role: 'admin', permission: 'system.manage' },
  'strategy.create': { role: 'user', permission: 'strategies.write' },
  'strategy.edit': { role: 'user', permission: 'strategies.write' },
  'strategy.delete': { role: 'user', permission: 'strategies.write' },
  'backtest.run': { role: 'user', permission: 'backtests.write' },
  'trading.execute': { role: 'user', permission: 'trading.write' },
  'portfolio.manage': { role: 'user', permission: 'portfolios.write' },
  'team.create': { role: 'user', permission: 'teams.write' },
  'ai.chat': { role: 'user', permission: 'account.read' },
  'factor.create': { role: 'user', permission: 'data.write' },
  'template.publish': { role: 'user', permission: 'templates.write' },
  'strategy.view': { role: 'viewer', permission: 'strategies.read' },
  'backtest.view': { role: 'viewer', permission: 'backtests.read' },
  'portfolio.view': { role: 'viewer', permission: 'portfolios.read' },
  'reports.view': { role: 'viewer', permission: 'reports.read' },
  'marketplace.browse': { role: 'viewer', permission: 'templates.read' },
}

function resolveRole(role?: UserRole, primaryRole?: string): UserRole {
  if (role) return role
  if (primaryRole === 'admin') return 'admin'
  if (primaryRole === 'viewer') return 'viewer'
  return 'user'
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
  const role: UserRole = resolveRole(user?.role, user?.primary_role)
  const permissions = new Set(user?.permissions ?? [])

  function hasPermission(permission: string): boolean {
    if (!permission) return false
    if (permissions.size === 0) return false
    if (permissions.has(permission)) return true
    const [resource] = permission.split('.')
    return permissions.has(`${resource}.manage`)
  }

  function can(feature: string): boolean {
    const requirement = FEATURE_PERMISSIONS[feature]
    if (!requirement) return false
    if (permissions.size > 0) {
      return hasPermission(requirement.permission)
    }
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requirement.role]
  }

  function isAdmin(): boolean {
    return role === 'admin' || hasPermission('account.manage')
  }

  return { can, hasPermission, isAdmin, role }
}
