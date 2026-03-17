import { useCallback, useEffect, useState } from 'react'
import {
  Bell, BellOff, BellRing, CheckCircle, Loader2, Mail, Plus, RefreshCw,
  Trash2, Webhook, X
} from 'lucide-react'
import { alertsAPI } from '../lib/api'
import type { AlertRule, AlertHistory, NotificationChannel } from '../types'

type Tab = 'rules' | 'history' | 'channels'

export default function Monitoring() {
  const [tab, setTab] = useState<Tab>('rules')
  const [rules, setRules] = useState<AlertRule[]>([])
  const [history, setHistory] = useState<AlertHistory[]>([])
  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [ruleForm, setRuleForm] = useState({ name: '', metric: '', comparator: '>', threshold: 0, level: 'warning' as const })
  const [channelForm, setChannelForm] = useState({ channel_type: 'email' as const, target: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'rules') {
        const { data } = await alertsAPI.listRules()
        setRules(Array.isArray(data) ? data : data.data || [])
      } else if (tab === 'history') {
        const { data } = await alertsAPI.listHistory({ page_size: 100 })
        const result = data as any
        setHistory(result.data || result || [])
      } else {
        const { data } = await alertsAPI.listChannels()
        setChannels(Array.isArray(data) ? data : data.data || [])
      }
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await alertsAPI.createRule(ruleForm)
      setShowRuleForm(false)
      setRuleForm({ name: '', metric: '', comparator: '>', threshold: 0, level: 'warning' })
      fetchData()
    } catch {
      setError('Failed to create rule')
    }
  }

  const handleDeleteRule = async (id: number) => {
    try {
      await alertsAPI.deleteRule(id)
      fetchData()
    } catch {
      setError('Failed to delete rule')
    }
  }

  const handleAcknowledge = async (id: number) => {
    try {
      await alertsAPI.acknowledgeAlert(id)
      fetchData()
    } catch {
      setError('Failed to acknowledge alert')
    }
  }

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await alertsAPI.createChannel({
        channel_type: channelForm.channel_type,
        config: { target: channelForm.target },
      })
      setShowChannelForm(false)
      setChannelForm({ channel_type: 'email', target: '' })
      fetchData()
    } catch {
      setError('Failed to create channel')
    }
  }

  const handleDeleteChannel = async (id: number) => {
    try {
      await alertsAPI.deleteChannel(id)
      fetchData()
    } catch {
      setError('Failed to delete channel')
    }
  }

  const LEVEL_COLORS: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
    severe: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Monitoring & Alerts</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([['rules', 'Alert Rules', Bell], ['history', 'Alert History', BellRing], ['channels', 'Channels', Mail]] as const).map(
          ([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          )
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Rules Tab */}
          {tab === 'rules' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{rules.length} rule(s)</span>
                <div className="flex gap-2">
                  <button onClick={fetchData} className="p-2 hover:bg-accent rounded"><RefreshCw className="h-4 w-4" /></button>
                  <button onClick={() => setShowRuleForm(true)}
                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm flex items-center gap-1">
                    <Plus className="h-4 w-4" /> New Rule
                  </button>
                </div>
              </div>

              {showRuleForm && (
                <form onSubmit={handleCreateRule} className="bg-card border rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                  <input placeholder="Rule name" value={ruleForm.name}
                    onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))}
                    className="border rounded px-3 py-2 text-sm" required />
                  <input placeholder="Metric (e.g. cpu_usage)" value={ruleForm.metric}
                    onChange={e => setRuleForm(f => ({ ...f, metric: e.target.value }))}
                    className="border rounded px-3 py-2 text-sm" required />
                  <div className="flex gap-1">
                    <select value={ruleForm.comparator}
                      onChange={e => setRuleForm(f => ({ ...f, comparator: e.target.value }))}
                      className="border rounded px-2 py-2 text-sm w-16">
                      <option value=">">&gt;</option><option value="<">&lt;</option>
                      <option value=">=">&ge;</option><option value="<=">&le;</option>
                      <option value="==">=</option>
                    </select>
                    <input type="number" step="any" value={ruleForm.threshold}
                      onChange={e => setRuleForm(f => ({ ...f, threshold: Number(e.target.value) }))}
                      className="border rounded px-3 py-2 text-sm flex-1" />
                  </div>
                  <select value={ruleForm.level}
                    onChange={e => setRuleForm(f => ({ ...f, level: e.target.value as any }))}
                    className="border rounded px-3 py-2 text-sm">
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="severe">Severe</option>
                  </select>
                  <div className="flex gap-2">
                    <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm">Create</button>
                    <button type="button" onClick={() => setShowRuleForm(false)} className="px-3 py-2 text-sm">Cancel</button>
                  </div>
                </form>
              )}

              {rules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No alert rules configured</div>
              ) : (
                <div className="bg-card border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-2">Name</th>
                        <th className="text-left px-4 py-2">Condition</th>
                        <th className="text-left px-4 py-2">Level</th>
                        <th className="text-left px-4 py-2">Status</th>
                        <th className="text-right px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map(rule => (
                        <tr key={rule.id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{rule.name}</td>
                          <td className="px-4 py-2 font-mono text-xs">{rule.metric} {rule.comparator} {rule.threshold}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[rule.level] || ''}`}>{rule.level}</span>
                          </td>
                          <td className="px-4 py-2">
                            {rule.is_active ? (
                              <span className="text-green-600 flex items-center gap-1"><Bell className="h-3 w-3" /> Active</span>
                            ) : (
                              <span className="text-muted-foreground flex items-center gap-1"><BellOff className="h-3 w-3" /> Disabled</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => handleDeleteRule(rule.id)} className="text-red-600 hover:text-red-800 p-1" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {tab === 'history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{history.length} alert(s)</span>
                <button onClick={fetchData} className="p-2 hover:bg-accent rounded"><RefreshCw className="h-4 w-4" /></button>
              </div>
              {history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No alert history</div>
              ) : (
                <div className="space-y-2">
                  {history.map(alert => (
                    <div key={alert.id} className="bg-card border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[alert.level] || ''}`}>{alert.level}</span>
                        <span className="text-sm">{alert.message}</span>
                        <span className="text-xs text-muted-foreground">{new Date(alert.triggered_at).toLocaleString()}</span>
                      </div>
                      {alert.status !== 'acknowledged' && (
                        <button onClick={() => handleAcknowledge(alert.id)}
                          className="text-green-600 hover:text-green-800 p-1 flex items-center gap-1 text-sm" title="Acknowledge">
                          <CheckCircle className="h-4 w-4" /> Ack
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Channels Tab */}
          {tab === 'channels' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{channels.length} channel(s)</span>
                <button onClick={() => setShowChannelForm(true)}
                  className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Add Channel
                </button>
              </div>

              {showChannelForm && (
                <form onSubmit={handleCreateChannel} className="bg-card border rounded-lg p-4 flex gap-3 items-end">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select value={channelForm.channel_type}
                      onChange={e => setChannelForm(f => ({ ...f, channel_type: e.target.value as any }))}
                      className="border rounded px-3 py-2 text-sm">
                      <option value="email">Email</option>
                      <option value="wechat">WeChat</option>
                      <option value="dingtalk">DingTalk</option>
                      <option value="telegram">Telegram</option>
                      <option value="slack">Slack</option>
                      <option value="webhook">Webhook</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Target</label>
                    <input placeholder="e.g. user@email.com or webhook URL" value={channelForm.target}
                      onChange={e => setChannelForm(f => ({ ...f, target: e.target.value }))}
                      className="w-full border rounded px-3 py-2 text-sm" required />
                  </div>
                  <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm">Add</button>
                  <button type="button" onClick={() => setShowChannelForm(false)} className="px-3 py-2 text-sm">Cancel</button>
                </form>
              )}

              {channels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No notification channels configured</div>
              ) : (
                <div className="grid gap-3">
                  {channels.map(ch => (
                    <div key={ch.id} className="bg-card border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {ch.channel_type === 'webhook' ? <Webhook className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                        <div>
                          <div className="font-medium text-sm capitalize">{ch.channel_type}</div>
                          <div className="text-xs text-muted-foreground">
                            {ch.config?.target as string || JSON.stringify(ch.config)}
                          </div>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${ch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {ch.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <button onClick={() => handleDeleteChannel(ch.id)} className="text-red-600 hover:text-red-800 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
