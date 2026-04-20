import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { dataSourceAPI } from '../lib/api'
import { formatPermissionLabel, requiresExplicitPermission, sortCatalogItems } from '../lib/sourceCatalog'
import ToggleSwitch from './ui/ToggleSwitch'
import { showToast } from './ui/toast-service'

interface SourceCatalogTabProps {
  source: string
  sourceName: string
  titleKey: string
  defaultTitle: string
  descriptionKey: string
  defaultDescription: string
  loadingKey: string
  defaultLoading: string
  fallbackCategoryLabel: string
}

interface SourceConfig {
  source_key: string
  display_name: string
  enabled: number
}

interface SourceCatalogItem {
  id: number
  source: string
  item_key: string
  display_name: string
  enabled: number
  description: string | null
  category: string | null
  sub_category: string | null
  api_name: string | null
  permission_points: number | null
  rate_limit_note: string | null
  requires_permission: string | null
  sync_priority: number
  sync_supported: boolean
}

interface SubGroup {
  subCategory: string
  items: SourceCatalogItem[]
}

interface CategoryGroup {
  category: string
  subs: SubGroup[]
  totalEnabled: number
  totalCount: number
}

interface PermissionGroup {
  label: string
  permissionPoints: number
  items: SourceCatalogItem[]
}

interface SyncRebuildResponse {
  pending_records?: number
  items_reconciled?: number
  backfill_jobs?: Array<{ source: string; item_key: string; job_id: string }>
}

function hasVisiblePermissionLabel(value: string | null | undefined): boolean {
  return Boolean(value)
}

