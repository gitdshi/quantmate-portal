import { useQuery } from '@tanstack/react-query'
import { Activity, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { queueAPI, systemAPI } from '../lib/api'

export default function Dashboard() {
  const { t } = useTranslation('dashboard')
  const { data: queueStats } = useQuery({
    queryKey: ['queueStats'],
    queryFn: () => queueAPI.getStats(),
    refetchInterval: 5000,
  })

  const { data: syncStatusData } = useQuery({
    queryKey: ['syncStatus'],
    queryFn: () => systemAPI.syncStatus(),
    refetchInterval: 60000,
  })

  const stats = queueStats?.data
  const syncStatus = syncStatusData?.data
  const daemonStatus = syncStatus?.daemon
  const consistency = syncStatus?.consistency
  const latestSync = syncStatus?.sync?.latest || {}

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('activeJobs')}
          value={stats?.active || 0}
          icon={<Activity className="h-5 w-5" />}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          title={t('queuedJobs')}
          value={stats?.queued || 0}
          icon={<Clock className="h-5 w-5" />}
          color="text-yellow-500"
          bgColor="bg-yellow-500/10"
        />
        <StatCard
          title={t('completed')}
          value={stats?.completed || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <StatCard
          title={t('failed')}
          value={stats?.failed || 0}
          icon={<AlertCircle className="h-5 w-5" />}
          color="text-red-500"
          bgColor="bg-red-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-xl font-semibold mb-4">{t('queueStatus')}</h2>
          {stats ? (
            <div className="space-y-3">
              {Object.entries(stats.by_queue || {}).map(([queueName, count]) => (
                <div key={queueName} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{queueName}</span>
                  <span className="text-sm text-muted-foreground">{String(count)} jobs</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t('loadingQueue')}</p>
          )}
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-xl font-semibold mb-4">{t('systemStatus')}</h2>
          <div className="space-y-3">
            <StatusItem
              label={t('backendApi')}
              status="online"
            />
            <StatusItem
              label={t('redisQueue')}
              status={stats ? 'online' : 'checking'}
            />
            <StatusItem
              label={t('workers')}
              status={stats && stats.active > 0 ? 'online' : 'idle'}
            />
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-xl font-semibold mb-4">{t('dataSyncStatus')}</h2>
          <div className="space-y-3">
            <StatusItem
              label={t('daemon')}
              status={daemonStatus?.status || 'checking'}
            />
            <StatusItem
              label={t('consistency')}
              status={consistency ? (consistency.is_consistent ? 'online' : 'warning') : 'checking'}
            />
            <div className="text-sm text-muted-foreground">
              {t('missingDates')}: <span className="font-medium text-foreground">{consistency?.missing_count ?? '—'}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {t('lastRun')}: <span className="font-medium text-foreground">{daemonStatus?.last_run_at ? new Date(daemonStatus.last_run_at).toLocaleString() : '—'}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-sm font-medium mb-2">{t('latestSync')}</div>
            <div className="space-y-2">
              {Object.entries(latestSync).map(([endpoint, info]) => (
                <div key={endpoint} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{endpoint.replace(/_/g, ' ')}</span>
                  <span className="font-medium">{(info as { status?: string }).status || 'unknown'}</span>
                </div>
              ))}
              {Object.keys(latestSync).length === 0 && (
                <div className="text-sm text-muted-foreground">{t('noSyncHistory')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, bgColor }: {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  bgColor: string
}) {
  return (
    <div className="bg-card p-6 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <div className={color}>{icon}</div>
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
      </div>
    </div>
  )
}

function StatusItem({ label, status }: { label: string; status: string }) {
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    idle: 'bg-yellow-500',
    checking: 'bg-gray-500',
    warning: 'bg-yellow-500',
    stale: 'bg-red-500',
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${statusColors[status as keyof typeof statusColors]}`} />
        <span className="text-sm text-muted-foreground capitalize">{status}</span>
      </div>
    </div>
  )
}
