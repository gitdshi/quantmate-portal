import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock auth store
const mockUser = {
  role: undefined as string | undefined,
  primary_role: undefined as string | undefined,
  permissions: [] as string[],
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (s: any) => any) => selector({ user: mockUser }),
}))

import { usePermission } from '@/hooks/usePermission'

describe('usePermission', () => {
  beforeEach(() => {
    mockUser.role = undefined
    mockUser.primary_role = undefined
    mockUser.permissions = []
  })

  // ─── resolveRole fallback ───────────────────────────────
  it('resolves role from primary_role when role is undefined', () => {
    mockUser.primary_role = 'admin'
    const { result } = renderHook(() => usePermission())
    expect(result.current.role).toBe('admin')
  })

  it('resolves to viewer from primary_role', () => {
    mockUser.primary_role = 'viewer'
    const { result } = renderHook(() => usePermission())
    expect(result.current.role).toBe('viewer')
  })

  it('defaults to user when no role or primary_role', () => {
    const { result } = renderHook(() => usePermission())
    expect(result.current.role).toBe('user')
  })

  it('uses explicit role over primary_role', () => {
    mockUser.role = 'admin'
    mockUser.primary_role = 'viewer'
    const { result } = renderHook(() => usePermission())
    expect(result.current.role).toBe('admin')
  })

  // ─── isAdmin ────────────────────────────────────────────
  it('isAdmin returns true for admin role', () => {
    mockUser.role = 'admin'
    const { result } = renderHook(() => usePermission())
    expect(result.current.isAdmin()).toBe(true)
  })

  it('isAdmin returns true for non-admin with account.manage permission', () => {
    mockUser.role = 'user'
    mockUser.permissions = ['account.manage']
    const { result } = renderHook(() => usePermission())
    expect(result.current.isAdmin()).toBe(true)
  })

  it('isAdmin returns false for regular user', () => {
    mockUser.role = 'user'
    mockUser.permissions = ['strategies.read']
    const { result } = renderHook(() => usePermission())
    expect(result.current.isAdmin()).toBe(false)
  })

  // ─── hasPermission ─────────────────────────────────────
  it('returns true for exact permission match', () => {
    mockUser.permissions = ['strategies.write']
    const { result } = renderHook(() => usePermission())
    expect(result.current.hasPermission('strategies.write')).toBe(true)
  })

  it('returns true for resource.manage wildcard', () => {
    mockUser.permissions = ['strategies.manage']
    const { result } = renderHook(() => usePermission())
    expect(result.current.hasPermission('strategies.write')).toBe(true)
  })

  it('returns false for empty permissions', () => {
    mockUser.permissions = []
    const { result } = renderHook(() => usePermission())
    expect(result.current.hasPermission('strategies.read')).toBe(false)
  })

  it('returns false for empty string permission', () => {
    mockUser.permissions = ['strategies.read']
    const { result } = renderHook(() => usePermission())
    expect(result.current.hasPermission('')).toBe(false)
  })

  // ─── can with permissions ───────────────────────────────
  it('can returns true when user has required permission', () => {
    mockUser.role = 'user'
    mockUser.permissions = ['strategies.write']
    const { result } = renderHook(() => usePermission())
    expect(result.current.can('strategy.create')).toBe(true)
  })

  it('can returns false for unregistered feature', () => {
    mockUser.role = 'admin'
    const { result } = renderHook(() => usePermission())
    expect(result.current.can('nonexistent.feature')).toBe(false)
  })

  // ─── can with role hierarchy fallback ───────────────────
  it('can falls back to role hierarchy when no permissions', () => {
    mockUser.role = 'admin'
    mockUser.permissions = []
    const { result } = renderHook(() => usePermission())
    expect(result.current.can('strategy.create')).toBe(true)
  })

  it('viewer cannot create strategies via role hierarchy', () => {
    mockUser.role = 'viewer'
    mockUser.permissions = []
    const { result } = renderHook(() => usePermission())
    expect(result.current.can('strategy.create')).toBe(false)
  })

  it('viewer can view strategies via role hierarchy', () => {
    mockUser.role = 'viewer'
    mockUser.permissions = []
    const { result } = renderHook(() => usePermission())
    expect(result.current.can('strategy.view')).toBe(true)
  })
})
