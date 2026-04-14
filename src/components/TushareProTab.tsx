/**
 * TushareProTab — full Tushare API catalog management.
 *
 * Features:
 * - Accordion grouped by 数据大类 / 数据子类
 * - Per-item toggle switches
 * - Batch enable/disable by permission level (积分)
 * - Visual distinction for paid-access-only items
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ToggleSwitch from './ui/ToggleSwitch'
import { showToast } from './ui/toast-service'
import { dataSourceAPI } from '../lib/api'

/* ---------- types ---------- */

interface TushareItem {
  source: string
  item_key: string
  display_name: string
  enabled: number
  description: string | null
  category: string | null
  sub_category: string | null
  api_name: string | null
  permission_points: string | null
  rate_limit_note: string | null
  requires_permission: string | null
  sync_priority: number
  sync_supported: boolean
}

/* ---------- helper: build nested tree ---------- */

interface SubGroup {
  sub_category: string
  items: TushareItem[]
}

interface CategoryGroup {
  category: string
  subs: SubGroup[]
  totalEnabled: number
  totalCount: number
}

function buildTree(items: TushareItem[]): CategoryGroup[] {
  const map = new Map<string, Map<string, TushareItem[]>>()

  for (const item of items) {
    const cat = item.category || '其他'
    const sub = item.sub_category || '通用'
    if (!map.has(cat)) map.set(cat, new Map())
    const subMap = map.get(cat)!
    if (!subMap.has(sub)) subMap.set(sub, [])
    subMap.get(sub)!.push(item)
  }

  const result: CategoryGroup[] = []
  for (const [category, subMap] of map) {
    const subs: SubGroup[] = []
    let totalEnabled = 0
    let totalCount = 0
    for (const [sub_category, items] of subMap) {
      subs.push({ sub_category, items })
      totalCount += items.length
      totalEnabled += items.filter((i) => i.enabled).length
    }
    result.push({ category, subs, totalEnabled, totalCount })
  }
  return result
}

/* ---------- permission badge color ---------- */

