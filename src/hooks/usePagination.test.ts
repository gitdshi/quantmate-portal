import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePagination } from './usePagination'

describe('usePagination hook', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))

  it('returns first page of items by default', () => {
    const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }))
    expect(result.current.page).toBe(1)
    expect(result.current.pageSize).toBe(10)
    expect(result.current.total).toBe(25)
    expect(result.current.totalPages).toBe(3)
    expect(result.current.paginatedItems).toHaveLength(10)
    expect(result.current.paginatedItems[0]).toEqual({ id: 1, name: 'Item 1' })
  })

  it('navigates to next page', () => {
    const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }))
    act(() => result.current.onPageChange(2))
    expect(result.current.page).toBe(2)
    expect(result.current.paginatedItems[0]).toEqual({ id: 11, name: 'Item 11' })
  })

  it('returns partial page for last page', () => {
    const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }))
    act(() => result.current.onPageChange(3))
    expect(result.current.paginatedItems).toHaveLength(5)
    expect(result.current.paginatedItems[0]).toEqual({ id: 21, name: 'Item 21' })
  })

  it('clamps page to valid range', () => {
    const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }))
    act(() => result.current.onPageChange(100))
    expect(result.current.page).toBe(3)
    act(() => result.current.onPageChange(-1))
    expect(result.current.page).toBe(1)
  })

  it('resets to page 1 on page size change', () => {
    const { result } = renderHook(() => usePagination(items, { initialPageSize: 10 }))
    act(() => result.current.onPageChange(2))
    expect(result.current.page).toBe(2)
    act(() => result.current.onPageSizeChange(20))
    expect(result.current.page).toBe(1)
    expect(result.current.pageSize).toBe(20)
    expect(result.current.paginatedItems).toHaveLength(20)
  })

  it('handles empty items', () => {
    const { result } = renderHook(() => usePagination([], { initialPageSize: 10 }))
    expect(result.current.total).toBe(0)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.paginatedItems).toHaveLength(0)
  })

  it('uses default page size of 10', () => {
    const { result } = renderHook(() => usePagination(items))
    expect(result.current.pageSize).toBe(10)
  })
})
