import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { systemAPI } from '../lib/api'
import type { SyncStatusResponse } from '../types'

interface SystemHealthStripProps {
  className?: string
}

export default function SystemHealthStrip({ className = '' }: SystemHealthStripProps) {
  const { t } = useTranslation('dashboard')
  const { data } = useQuery<SyncStatusResponse>({
    queryKey: ['system', 'sync-status'],
    queryFn: async () => {
      const response = await systemAPI.syncStatus()
      return response.data
    },
    retry: 1,
    staleTime: 30_000,
  })

  if (!data) {
    return null
  }

  const missingCount = data.consistency?.missing_count ?? 0
  const isConsistent = data.consistency?.is_consistent ?? true
  const lastRun = data.daemon?.last_run_at
  const status = data.daemon?.status ?? 'unknown'

  const tone = !isConsistent
    ? {
        wrapper: 'border-amber-200 bg-amber-50 text-amber-950',
        icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
        title: t('health.warningTitle', 'Data sync has gaps'),
        description: t('health.warningDescription', {
          count: missingCount,
          defaultValue: `There are ${missingCount} missing trading days. Analytics may be incomplete.`,
        }),
      }
    : {
        wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-950',
        icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
        title: t('health.okTitle', 'Data sync is healthy'),
        description: t('health.okDescription', {
          defaultValue: 'System health looks good. Recent analytics should be reliable.',
        }),
      }

  return (
    <section className={`rounded-2xl border px-4 py-4 ${tone.wrapper} ${className}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{tone.icon}</div>
          <div>
            <p className="font-semibold">{tone.title}</p>
            <p className="text-sm opacity-90">{tone.description}</p>
            <p className="mt-1 text-xs opacity-80">
              {t('health.lastRun', {
                status,
                time: lastRun ? new Date(lastRun).toLocaleString() : t('health.noRunYet', 'not available yet'),
                defaultValue: `Last sync: ${lastRun ? new Date(lastRun).toLocaleString() : 'not available yet'} · Status: ${status}`,
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/settings?tab=system-management"
            className="inline-flex items-center justify-center rounded-lg border border-current/20 bg-white/70 px-3 py-2 text-sm font-medium transition hover:bg-white"
          >
            {t('health.viewStatus', 'View system status')}
          </Link>
          <Link
            to="/settings?tab=system-management"
            className="inline-flex items-center justify-center rounded-lg border border-current/20 px-3 py-2 text-sm font-medium transition hover:bg-white/60"
          >
            {t('health.syncSettings', 'Open sync settings')}
          </Link>
        </div>
      </div>
    </section>
  )
}