function permBadgeClass(perm: string | null | undefined): string {
  if (!perm) return 'bg-muted text-muted-foreground'
  if (perm.includes('120')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  if (perm.includes('2000')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  if (perm.includes('5000')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  if (perm.includes('单独')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  return 'bg-muted text-muted-foreground'
}

function buildBatchItems(items: TushareItem[], enabled: boolean) {
  return items
    .filter((item) => item.requires_permission !== 'paid')
    .filter((item) => (enabled ? item.sync_supported : true))
    .filter((item) => Boolean(item.enabled) !== enabled)
    .map((item) => ({ source: item.source, item_key: item.item_key, enabled }))
}

/* ---------- component ---------- */

export default function TushareProTab() {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  /* ------- data ------- */

  const { data: items = [], isLoading } = useQuery<TushareItem[]>({
    queryKey: ['tushare-items'],
    queryFn: () =>
      dataSourceAPI
        .listItems({ source: 'tushare' })
        .then((r) => (r.data as { data: TushareItem[] }).data ?? []),
  })

  const { data: permissions = [] } = useQuery<string[]>({
    queryKey: ['tushare-permissions'],
    queryFn: () =>
      dataSourceAPI
        .listPermissions('tushare')
        .then((r) => (r.data as { data: string[] }).data ?? []),
  })

  const tree = useMemo(() => buildTree(items), [items])

  /* ------- mutations ------- */

  const toggleItem = useMutation({
    mutationFn: ({ item_key, enabled }: { item_key: string; enabled: boolean }) =>
      dataSourceAPI.updateItem(item_key, { source: 'tushare', enabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tushare-items'] })
      void queryClient.invalidateQueries({ queryKey: ['ds-items'] })
    },
    onError: () => showToast(t('tushare.toggleFail', '切换失败'), 'error'),
  })

  const batchByPermission = useMutation({
    mutationFn: ({ permission_points, enabled }: { permission_points: string; enabled: boolean }) =>
      dataSourceAPI.batchByPermission('tushare', { permission_points, enabled }),
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: ['tushare-items'] })
      void queryClient.invalidateQueries({ queryKey: ['ds-items'] })
      showToast(
        t('tushare.batchOk', '已批量{{action}} {{perm}} 接口', {
          action: v.enabled ? t('tushare.enable', '启用') : t('tushare.disable', '禁用'),
          perm: v.permission_points,
        }),
        'success'
      )
    },
    onError: () => showToast(t('tushare.batchFail', '批量操作失败'), 'error'),
  })

  const batchByGroup = useMutation({
    mutationFn: ({ items }: { items: Array<{ source: string; item_key: string; enabled: boolean }>; successMessage: string }) =>
      dataSourceAPI.batchUpdate({ items }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['tushare-items'] })
      void queryClient.invalidateQueries({ queryKey: ['ds-items'] })
      showToast(variables.successMessage, 'success')
    },
    onError: () => showToast(t('tushare.batchFail', '批量操作失败'), 'error'),
  })

  /* ------- accordion ------- */

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const runGroupBatch = (items: TushareItem[], enabled: boolean, label: string) => {
    const batchItems = buildBatchItems(items, enabled)
    if (batchItems.length === 0) {
      return
    }

    batchByGroup.mutate({
      items: batchItems,
      successMessage: t('tushare.groupBatchOk', '已批量{{action}} {{name}}', {
        action: enabled ? t('tushare.enable', '启用') : t('tushare.disable', '禁用'),
        name: label,
      }),
    })
  }

  /* ------- render ------- */

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        {t('tushare.loading', '加载 Tushare Pro 目录...')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* header + batch controls */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-card-foreground">
              {t('tushare.title', 'Tushare Pro 接口目录')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('tushare.subtitle', '共 {{total}} 个接口，已启用 {{enabled}} 个', {
                total: items.length,
                enabled: items.filter((i) => i.enabled).length,
              })}
            </p>
          </div>

          {/* batch by permission */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('tushare.batchLabel', '按权限批量操作')}:
            </span>
            {permissions.map((perm) => (
              <div key={perm} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 text-xs font-medium ${permBadgeClass(perm)} hover:opacity-80 transition-opacity`}
                  onClick={() => batchByPermission.mutate({ permission_points: perm, enabled: true })}
                  disabled={batchByPermission.isPending || batchByGroup.isPending}
                  title={t('tushare.enableAll', '全部启用 {{perm}}', { perm })}
                >
                  <Zap size={10} className="inline mr-0.5" />
                  {perm}
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => batchByPermission.mutate({ permission_points: perm, enabled: false })}
                  disabled={batchByPermission.isPending || batchByGroup.isPending}
                  title={t('tushare.disableAll', '全部禁用 {{perm}}', { perm })}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* accordion by category */}
      {tree.map((group) => (
        <div key={group.category} className="rounded-lg border border-border bg-card overflow-hidden">
          {/* category header */}
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 hover:text-foreground"
              onClick={() => toggleCat(group.category)}
            >
              {expandedCats.has(group.category) ? (
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
                disabled={batchByPermission.isPending || batchByGroup.isPending}
              >
                {t('tushare.groupEnable', '批量启用')}
              </button>
              <button
                type="button"
                className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                onClick={() => runGroupBatch(group.subs.flatMap((sub) => sub.items), false, group.category)}
                disabled={batchByPermission.isPending || batchByGroup.isPending}
              >
                {t('tushare.groupDisable', '批量禁用')}
              </button>
            </div>
          </div>

          {/* expanded content */}
          {expandedCats.has(group.category) && (
            <div className="border-t border-border px-5 pb-4 pt-3 space-y-3">
              {group.subs.map((sub) => (
                <div key={sub.sub_category}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {sub.sub_category}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-muted disabled:opacity-50"
                        onClick={() => runGroupBatch(sub.items, true, `${group.category} / ${sub.sub_category}`)}
                        disabled={batchByPermission.isPending || batchByGroup.isPending}
                      >
                        {t('tushare.groupEnable', '批量启用')}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-50"
                        onClick={() => runGroupBatch(sub.items, false, `${group.category} / ${sub.sub_category}`)}
                        disabled={batchByPermission.isPending || batchByGroup.isPending}
                      >
                        {t('tushare.groupDisable', '批量禁用')}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {sub.items.map((item) => {
                      const isPaid = item.requires_permission === 'paid'
                      const isUnsupported = !item.sync_supported
                      return (
                        <div
                          key={item.item_key}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                            isPaid
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
                              {item.permission_points && (
                                <span className={`inline-block rounded px-1 py-px font-medium ${permBadgeClass(item.permission_points)}`}>
                                  {item.permission_points}
                                </span>
                              )}
                              {item.rate_limit_note && (
                                <span className="rounded border border-border px-1.5 py-px text-muted-foreground">
                                  {item.rate_limit_note}
                                </span>
                              )}
                              {isUnsupported && (
                                <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-px text-amber-800">
                                  {t('tushare.unsupported', '未接入同步')}
                                </span>
                              )}
                            </div>
                          </div>
                          <ToggleSwitch
                            checked={Boolean(item.enabled)}
                            disabled={isPaid || toggleItem.isPending || (isUnsupported && !item.enabled)}
                            onChange={(value) =>
                              toggleItem.mutate({ item_key: item.item_key, enabled: value })
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
      ))}
    </div>
  )
}
