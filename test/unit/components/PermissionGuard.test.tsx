import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@test/support/utils'
import PermissionGuard from '@/components/PermissionGuard'

// Mock the auth store - control the user role
const mockUseAuthStore = vi.fn()

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: any) => mockUseAuthStore(selector),
  // Re-export types by providing empty objects
}))

describe('PermissionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows children when user has admin role for admin feature', () => {
    mockUseAuthStore.mockImplementation((selector: any) =>
      selector({ user: { id: 1, username: 'admin', role: 'admin' } }),
    )
    render(
      <PermissionGuard feature="admin.users">
        <div>Admin Panel</div>
      </PermissionGuard>,
    )
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
  })

  it('shows children when primary_role is admin even if role is missing', () => {
    mockUseAuthStore.mockImplementation((selector: any) =>
      selector({ user: { id: 1, username: 'admin', primary_role: 'admin' } }),
    )
    render(
      <PermissionGuard feature="admin.system-config">
        <div>System Management</div>
      </PermissionGuard>,
    )
    expect(screen.getByText('System Management')).toBeInTheDocument()
  })

  it('hides children when viewer accesses admin feature', () => {
    mockUseAuthStore.mockImplementation((selector: any) =>
      selector({ user: { id: 2, username: 'viewer', role: 'viewer' } }),
    )
    render(
      <PermissionGuard feature="admin.users">
        <div>Admin Panel</div>
      </PermissionGuard>,
    )
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
  })

  it('shows fallback when unauthorized', () => {
    mockUseAuthStore.mockImplementation((selector: any) =>
      selector({ user: { id: 2, username: 'viewer', role: 'viewer' } }),
    )
    render(
      <PermissionGuard feature="admin.users" fallback={<div>Access Denied</div>}>
        <div>Admin Panel</div>
      </PermissionGuard>,
    )
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
  })

  it('user role can access user-level features', () => {
    mockUseAuthStore.mockImplementation((selector: any) =>
      selector({ user: { id: 3, username: 'user', role: 'user' } }),
    )
    render(
      <PermissionGuard feature="strategy.create">
        <div>Create Strategy</div>
      </PermissionGuard>,
    )
    expect(screen.getByText('Create Strategy')).toBeInTheDocument()
  })

  it('viewer can access viewer-level features', () => {
    mockUseAuthStore.mockImplementation((selector: any) =>
      selector({ user: { id: 4, username: 'viewer', role: 'viewer' } }),
    )
    render(
      <PermissionGuard feature="strategy.view">
        <div>View Strategy</div>
      </PermissionGuard>,
    )
    expect(screen.getByText('View Strategy')).toBeInTheDocument()
  })

  it('denies unknown features by default', () => {
    mockUseAuthStore.mockImplementation((selector: any) =>
      selector({ user: { id: 5, username: 'viewer', role: 'viewer' } }),
    )
    render(
      <PermissionGuard feature="unknown.feature">
        <div>Allowed</div>
      </PermissionGuard>,
    )
    expect(screen.queryByText('Allowed')).not.toBeInTheDocument()
  })
})

