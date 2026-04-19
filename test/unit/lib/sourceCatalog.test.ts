import { describe, expect, it, vi } from 'vitest'

describe('sourceCatalog', () => {
  it('falls back to an empty injected order in test environments', async () => {
    vi.resetModules()

    const { sortCatalogItems } = await import('@/lib/sourceCatalog')

    const result = sortCatalogItems('tushare', [
      { item_key: 'z_api', display_name: 'Z Api', sync_priority: 2 },
      { item_key: 'a_api', display_name: 'A Api', sync_priority: 1 },
    ])

    expect(result.map((item) => item.item_key)).toEqual(['a_api', 'z_api'])
  })
})