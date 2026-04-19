export interface CatalogItemLike {
  id?: number | null
  item_key: string
  display_name?: string | null
  api_name?: string | null
  category?: string | null
  sub_category?: string | null
  sync_priority?: number | null
}

export function requiresExplicitPermission(value: string | null | undefined): boolean {
  return ['1', 'true', 'yes', 'paid'].includes(normalizeCatalogValue(value).toLowerCase())
}

interface TushareCatalogOrder {
  categories: string[]
  subcategories: Record<string, string[]>
  apis: string[]
}

const EMPTY_TUSHARE_CATALOG_ORDER: TushareCatalogOrder = {
  categories: [],
  subcategories: {},
  apis: [],
}

const TUSHARE_CATALOG_ORDER: TushareCatalogOrder =
  typeof __TUSHARE_CATALOG_ORDER__ === 'undefined'
    ? EMPTY_TUSHARE_CATALOG_ORDER
    : __TUSHARE_CATALOG_ORDER__

function normalizeCatalogValue(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/^\ufeff/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function compareNullableNumbers(left?: number | null, right?: number | null): number {
  const safeLeft = typeof left === 'number' ? left : Number.MAX_SAFE_INTEGER
  const safeRight = typeof right === 'number' ? right : Number.MAX_SAFE_INTEGER
  return safeLeft - safeRight
}

const categoryOrder = new Map(
  TUSHARE_CATALOG_ORDER.categories.map((category, index) => [normalizeCatalogValue(category), index])
)

const subCategoryOrder = new Map(
  Object.entries(TUSHARE_CATALOG_ORDER.subcategories).map(([category, subcategories]) => [
    normalizeCatalogValue(category),
    new Map(subcategories.map((subcategory, index) => [normalizeCatalogValue(subcategory), index])),
  ])
)

const apiOrder = new Map(
  TUSHARE_CATALOG_ORDER.apis.map((apiName, index) => [normalizeCatalogValue(apiName), index])
)

function getOrderValue(orderMap: Map<string, number>, value: string): number {
  return orderMap.get(value) ?? Number.MAX_SAFE_INTEGER
}

export function formatPermissionLabel(
  permission: number | string | null | undefined,
  requiresPermission?: string | null | undefined
): string | null {
  if (requiresExplicitPermission(requiresPermission)) {
    return '单独权限'
  }

  if (typeof permission === 'number') {
    return permission > 0 ? `${permission}积分` : null
  }

  const normalized = normalizeCatalogValue(permission)
  if (!normalized) {
    return null
  }

  const matched = normalized.match(/\d+/)
  if (!matched) {
    return null
  }
  return `${Number(matched[0])}积分`
}

export function sortCatalogItems<T extends CatalogItemLike>(source: string, items: T[]): T[] {
  const sorted = [...items]

  sorted.sort((left, right) => {
    if (source === 'tushare') {
      const leftCategory = normalizeCatalogValue(left.category)
      const rightCategory = normalizeCatalogValue(right.category)
      const categoryDelta =
        getOrderValue(categoryOrder, leftCategory) - getOrderValue(categoryOrder, rightCategory)
      if (categoryDelta !== 0) {
        return categoryDelta
      }

      const leftSubCategory = normalizeCatalogValue(left.sub_category)
      const rightSubCategory = normalizeCatalogValue(right.sub_category)
      const leftSubMap = subCategoryOrder.get(leftCategory) ?? new Map<string, number>()
      const rightSubMap = subCategoryOrder.get(rightCategory) ?? new Map<string, number>()
      const subCategoryDelta =
        getOrderValue(leftSubMap, leftSubCategory) - getOrderValue(rightSubMap, rightSubCategory)
      if (subCategoryDelta !== 0) {
        return subCategoryDelta
      }

      const leftApiName = normalizeCatalogValue(left.api_name || left.item_key)
      const rightApiName = normalizeCatalogValue(right.api_name || right.item_key)
      const apiDelta = getOrderValue(apiOrder, leftApiName) - getOrderValue(apiOrder, rightApiName)
      if (apiDelta !== 0) {
        return apiDelta
      }
    }

    const priorityDelta = compareNullableNumbers(left.sync_priority, right.sync_priority)
    if (priorityDelta !== 0) {
      return priorityDelta
    }

    const idDelta = compareNullableNumbers(left.id, right.id)
    if (idDelta !== 0) {
      return idDelta
    }

    return normalizeCatalogValue(left.display_name || left.item_key).localeCompare(
      normalizeCatalogValue(right.display_name || right.item_key),
      'zh-Hans-CN'
    )
  })

  return sorted
}