import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Loader2,
  Play,
  RefreshCw,
  Wrench,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { showToast } from './ui/toast-service'
import { dataSourceAPI, datasyncAPI } from '../lib/api'

type SyncLatestItem = {
  source: string
  interface_key: string
  status: string
  rows_synced: number
  error_message: string | null
  retry_count: number
  started_at: string | null
  finished_at: string | null
}

type SyncSummary = {
  days: number
  overall: Record<string, number>
  by_date: Record<string, Record<string, Record<string, number>>>
}

type SyncCoverageItem = {
  source: string
  source_name: string
  item_key: string
  item_name: string
  sync_priority: number
  api_name: string | null
  supports_backfill: boolean
  expected_sync_dates: number
  total_sync_dates: number
  missing_sync_dates: number
  latest_sync_date: string | null
  initialized_from: string | null
  initialized_to: string | null
  counts: {
    success: number
    error: number
    pending: number
    running: number
    partial: number
  }
}

type SyncCoverageResponse = {
  window_start: string
  window_end: string
  expected_trade_days: number
  items: SyncCoverageItem[]
  summary: {
    items: number
    missing_items: number
    repairable_items: number
    unsupported_items: number
  }
}

type RepairSyncCoverageResponse = {
  items_requested?: number | null
  items_reconciled?: number
  pending_records?: number
  backfill_jobs?: Array<{ source: string; item_key: string; job_id: string }>
}

function preferCoverageItem(current: SyncCoverageItem, candidate: SyncCoverageItem): SyncCoverageItem {
  if (candidate.missing_sync_dates !== current.missing_sync_dates) {
    return candidate.missing_sync_dates > current.missing_sync_dates ? candidate : current
  }

  if (candidate.total_sync_dates !== current.total_sync_dates) {
    return candidate.total_sync_dates > current.total_sync_dates ? candidate : current
  }

  if ((candidate.latest_sync_date ?? '') !== (current.latest_sync_date ?? '')) {
    return (candidate.latest_sync_date ?? '') > (current.latest_sync_date ?? '') ? candidate : current
  }

  const currentPendingWork = current.counts.pending + current.counts.error + current.counts.partial
  const candidatePendingWork =
    candidate.counts.pending + candidate.counts.error + candidate.counts.partial
  if (candidatePendingWork !== currentPendingWork) {
    return candidatePendingWork > currentPendingWork ? candidate : current
  }

  return current
}

