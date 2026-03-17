import { type ReactNode } from 'react'
import { usePermission } from '../hooks/usePermission'

interface PermissionGuardProps {
  /** Feature key to check, e.g. 'admin.users' or 'strategy.create'. */
  feature: string
  /** Content to render if the user has permission. */
  children: ReactNode
  /** Optional fallback for unauthorized users. Defaults to nothing. */
  fallback?: ReactNode
}

/**
 * Conditionally renders children based on the user's role/permission.
 *
 * Usage:
 *   <PermissionGuard feature="admin.system-config">
 *     <AdminPanel />
 *   </PermissionGuard>
 */
export default function PermissionGuard({ feature, children, fallback = null }: PermissionGuardProps) {
  const { can } = usePermission()

  if (!can(feature)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
