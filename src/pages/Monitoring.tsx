import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  BellRing,
  History,
  Mail,
  Plus,
  Settings,
} from 'lucide-react'
import { useState } from 'react'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import TabPanel from '../components/ui/TabPanel'
import ToggleSwitch from '../components/ui/ToggleSwitch'
import { showToast } from '../components/ui/Toast'
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

const TABS = [
  { key: 'live', label: '实时告警', icon: <BellRing size={16} /> },
  { key: 'rules', label: '告警规则', icon: <Settings size={16} /> },
  { key: 'history', label: '告警历史', icon: <History size={16} /> },
  { key: 'channels', label: '通知渠道', icon: <Bell size={16} /> },
]

const LEVEL_MAP: Record<string, { color: string; variant: 'danger' | 'warning' | 'primary' }> = {
  critical: { color: 'border-red-500', variant: 'danger' },
  warning: { color: 'border-yellow-500', variant: 'warning' },
  info: { color: 'border-blue-500', variant: 'primary' },
}

export default function Monitoring() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('live')
  const [newRuleModal, setNewRuleModal] = useState(false)
  const [search, setSearch] = useState('')

  const { data: liveAlerts = [] } = useQuery<Alert[]>({
    queryKey: ['alerts-live'],
    queryFn: () => alertsAPI.listHistory({ page: 1, page_size: 100 }).then((r) => {
      const d = r.data
      const list: Alert[] = Array.isArray(d) ? d : d?.data ?? []
      return list.filter((a) => !a.acknowledged)
    }),
    refetchInterval: 5_000,
    enabled: activeTab === 'live',
  })

  const { data: alertHistory = [] } = useQuery<Alert[]>({
    queryKey: ['alerts-history'],
    queryFn: () => alertsAPI.listHistory().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: activeTab === 'history',
  })

  const { data: rules = [] } = useQuery<AlertRule[]>({
    queryKey: ['alert-rules'],
    queryFn: () => alertsAPI.listRules().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: activeTab === 'rules',
  })

  const ackMutation = useMutation({
    mutationFn: (id: string) => alertsAPI.acknowledgeAlert(Number(id)),
    onSuccess: () => {
      showToast('已确认', 'success')
      queryClient.invalidateQueries({ queryKey: ['alerts-live'] })
    },
  })

  const createRuleMutation = useMutation({
    mutationFn: (data: { name: string; metric: string; comparator: string; threshold: number; level?: string }) => alertsAPI.createRule(data),
    onSuccess: () => {
      showToast('规则已创建', 'success')
      setNewRuleModal(false)
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
    },
    onError: () => showToast('创建失败', 'error'),
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
    { key: 'level', label: '级别', render: (a) => { const l = LEVEL_MAP[a.level]; return l ? <Badge variant={l.variant}>{a.level}</Badge> : a.level } },
    { key: 'title', label: '标题' },
    { key: 'message', label: '详情' },
    { key: 'source', label: '来源' },
    { key: 'created_at', label: '时间', render: (a) => new Date(a.created_at).toLocaleString() },
    { key: 'acknowledged', label: '状态', render: (a) => <Badge variant={a.acknowledged ? 'muted' : 'warning'}>{a.acknowledged ? '已确认' : '未确认'}</Badge> },
  ]

  const ruleCols: Column<AlertRule>[] = [
    { key: 'name', label: '规则名称' },
    { key: 'type', label: '类型', render: (r) => <Badge variant="primary">{r.type}</Badge> },
    { key: 'condition', label: '触发条件' },
    { key: 'level', label: '级别', render: (r) => { const l = LEVEL_MAP[r.level]; return l ? <Badge variant={l.variant}>{r.level}</Badge> : r.level } },
    { key: 'channels', label: '通知渠道', render: (r) => r.channels.join(', ') },
    { key: 'last_triggered', label: '上次触发', render: (r) => r.last_triggered || '-' },
    { key: 'enabled', label: '启用', render: (r) => <ToggleSwitch checked={r.enabled} onChange={() => toggleRule.mutate(r)} /> },
  ]

  // Channel state from API
  const { data: channels = [] } = useQuery<{ id: number; channel_type: string; config: Record<string, unknown> }[]>({
    queryKey: ['alert-channels'],
    queryFn: () => alertsAPI.listChannels().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: activeTab === 'channels',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">监控告警</h1>
          <p className="text-sm text-muted-foreground">实时告警 · 告警规则 · 通知渠道</p>
        </div>
        <button onClick={() => setNewRuleModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"><Plus size={16} />新建规则</button>
      </div>

      <TabPanel tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Live Alerts ──────────────────────────────── */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="活跃告警" value={stats.active} changeType="negative" />
              <StatCard label="严重" value={stats.critical} changeType="negative" />
              <StatCard label="今日触发" value={stats.today} />
              <StatCard label="活跃规则" value={stats.rules} changeType="positive" />
            </div>
            <div className="space-y-3">
              {liveAlerts.map((alert) => {
                const level = LEVEL_MAP[alert.level] || LEVEL_MAP.info
                return (
                  <div key={alert.id} className={`rounded-lg border-l-4 ${level.color} border border-border bg-card p-4`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={level.variant}>{alert.level}</Badge>
                          <span className="font-semibold text-card-foreground">{alert.title}</span>
                          <span className="text-xs text-muted-foreground">{alert.source}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                      </div>
                      {!alert.acknowledged && (
                        <button onClick={() => ackMutation.mutate(alert.id)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">确认</button>
                      )}
                    </div>
                  </div>
                )
              })}
              {liveAlerts.length === 0 && <p className="text-center text-muted-foreground py-8">暂无活跃告警</p>}
            </div>
          </div>
        )}

        {/* ── Rules ───────────────────────────────────── */}
        {activeTab === 'rules' && (
          <DataTable columns={ruleCols} data={rules} emptyText="暂无告警规则" />
        )}

        {/* ── History ─────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <FilterBar
              filters={[
                { key: 'search', label: '搜索', type: 'search' as const },
                { key: 'level', label: '级别', type: 'select' as const, options: [{ label: '全部', value: '' }, { label: '严重', value: 'critical' }, { label: '警告', value: 'warning' }, { label: '信息', value: 'info' }] },
              ]}
              values={{ search }}
              onChange={(v) => setSearch((v.search as string) || '')}
            />
            <DataTable columns={histCols} data={alertHistory} emptyText="暂无告警历史" />
          </div>
        )}

        {/* ── Channels ────────────────────────────────── */}
        {activeTab === 'channels' && (
          <div className="space-y-4">
            {channels.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {channels.map((ch) => (
                  <div key={ch.id} className="rounded-lg border border-border bg-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Mail size={20} className="text-blue-600" /></div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-card-foreground">{ch.channel_type}</h3>
                      </div>
                    </div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(ch.config, null, 2)}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无通知渠道，请点击“新建规则”添加</p>
            )}
          </div>
        )}
      </TabPanel>

      {/* New Rule Modal */}
      <Modal open={newRuleModal} onClose={() => setNewRuleModal(false)} title="新建告警规则" footer={
        <>
          <button onClick={() => setNewRuleModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">取消</button>
          <button onClick={() => createRuleMutation.mutate({ name: '新规则', metric: 'drawdown', comparator: '>', threshold: 5, level: 'warning' })} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">创建规则</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div><label className="block text-sm font-medium mb-1">规则名称</label><input className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" placeholder="例如: 回撤超限告警" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">类型</label>
              <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option>风控</option><option>策略监控</option><option>数据监控</option><option>交易</option>
              </select></div>
            <div><label className="block text-sm font-medium mb-1">级别</label>
              <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option value="critical">严重</option><option value="warning">警告</option><option value="info">信息</option>
              </select></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">触发条件</label><input className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" placeholder="例如: 最大回撤 > 5%" /></div>
          <div>
            <label className="block text-sm font-medium mb-1">通知渠道</label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked />企业微信</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked />邮件</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" />短信</label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