function dedupeCoverageItems(items: SyncCoverageItem[]): SyncCoverageItem[] {
  const deduped = new Map<string, SyncCoverageItem>()

  for (const item of items) {
    const itemId = `${item.source}/${item.item_key}`
    const existing = deduped.get(itemId)
    if (!existing) {
      deduped.set(itemId, item)
      continue
    }

    deduped.set(itemId, preferCoverageItem(existing, item))
  }

  return Array.from(deduped.values())
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    partial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  }
  const icon: Record<string, React.ReactNode> = {
    success: <CheckCircle2 size={12} />,
    error: <XCircle size={12} />,
    running: <Loader2 size={12} className="animate-spin" />,
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        cls[status] || 'bg-muted text-muted-foreground'
      }`}
    >
      {icon[status]}
      {status}
    </span>
  )
}

function StatusCountPill({ status, count }: { status: string; count: number }) {
  if (count <= 0) {
    return null
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-foreground">
      <StatusBadge status={status} />
      <span className="tabular-nums">{count}</span>
    </span>
  )
}

export default function DataSyncManagementTab() {
  const { t: tSettings } = useTranslation('settings')
  const { t: tMarket } = useTranslation('market')
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: latestData, isLoading: latestLoading, refetch: refetchLatest, error: latestError } = useQuery<{
    latest_date: string | null
    items: SyncLatestItem[]
  }>({
    queryKey: ['datasync', 'latest'],
    queryFn: () => datasyncAPI.latest().then((response) => response.data),
    refetchInterval: 30000,
  })

  const { data: summaryData, isLoading: summaryLoading } = useQuery<SyncSummary>({
    queryKey: ['datasync', 'summary'],
    queryFn: () => datasyncAPI.summary(7).then((response) => response.data),
    refetchInterval: 60000,
  })

  const { data: coverageData, isLoading: coverageLoading } = useQuery<SyncCoverageResponse>({
    queryKey: ['datasync', 'coverage'],
    queryFn: () => dataSourceAPI.syncCoverage().then((response) => response.data as SyncCoverageResponse),
    refetchInterval: 60000,
  })

  const invalidateSyncQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ['datasync', 'latest'] })
    void queryClient.invalidateQueries({ queryKey: ['datasync', 'summary'] })
    void queryClient.invalidateQueries({ queryKey: ['datasync', 'coverage'] })
  }

  const triggerMutation = useMutation({
    mutationFn: () => datasyncAPI.trigger(),
    onSuccess: (response) => {
      const jobId = (response.data as { job_id?: string })?.job_id
      if (jobId) {
        showToast(`${tMarket('page.sync.triggered')} (Job: ${jobId.slice(0, 8)}...)`, 'success')
      } else {
        showToast(tMarket('page.sync.triggered'), 'success')
      }
      invalidateSyncQueries()
    },
    onError: () => showToast(tMarket('page.sync.triggerFailed'), 'error'),
  })

  const repairMutation = useMutation({
    mutationFn: (payload: {
      items?: Array<{ source: string; item_key: string }>
      only_missing?: boolean
    }) => dataSourceAPI.repairSyncCoverage(payload),
    onSuccess: (response) => {
      setSelectedIds(new Set())
      invalidateSyncQueries()
      const payload = (response.data as RepairSyncCoverageResponse | undefined) ?? {}
      showToast(
        tSettings('page.dataSync.repairSuccess', {
          repaired: payload.items_reconciled ?? 0,
          pending: payload.pending_records ?? 0,
          jobs: payload.backfill_jobs?.length ?? 0,
          defaultValue: 'Repaired {{repaired}} interfaces, added {{pending}} pending dates, queued {{jobs}} jobs',
        }),
        'success'
      )
    },
    onError: () =>
      showToast(
        tSettings('page.dataSync.repairFailed', 'Failed to repair sync coverage'),
        'error'
      ),
  })

  const coverageItems = useMemo(() => dedupeCoverageItems(coverageData?.items ?? []), [coverageData?.items])
  const repairCandidates = useMemo(
    () => coverageItems.filter((item) => item.missing_sync_dates > 0),
    [coverageItems]
  )
  const coverageSummary = useMemo(
    () => ({
      items: coverageItems.length,
      missing_items: repairCandidates.length,
      repairable_items: coverageData?.summary?.repairable_items ?? 0,
      unsupported_items: coverageData?.summary?.unsupported_items ?? 0,
    }),
    [coverageData?.summary?.repairable_items, coverageData?.summary?.unsupported_items, coverageItems.length, repairCandidates.length]
  )
  const repairCandidateIds = useMemo(
    () => new Set(repairCandidates.map((item) => `${item.source}/${item.item_key}`)),
    [repairCandidates]
  )
  const selectedRepairItems = useMemo(
    () =>
      repairCandidates.filter((item) => selectedIds.has(`${item.source}/${item.item_key}`)).map((item) => ({
        source: item.source,
        item_key: item.item_key,
      })),
    [repairCandidates, selectedIds]
  )

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(repairCandidates.map((item) => `${item.source}/${item.item_key}`)))
      return
    }
    setSelectedIds(new Set())
  }

  const handleToggleItem = (item: SyncCoverageItem, checked: boolean) => {
    const itemId = `${item.source}/${item.item_key}`
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (checked) {
        next.add(itemId)
      } else {
        next.delete(itemId)
      }
      return next
    })
  }

  const handleRepairSelected = () => {
    if (selectedRepairItems.length === 0) {
      return
    }
    if (
      window.confirm(
        tSettings('page.dataSync.repairSelectedConfirm', {
          count: selectedRepairItems.length,
          defaultValue: 'Repair missing sync dates for {{count}} interfaces?',
        })
      )
    ) {
      repairMutation.mutate({ items: selectedRepairItems, only_missing: false })
    }
  }

  const handleRepairAllMissing = () => {
    if (repairCandidates.length === 0) {
      return
    }
    if (
      window.confirm(
        tSettings('page.dataSync.repairAllConfirm', {
          count: repairCandidates.length,
          defaultValue: 'Repair all {{count}} interfaces with missing sync dates?',
        })
      )
    ) {
      repairMutation.mutate({ only_missing: true })
    }
  }

  if (latestLoading && summaryLoading && coverageLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

  if (latestError) {
    return <p className="py-8 text-center text-destructive">{tMarket('page.sync.loadFailed')}</p>
  }

  const items = latestData?.items ?? []
  const overall = summaryData?.overall ?? {}
  const allSelected =
    repairCandidates.length > 0 &&
    repairCandidates.every((item) => selectedIds.has(`${item.source}/${item.item_key}`))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-card p-5">
        <div>
          <h3 className="font-semibold text-card-foreground">
            {tSettings('page.dataSync.title', 'Data Sync')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {tSettings(
              'page.dataSync.subtitle',
              'Track enabled interfaces, inspect status coverage, and repair missing trade dates.'
            )}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {tSettings('page.dataSync.window', {
              start: coverageData?.window_start ?? '--',
              end: coverageData?.window_end ?? '--',
              total: coverageData?.expected_trade_days ?? 0,
              defaultValue: 'Coverage window: {{start}} - {{end}} ({{total}} trade days)',
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
            onClick={() => {
              void refetchLatest()
              invalidateSyncQueries()
            }}
          >
            <RefreshCw size={14} />
            {tSettings('page.dataSync.refresh', 'Refresh')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            onClick={handleRepairSelected}
            disabled={selectedRepairItems.length === 0 || repairMutation.isPending}
          >
            {repairMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
            {tSettings('page.dataSync.repairSelected', 'Repair Selected')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            onClick={handleRepairAllMissing}
            disabled={repairCandidates.length === 0 || repairMutation.isPending}
          >
            <Wrench size={14} />
            {tSettings('page.dataSync.repairAllMissing', 'Repair All Missing')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
            onClick={() => {
              if (window.confirm(tMarket('page.sync.triggerConfirm'))) {
                triggerMutation.mutate()
              }
            }}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {tMarket('page.sync.triggerSync')}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">{tMarket('page.sync.latestDate')}</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{latestData?.latest_date ?? '--'}</div>
        </div>
        {(['success', 'error', 'pending', 'running'] as const).map((statusKey) => (
          <div key={statusKey} className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{tMarket(`page.sync.${statusKey}`)}</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{overall[statusKey] ?? 0}</div>
          </div>
        ))}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">
            {tSettings('page.dataSync.missingCoverage', 'Missing coverage')}
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {coverageSummary.missing_items}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="font-semibold text-card-foreground">
              {tSettings('page.dataSync.coverageTitle', 'Interface coverage')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tSettings('page.dataSync.coverageSubtitle', {
                count: coverageSummary.items,
                missing: coverageSummary.missing_items,
                defaultValue: '{{count}} enabled interfaces, {{missing}} with missing sync dates',
              })}
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={repairCandidates.length === 0}
              onChange={(event) => handleToggleAll(event.target.checked)}
            />
            {tSettings('page.dataSync.selectAllMissing', 'Select all missing')}
          </label>
        </div>

        {coverageItems.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            {tSettings('page.dataSync.noCoverage', 'No enabled sync interfaces found')}
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{tSettings('page.dataSync.columns.select', 'Select')}</th>
                  <th className="px-3 py-2">{tSettings('page.dataSync.columns.source', 'Source')}</th>
                  <th className="px-3 py-2">{tSettings('page.dataSync.columns.interface', 'Interface')}</th>
                  <th className="px-3 py-2 text-right">{tSettings('page.dataSync.columns.syncDates', 'Sync dates')}</th>
                  <th className="px-3 py-2 text-right">{tSettings('page.dataSync.columns.missing', 'Missing')}</th>
                  <th className="px-3 py-2">{tSettings('page.dataSync.columns.statusCounts', 'Status counts')}</th>
                  <th className="px-3 py-2">{tSettings('page.dataSync.columns.latest', 'Latest')}</th>
                  <th className="px-3 py-2">{tSettings('page.dataSync.columns.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coverageItems.map((item) => {
                  const itemId = `${item.source}/${item.item_key}`
                  const selectable = repairCandidateIds.has(itemId)
                  return (
                    <tr key={itemId} className="align-top hover:bg-muted/30">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(itemId)}
                          disabled={!selectable}
                          onChange={(event) => handleToggleItem(item, event.target.checked)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-foreground">{item.source_name || item.source}</div>
                        <div className="text-xs text-muted-foreground">{item.source}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-foreground">{item.item_name || item.item_key}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.item_key}</span>
                          {item.api_name && (
                            <span className="rounded border border-border px-1.5 py-px">{item.api_name}</span>
                          )}
                          {!item.supports_backfill && (
                            <span className="rounded border border-border px-1.5 py-px">
                              {tSettings('page.dataSync.snapshotOnly', 'Snapshot')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <div className="font-medium text-foreground">
                          {item.total_sync_dates.toLocaleString()} / {item.expected_sync_dates.toLocaleString()}
                        </div>
                        {(item.initialized_from || item.initialized_to) && (
                          <div className="text-xs text-muted-foreground">
                            {item.initialized_from ?? '--'} - {item.initialized_to ?? '--'}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.missing_sync_dates > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {item.missing_sync_dates.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(['success', 'error', 'pending', 'running', 'partial'] as const).map((statusKey) => (
                            <StatusCountPill
                              key={statusKey}
                              status={statusKey}
                              count={item.counts[statusKey]}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {item.latest_sync_date ?? '--'}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-50"
                          disabled={!selectable || repairMutation.isPending}
                          onClick={() => repairMutation.mutate({
                            items: [{ source: item.source, item_key: item.item_key }],
                            only_missing: false,
                          })}
                        >
                          <Wrench size={12} />
                          {tSettings('page.dataSync.repair', 'Repair')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{tMarket('page.sync.noRecords')}</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-semibold text-card-foreground">
              {tSettings('page.dataSync.latestRuns', 'Latest sync run')}
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{tMarket('page.sync.source')}</th>
                <th className="px-3 py-2">{tMarket('page.sync.interface')}</th>
                <th className="px-3 py-2">{tSettings('page.dataSync.columns.statusCounts', 'Status counts')}</th>
                <th className="px-3 py-2 text-right">{tMarket('page.sync.rows')}</th>
                <th className="px-3 py-2 text-right">{tMarket('page.sync.retries')}</th>
                <th className="px-3 py-2">{tMarket('page.sync.finishedAt')}</th>
                <th className="px-3 py-2">{tMarket('page.sync.errorMessage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={`${item.source}/${item.interface_key}`} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{item.source}</td>
                  <td className="px-3 py-2">{item.interface_key}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.rows_synced.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.retry_count}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {item.finished_at ? new Date(item.finished_at).toLocaleString() : '--'}
                  </td>
                  <td className="max-w-[240px] truncate px-3 py-2 text-xs text-destructive" title={item.error_message ?? ''}>
                    {item.error_message ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
