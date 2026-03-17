import { describe, expect, it } from 'vitest'

describe('Sanity Check', () => {
  it('should pass basic arithmetic', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle strings', () => {
    expect('hello').toContain('ell')
  })
})
