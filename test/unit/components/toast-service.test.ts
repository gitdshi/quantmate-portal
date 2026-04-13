/**
 * Toast-service unit tests — covers all exported functions
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Reset module state between tests by re-importing
let toastService: typeof import('@/components/ui/toast-service')

beforeEach(async () => {
  vi.useFakeTimers()
  // Dynamic import to get fresh module state would be ideal,
  // but since module state persists, we just work with it.
  toastService = await import('@/components/ui/toast-service')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toast-service', () => {
  describe('showToast', () => {
    it('notifies listeners with new toast', () => {
      const listener = vi.fn()
      toastService.subscribeToToasts(listener)
      toastService.showToast('Hello', 'success')
      expect(listener).toHaveBeenCalled()
      const items = listener.mock.calls[listener.mock.calls.length - 1][0]
      expect(items.some((t: any) => t.message === 'Hello' && t.type === 'success')).toBe(true)
    })

    it('defaults to info type', () => {
      const listener = vi.fn()
      toastService.subscribeToToasts(listener)
      toastService.showToast('Info toast')
      const items = listener.mock.calls[listener.mock.calls.length - 1][0]
      expect(items.some((t: any) => t.type === 'info')).toBe(true)
    })

    it('auto-dismisses after 3500ms', () => {
      const listener = vi.fn()
      toastService.subscribeToToasts(listener)
      toastService.showToast('Temp', 'error')

      // Get the toast count after adding
      const afterAdd = listener.mock.calls[listener.mock.calls.length - 1][0]
      const count = afterAdd.length

      vi.advanceTimersByTime(3500)

      const afterTimeout = listener.mock.calls[listener.mock.calls.length - 1][0]
      expect(afterTimeout.length).toBeLessThan(count)
    })
  })

  describe('dismissToast', () => {
    it('removes toast by id', () => {
      const listener = vi.fn()
      toastService.subscribeToToasts(listener)
      toastService.showToast('A', 'info')

      const items = listener.mock.calls[listener.mock.calls.length - 1][0]
      const id = items[items.length - 1].id

      toastService.dismissToast(id)
      const after = listener.mock.calls[listener.mock.calls.length - 1][0]
      expect(after.some((t: any) => t.id === id)).toBe(false)
    })
  })

  describe('subscribeToToasts', () => {
    it('returns unsubscribe function', () => {
      const listener = vi.fn()
      const unsub = toastService.subscribeToToasts(listener)
      unsub()
      toastService.showToast('After unsub', 'info')
      // listener should not be called after unsubscribe for the new toast
      // (it may have been called before unsub for previous tests)
      const callCountBefore = listener.mock.calls.length
      toastService.showToast('Another', 'info')
      expect(listener.mock.calls.length).toBe(callCountBefore)
    })
  })

  describe('showConfirm / closeConfirm', () => {
    it('resolves with true when confirmed', async () => {
      const promise = toastService.showConfirm('Title', 'Are you sure?')
      toastService.closeConfirm(true)
      const result = await promise
      expect(result).toBe(true)
    })

    it('resolves with false when cancelled', async () => {
      const promise = toastService.showConfirm('Title', 'Cancel?')
      toastService.closeConfirm(false)
      const result = await promise
      expect(result).toBe(false)
    })

    it('notifies confirm listeners', () => {
      const listener = vi.fn()
      toastService.subscribeToConfirm(listener)
      toastService.showConfirm('T', 'M')
      expect(listener).toHaveBeenCalled()
      const state = listener.mock.calls[listener.mock.calls.length - 1][0]
      expect(state.open).toBe(true)
      expect(state.title).toBe('T')
      expect(state.message).toBe('M')
    })
  })

  describe('subscribeToConfirm', () => {
    it('returns unsubscribe function', () => {
      const listener = vi.fn()
      const unsub = toastService.subscribeToConfirm(listener)
      toastService.showConfirm('T1', 'M1')
      const callCount = listener.mock.calls.length
      unsub()
      toastService.showConfirm('T2', 'M2')
      expect(listener.mock.calls.length).toBe(callCount)
    })
  })

  describe('getConfirmState', () => {
    it('returns current state after closeConfirm', () => {
      toastService.showConfirm('T', 'M')
      toastService.closeConfirm(true)
      const state = toastService.getConfirmState()
      expect(state.open).toBe(false)
    })
  })

  describe('closeConfirm without resolve', () => {
    it('handles closeConfirm when no pending confirm', () => {
      // Should not throw
      toastService.closeConfirm(true)
      const state = toastService.getConfirmState()
      expect(state.open).toBe(false)
    })
  })
})