function permBadgeClass(perm: string | null | undefined): string {
  if (!perm) return 'bg-muted text-muted-foreground'
  if (perm.includes('120')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  if (perm.includes('2000')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  if (perm.includes('5000')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  if (perm.includes('单独')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  return 'bg-muted text-muted-foreground'
}

function permissionSortValue(label: string): [number, string] {
  const matched = label.match(/\d+/)
  return [matched ? Number(matched[0]) : Number.MAX_SAFE_INTEGER, label]
}

function buildTree(
  items: SourceCatalogItem[],
  fallbackCategoryLabel: string,
  fallbackSubCategoryLabel: string
): CategoryGroup[] {
  const categoryMap = new Map<string, Map<string, SourceCatalogItem[]>>()

  for (const item of items) {
    const category = item.category?.trim() || fallbackCategoryLabel
    const subCategory = item.sub_category?.trim() || fallbackSubCategoryLabel

    if (!categoryMap.has(category)) {
      categoryMap.set(category, new Map())
    }

    const subMap = categoryMap.get(category)!
    if (!subMap.has(subCategory)) {
      subMap.set(subCategory, [])
    }
    subMap.get(subCategory)!.push(item)
  }

  return Array.from(categoryMap.entries()).map(([category, subMap]) => {
    const subs = Array.from(subMap.entries()).map(([subCategory, subItems]) => ({
      subCategory,
      items: subItems,
    }))

    const totalCount = subs.reduce((sum, sub) => sum + sub.items.length, 0)
    const totalEnabled = subs.reduce(
      (sum, sub) => sum + sub.items.filter((item) => Boolean(item.enabled)).length,
      0
    )

    return { category, subs, totalEnabled, totalCount }
  })
}

function buildBatchItems(items: SourceCatalogItem[], enabled: boolean) {
  return items
    .filter((item) => !requiresExplicitPermission(item.requires_permission))
    .filter((item) => (enabled ? item.sync_supported : true))
    .filter((item) => Boolean(item.enabled) !== enabled)
    .map((item) => ({ source: item.source, item_key: item.item_key, enabled }))
}

export default function SourceCatalogTab({
  source,
  sourceName,
  titleKey,
  defaultTitle,
  descriptionKey,
  defaultDescription,
  loadingKey,
  defaultLoading,
  fallbackCategoryLabel,
}: SourceCatalogTabProps) {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const { data: configs = [] } = useQuery<SourceConfig[]>({
    queryKey: ['ds-configs'],
    queryFn: () =>
      dataSourceAPI
        .listConfigs()
        .then((response) => (response.data as { data: SourceConfig[] }).data ?? []),
  })

  const { data: items = [], isLoading } = useQuery<SourceCatalogItem[]>({
    queryKey: ['source-catalog-items', source],
    queryFn: () =>
      dataSourceAPI
        .listItems({ source })
        .then((response) => (response.data as { data: SourceCatalogItem[] }).data ?? []),
  })

  const config = configs.find((entry) => entry.source_key === source)
  const sourceLabel = config?.display_name || sourceName
  const sortedItems = useMemo(() => sortCatalogItems(source, items), [items, source])
  const enabledCount = useMemo(
    () => sortedItems.filter((item) => Boolean(item.enabled)).length,
    [sortedItems]
  )
  const tree = useMemo(
    () => buildTree(sortedItems, fallbackCategoryLabel, t('catalog.general', '通用')),
    [fallbackCategoryLabel, sortedItems, t]
  )

  const permissionGroups = useMemo<PermissionGroup[]>(() => {
    const groups = new Map<string, SourceCatalogItem[]>()

    for (const item of sortedItems) {
      if (requiresExplicitPermission(item.requires_permission)) {
        continue
      }

      const permissionLabel = formatPermissionLabel(item.permission_points, item.requires_permission)
      if (!hasVisiblePermissionLabel(permissionLabel)) {
        continue
      }

      if (!groups.has(permissionLabel!)) {
        groups.set(permissionLabel!, [])
      }
      groups.get(permissionLabel!)!.push(item)
    }

    return Array.from(groups.entries())
      .map(([label, groupedItems]) => ({
        label,
        permissionPoints: groupedItems[0]?.permission_points ?? 0,
        items: groupedItems,
      }))
      .sort((left, right) => {
        const [leftValue, leftLabel] = permissionSortValue(String(left.permissionPoints))
        const [rightValue, rightLabel] = permissionSortValue(String(right.permissionPoints))
        if (leftValue !== rightValue) {
          return leftValue - rightValue
        }
        return leftLabel.localeCompare(rightLabel, 'zh-Hans-CN')
      })
  }, [sortedItems])

  const invalidateCatalogQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ['ds-configs'] })
    void queryClient.invalidateQueries({ queryKey: ['source-catalog-items', source] })
    void queryClient.invalidateQueries({ queryKey: ['ds-items'] })
    void queryClient.invalidateQueries({ queryKey: ['system-info'] })
  }

  const toggleConfigMutation = useMutation({
    mutationFn: ({ enabled }: { enabled: boolean }) => dataSourceAPI.updateConfig(source, { enabled }),
    onSuccess: invalidateCatalogQueries,
    onError: () => showToast(t('catalog.configToggleFail', '数据源切换失败'), 'error'),
  })

  const toggleItemMutation = useMutation({
    mutationFn: ({ itemKey, enabled }: { itemKey: string; enabled: boolean }) =>
      dataSourceAPI.updateItem(itemKey, { source, enabled }),
    onSuccess: invalidateCatalogQueries,
    onError: () => showToast(t('catalog.toggleFail', '切换失败'), 'error'),
  })

  const testMutation = useMutation({
    mutationFn: () => dataSourceAPI.testConnection(source),
    onSuccess: () =>
      showToast(`${sourceLabel}: ${t('page.datasource.testOk', '连接成功')}`, 'success'),
    onError: () =>
      showToast(`${sourceLabel}: ${t('page.datasource.testFail', '连接失败')}`, 'error'),
  })

  const batchMutation = useMutation({
    mutationFn: ({
      batchItems,
    }: {
      batchItems: Array<{ source: string; item_key: string; enabled: boolean }>
      successMessage: string
    }) => dataSourceAPI.batchUpdate({ items: batchItems }),
    onSuccess: (_data, variables) => {
      invalidateCatalogQueries()
      showToast(variables.successMessage, 'success')
    },
    onError: () => showToast(t('catalog.batchFail', '批量操作失败'), 'error'),
  })

  const rebuildSyncMutation = useMutation({
    mutationFn: () => dataSourceAPI.rebuildSyncStatus(source),
    onSuccess: (response) => {
      invalidateCatalogQueries()
      const payload = (response.data as SyncRebuildResponse | undefined) ?? {}
      showToast(
        t('catalog.rebuildSyncOk', '已重整 {{items}} 个接口，新增 {{pending}} 条待回补记录，提交 {{jobs}} 个任务', {
          items: payload.items_reconciled ?? 0,
          pending: payload.pending_records ?? 0,
          jobs: payload.backfill_jobs?.length ?? 0,
        }),
        'success'
      )
    },
    onError: () => showToast(t('catalog.rebuildSyncFail', '重整同步状态失败'), 'error'),
  })

  const toggleCategory = (category: string) => {
    setExpandedCategories((previous) => {
      const next = new Set(previous)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const runGroupBatch = (targetItems: SourceCatalogItem[], enabled: boolean, label: string) => {
    const batchItems = buildBatchItems(targetItems, enabled)
    if (batchItems.length === 0) {
      return
    }

    batchMutation.mutate({
      batchItems,
      successMessage: t('catalog.groupBatchOk', '已批量{{action}} {{name}}', {
        action: enabled ? t('catalog.enable', '启用') : t('catalog.disable', '禁用'),
        name: label,
      }),
    })
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        {t(loadingKey, defaultLoading)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-card-foreground">{t(titleKey, defaultTitle)}</h3>
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                {sourceLabel}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t(descriptionKey, defaultDescription)}</p>
            <p className="text-xs text-muted-foreground">
              {t('catalog.subtitle', '共 {{total}} 个接口，已启用 {{enabled}} 个', {
                total: sortedItems.length,
                enabled: enabledCount,
              })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              {t('page.datasource.testBtn', '测试连接')}
            </button>
            {source === 'tushare' && (
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                onClick={() => rebuildSyncMutation.mutate()}
                disabled={rebuildSyncMutation.isPending}
              >
                {t('catalog.rebuildSyncBtn', '重整 Sync 状态')}
              </button>
            )}
            {config && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t('catalog.sourceSwitch', '数据源开关')}</span>
                <ToggleSwitch
                  checked={Boolean(config.enabled)}
                  disabled={toggleConfigMutation.isPending}
                  onChange={(enabled) => toggleConfigMutation.mutate({ enabled })}
                />
              </div>
            )}
          </div>
        </div>

        {permissionGroups.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('catalog.batchLabel', '按权限批量操作')}:
            </span>
            {permissionGroups.map((group) => (
              <div key={group.label} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${permBadgeClass(group.label)}`}
                  onClick={() => runGroupBatch(group.items, true, group.label)}
                  disabled={batchMutation.isPending}
                  title={t('catalog.enableAll', '全部启用 {{perm}}', { perm: group.label })}
                >
                  <Zap size={10} className="mr-0.5 inline" />
                  {group.label}
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => runGroupBatch(group.items, false, group.label)}
                  disabled={batchMutation.isPending}
                  title={t('catalog.disableAll', '全部禁用 {{perm}}', { perm: group.label })}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {tree.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {t('catalog.empty', '暂无目录数据')}
        </div>
      ) : (
        tree.map((group) => (
          <div key={group.category} className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <button
                type="button"
                className="flex min-w-0 items-center gap-2 hover:text-foreground"
                onClick={() => toggleCategory(group.category)}
              >
                {expandedCategories.has(group.category) ? (
                  <ChevronDown size={16} className="text-muted-foreground" />
                ) : (
                  <ChevronRight size={16} className="text-muted-foreground" />
                )}
                <span className="font-medium text-card-foreground">{group.category}</span>
                <span className="text-xs text-muted-foreground">
                  ({group.totalEnabled}/{group.totalCount})
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-50"
                  onClick={() => runGroupBatch(group.subs.flatMap((sub) => sub.items), true, group.category)}
                  disabled={batchMutation.isPending}
                >
                  {t('catalog.groupEnable', '批量启用')}
                </button>
                <button
                  type="button"
                  className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                  onClick={() => runGroupBatch(group.subs.flatMap((sub) => sub.items), false, group.category)}
                  disabled={batchMutation.isPending}
                >
                  {t('catalog.groupDisable', '批量禁用')}
                </button>
              </div>
            </div>

            {expandedCategories.has(group.category) && (
              <div className="space-y-3 border-t border-border px-5 pb-4 pt-3">
                {group.subs.map((sub) => (
                  <div key={sub.subCategory}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {sub.subCategory}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-muted disabled:opacity-50"
                          onClick={() => runGroupBatch(sub.items, true, `${group.category} / ${sub.subCategory}`)}
                          disabled={batchMutation.isPending}
                        >
                          {t('catalog.groupEnable', '批量启用')}
                        </button>
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                          onClick={() => runGroupBatch(sub.items, false, `${group.category} / ${sub.subCategory}`)}
                          disabled={batchMutation.isPending}
                        >
                          {t('catalog.groupDisable', '批量禁用')}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {sub.items.map((item) => {
                        const needsExplicitPermission = requiresExplicitPermission(item.requires_permission)
                        const isUnsupported = !item.sync_supported
                        const permissionLabel = formatPermissionLabel(
                          item.permission_points,
                          item.requires_permission
                        )

                        return (
                          <div
                            key={item.item_key}
                            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                              needsExplicitPermission && isUnsupported
                                ? 'border-dashed border-muted-foreground/30 opacity-60'
                                : isUnsupported
                                  ? 'border-amber-300/70 bg-amber-50/40'
                                  : 'border-border'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-foreground">
                                {item.display_name || item.item_key}
                              </span>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.description || item.item_key}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                                {item.api_name && (
                                  <span className="rounded border border-border px-1.5 py-px text-muted-foreground">
                                    {item.api_name}
                                  </span>
                                )}
                                {hasVisiblePermissionLabel(permissionLabel) && (
                                  <span
                                    className={`inline-block rounded px-1 py-px font-medium ${permBadgeClass(permissionLabel)}`}
                                  >
                                    {permissionLabel}
                                  </span>
                                )}
                                {item.rate_limit_note && (
                                  <span className="rounded border border-border px-1.5 py-px text-muted-foreground">
                                    {item.rate_limit_note}
                                  </span>
                                )}
                                {isUnsupported && (
                                  <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-px text-amber-800">
                                    {t('catalog.unsupported', '当前配置不支持同步')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <ToggleSwitch
                              checked={Boolean(item.enabled)}
                              disabled={toggleItemMutation.isPending || (isUnsupported && !item.enabled)}
                              onChange={(enabled) =>
                                toggleItemMutation.mutate({ itemKey: item.item_key, enabled })
                              }
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}