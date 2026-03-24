import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellRing, History, Mail, Plus, Settings } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import TabPanel from '../components/ui/TabPanel'
import ToggleSwitch from '../components/ui/ToggleSwitch'
import { showToast } from '../components/ui/toast-service'
import { alertsAPI } from '../lib/api'

interface Alert {
  id: string
  title: string
  message: string
  level: 'critical' | 'warning' | 'info'
  source: string
  created_at: string
  acknowledged: boolean
}

interface AlertRule {
  id: string
  name: string
  type: string
  condition: string
  level: string
  enabled: boolean
  channels: string[]
  last_triggered?: string
}

const LEVEL_MAP: Record<string, { color: string; variant: 'destructive' | 'warning' | 'primary' }> = {
  critical: { color: 'border-red-500', variant: 'destructive' },
  warning: { color: 'border-yellow-500', variant: 'warning' },
  info: { color: 'border-blue-500', variant: 'primary' },
}

export default function Monitoring() {
  const { t } = useTranslation('monitoring')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('live')
  const [newRuleModal, setNewRuleModal] = useState(false)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')

  const tabs = [
    { key: 'live', label: t('page.tabs.live'), icon: <BellRing size={16} /> },
    { key: 'rules', label: t('page.tabs.rules'), icon: <Settings size={16} /> },
    { key: 'history', label: t('page.tabs.history'), icon: <History size={16} /> },
    { key: 'channels', label: t('page.tabs.channels'), icon: <Bell size={16} /> },
  ]

  const levelLabel = (level: string) => t(`page.levelLabels.${level}`, { defaultValue: level })

  const { data: liveAlerts = [] } = useQuery<Alert[]>({
    queryKey: ['alerts-live'],
    queryFn: () =>
      alertsAPI.listHistory({ page: 1, page_size: 100 }).then((r) => {
        const d = r.data
        const list: Alert[] = Array.isArray(d) ? d : d?.data ?? []
        return list.filter((a) => !a.acknowledged)
      }),
    refetchInterval: 5_000,
    enabled: activeTab === 'live',
  })

  const { data: alertHistory = [] } = useQuery<Alert[]>({
    queryKey: ['alerts-history'],
    queryFn: () =>
      alertsAPI.listHistory().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
    enabled: activeTab === 'history',
  })

  const { data: rules = [] } = useQuery<AlertRule[]>({
    queryKey: ['alert-rules'],
    queryFn: () =>
      alertsAPI.listRules().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
    enabled: activeTab === 'rules',
  })

  const { data: channels = [] } = useQuery<
    { id: number; channel_type: string; config: Record<string, unknown> }[]
  >({
    queryKey: ['alert-channels'],
    queryFn: () =>
      alertsAPI.listChannels().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
    enabled: activeTab === 'channels',
  })

  const ackMutation = useMutation({
    mutationFn: (id: string) => alertsAPI.acknowledgeAlert(Number(id)),
    onSuccess: () => {
      showToast(t('page.ackSuccess'), 'success')
      queryClient.invalidateQueries({ queryKey: ['alerts-live'] })
    },
  })

  const createRuleMutation = useMutation({
    mutationFn: (data: { name: string; metric: string; comparator: string; threshold: number; level?: string }) =>
      alertsAPI.createRule(data),
    onSuccess: () => {
      showToast(t('page.ruleCreated'), 'success')
      setNewRuleModal(false)
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
    },
    onError: () => showToast(t('page.createFailed'), 'error'),
  })

  const toggleRule = useMutation({
    mutationFn: (rule: AlertRule) => alertsAPI.updateRule(Number(rule.id), { enabled: !rule.enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-rules'] }),
  })

  const stats = {
    active: liveAlerts.filter((a) => !a.acknowledged).length,
    critical: liveAlerts.filter((a) => a.level === 'critical').length,
    today: liveAlerts.length,
    rules: rules.filter((r) => r.enabled).length,
  }

  const histCols: Column<Alert>[] = [
    {
      key: 'level',
      label: t('page.columns.level'),
      render: (a) => {
        const mapped = LEVEL_MAP[a.level]
        return mapped ? <Badge variant={mapped.variant}>{levelLabel(a.level)}</Badge> : a.level
      },
    },
    { key: 'title', label: t('page.columns.title') },
    { key: 'message', label: t('page.columns.message') },
    { key: 'source', label: t('page.columns.source') },
    {
      key: 'created_at',
      label: t('page.columns.time'),
      render: (a) => new Date(a.created_at).toLocaleString(),
    },
    {
      key: 'acknowledged',
      label: t('page.columns.status'),
      render: (a) => (
        <Badge variant={a.acknowledged ? 'muted' : 'warning'}>
          {a.acknowledged ? t('page.status.acknowledged') : t('page.status.unacknowledged')}
        </Badge>
      ),
    },
  ]

  const ruleCols: Column<AlertRule>[] = [
    { key: 'name', label: t('page.columns.name') },
    { key: 'type', label: t('page.columns.type'), render: (r) => <Badge variant="primary">{r.type}</Badge> },
    { key: 'condition', label: t('page.columns.condition') },
    {
      key: 'level',
      label: t('page.columns.level'),
      render: (r) => {
        const mapped = LEVEL_MAP[r.level]
        return mapped ? <Badge variant={mapped.variant}>{levelLabel(r.level)}</Badge> : r.level
      },
    },
    { key: 'channels', label: t('page.columns.channels'), render: (r) => r.channels.join(', ') },
    {
      key: 'last_triggered',
      label: t('page.columns.lastTriggered'),
      render: (r) => r.last_triggered || '-',
    },
    {
      key: 'enabled',
      label: t('page.columns.enabled'),
      render: (r) => <ToggleSwitch checked={r.enabled} onChange={() => toggleRule.mutate(r)} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('page.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('page.subtitle')}</p>
        </div>
        <button
          onClick={() => setNewRuleModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"
        >
          <Plus size={16} />
          {t('page.newRule')}
        </button>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'live' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label={t('page.stats.active')} value={stats.active} changeType="negative" />
              <StatCard label={t('page.stats.critical')} value={stats.critical} changeType="negative" />
              <StatCard label={t('page.stats.today')} value={stats.today} />
              <StatCard label={t('page.stats.rules')} value={stats.rules} changeType="positive" />
            </div>
            <div className="space-y-3">
              {liveAlerts.map((alert) => {
                const level = LEVEL_MAP[alert.level] || LEVEL_MAP.info
                return (
                  <div key={alert.id} className={`rounded-lg border-l-4 ${level.color} border border-border bg-card p-4`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={level.variant}>{levelLabel(alert.level)}</Badge>
                          <span className="font-semibold text-card-foreground">{alert.title}</span>
                          <span className="text-xs text-muted-foreground">{alert.source}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => ackMutation.mutate(alert.id)}
                          className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
                        >
                          {t('page.confirm')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {liveAlerts.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t('page.empty.live')}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <DataTable columns={ruleCols} data={rules} emptyText={t('page.empty.rules')} />
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              filters={[
                {
                  key: 'level',
                  value: levelFilter,
                  options: [
                    { label: t('page.all'), value: '' },
                    { label: levelLabel('critical'), value: 'critical' },
                    { label: levelLabel('warning'), value: 'warning' },
                    { label: levelLabel('info'), value: 'info' },
                  ],
                  onChange: setLevelFilter,
                  placeholder: t('page.columns.level'),
                },
              ]}
            />
            <DataTable columns={histCols} data={alertHistory.filter(a => (!search || a.title?.includes(search) || a.message?.includes(search)) && (!levelFilter || a.level === levelFilter))} emptyText={t('page.empty.history')} />
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="space-y-4">
            {channels.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {channels.map((ch) => (
                  <div key={ch.id} className="rounded-lg border border-border bg-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Mail size={20} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-card-foreground">{ch.channel_type}</h3>
                      </div>
                    </div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(ch.config, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t('page.empty.channels')}</p>
            )}
          </div>
        )}
      </TabPanel>

      <Modal
        open={newRuleModal}
        onClose={() => setNewRuleModal(false)}
        title={t('page.modal.title')}
        footer={
          <>
            <button
              onClick={() => setNewRuleModal(false)}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
            >
              {t('page.modal.cancel')}
            </button>
            <button
              onClick={() =>
                createRuleMutation.mutate({
                  name: t('page.modal.defaultName'),
                  metric: 'drawdown',
                  comparator: '>',
                  threshold: 5,
                  level: 'warning',
                })
              }
              className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90"
            >
              {t('page.modal.submit')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('page.modal.name')}</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
              placeholder={t('page.modal.namePlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('page.modal.type')}</label>
              <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option>{t('page.modal.types.risk')}</option>
                <option>{t('page.modal.types.strategy')}</option>
                <option>{t('page.modal.types.data')}</option>
                <option>{t('page.modal.types.trading')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('page.modal.level')}</label>
              <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option value="critical">{levelLabel('critical')}</option>
                <option value="warning">{levelLabel('warning')}</option>
                <option value="info">{levelLabel('info')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('page.modal.condition')}</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
              placeholder={t('page.modal.conditionPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('page.modal.channelLabel')}</label>
            <div className="flex gap-4 text-sm">
              {['wechat', 'email', 'sms'].map((key, index) => (
                <label key={key} className="flex items-center gap-1.5">
                  <input type="checkbox" defaultChecked={index < 2} />
                  {t(`page.modal.channelOptions.${key}`)}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
