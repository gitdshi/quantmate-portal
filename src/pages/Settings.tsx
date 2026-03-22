import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Bell,
  Database,
  Monitor,
  Palette,
  Server,
  Settings2,
} from 'lucide-react'
import { useState } from 'react'

import TabPanel from '../components/ui/TabPanel'
import ToggleSwitch from '../components/ui/ToggleSwitch'
import { showToast } from '../components/ui/Toast'
import { systemAPI, dataSourceAPI } from '../lib/api'

const TABS = [
  { key: 'general', label: '常规设置', icon: <Settings2 size={16} /> },
  { key: 'datasource', label: '数据源', icon: <Database size={16} /> },
  { key: 'trading-cfg', label: '交易参数', icon: <Monitor size={16} /> },
  { key: 'notification', label: '通知设置', icon: <Bell size={16} /> },
  { key: 'ui', label: '界面设置', icon: <Palette size={16} /> },
  { key: 'system', label: '系统信息', icon: <Server size={16} /> },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')

  // ── General ──
  const [general, setGeneral] = useState({
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    currency: 'CNY',
    autoSave: true,
  })

  // ── Data source ──
  const [ds, setDs] = useState({
    tushareToken: '',
    tushareEnabled: true,
    akshareEnabled: true,
    tushareItems: { daily: true, adj: true, income: true, balance: true, cashflow: true, fina: true, margin: true, moneyflow: true },
    akshareItems: { index: true, macro: false },
  })

  // ── Trading config ──
  const [trading, setTrading] = useState({
    defaultCapital: '1000000',
    commissionRate: '0.0003',
    slippage: '0.001',
    minOrderAmount: '100',
    maxDrawdown: '0.1',
    maxPositionPct: '0.2',
    stopLossPct: '0.05',
    dailyLossLimit: '0.03',
  })

  // ── Notifications ──
  const [notif, setNotif] = useState({
    strategyAlert: true,
    tradeExec: true,
    riskAlert: true,
    systemAlert: true,
    dailyReport: false,
  })

  // ── UI ──
  const [ui, setUi] = useState({
    theme: 'system',
    colorScheme: 'blue',
    chartLib: 'echarts',
    pageSize: '20',
    sidebarCollapsed: false,
  })

  const { data: systemInfo } = useQuery({
    queryKey: ['system-info'],
    queryFn: () => systemAPI.syncStatus().then((r) => r.data),
    enabled: activeTab === 'system',
  })

  const saveMutation = useMutation({
    mutationFn: () => Promise.resolve(), // TODO: connect to real settings API
    onSuccess: () => showToast('设置已保存', 'success'),
  })

  const sysItems = systemInfo
    ? Object.entries(systemInfo).map(([key, value]) => ({
        label: key,
        value: String(value ?? '-'),
      }))
    : []

  const inputCls = 'w-full px-3 py-2 text-sm rounded-md border border-border bg-background'
  const labelCls = 'block text-sm font-medium mb-1'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">系统设置</h1>
          <p className="text-sm text-muted-foreground">常规 · 数据源 · 交易参数 · 通知 · 界面 · 系统</p>
        </div>
        <button onClick={() => saveMutation.mutate()} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">保存设置</button>
      </div>

      <TabPanel tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── General ──────────────────────────────────── */}
        {activeTab === 'general' && (
          <div className="rounded-lg border border-border bg-card p-6 max-w-2xl space-y-5">
            <div><label className={labelCls}>语言</label><select value={general.language} onChange={(e) => setGeneral({ ...general, language: e.target.value })} className={inputCls}><option value="zh-CN">简体中文</option><option value="en">English</option></select></div>
            <div><label className={labelCls}>时区</label><select value={general.timezone} onChange={(e) => setGeneral({ ...general, timezone: e.target.value })} className={inputCls}><option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option><option value="America/New_York">America/New_York (UTC-5)</option></select></div>
            <div><label className={labelCls}>日期格式</label><select value={general.dateFormat} onChange={(e) => setGeneral({ ...general, dateFormat: e.target.value })} className={inputCls}><option>YYYY-MM-DD</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></div>
            <div><label className={labelCls}>默认货币</label><select value={general.currency} onChange={(e) => setGeneral({ ...general, currency: e.target.value })} className={inputCls}><option value="CNY">人民币 (CNY)</option><option value="USD">美元 (USD)</option></select></div>
            <div className="flex items-center justify-between"><label className="text-sm font-medium">自动保存</label><ToggleSwitch checked={general.autoSave} onChange={(v) => setGeneral({ ...general, autoSave: v })} /></div>
          </div>
        )}

        {/* ── Data Source ─────────────────────────────── */}
        {activeTab === 'datasource' && (
          <div className="space-y-4 max-w-3xl">
            {/* Tushare */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-card-foreground">Tushare Pro</h3>
                  <p className="text-xs text-muted-foreground">A股日线/财务/资金流数据</p>
                </div>
                <ToggleSwitch checked={ds.tushareEnabled} onChange={(v) => setDs({ ...ds, tushareEnabled: v })} />
              </div>
              <div className="mb-4"><label className={labelCls}>API Token</label><input type="password" value={ds.tushareToken} onChange={(e) => setDs({ ...ds, tushareToken: e.target.value })} placeholder="请输入 Tushare Pro Token" className={inputCls} /></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(ds.tushareItems).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <ToggleSwitch checked={value} onChange={(v) => setDs({ ...ds, tushareItems: { ...ds.tushareItems, [key]: v } })} />
                    <span>{({ daily: '日线', adj: '复权因子', income: '利润表', balance: '资产负债', cashflow: '现金流', fina: '财务指标', margin: '融资融券', moneyflow: '资金流向' } as Record<string, string>)[key] || key}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* AkShare */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-card-foreground">AkShare</h3>
                  <p className="text-xs text-muted-foreground">指数/宏观经济数据</p>
                </div>
                <ToggleSwitch checked={ds.akshareEnabled} onChange={(v) => setDs({ ...ds, akshareEnabled: v })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ds.akshareItems).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <ToggleSwitch checked={value} onChange={(v) => setDs({ ...ds, akshareItems: { ...ds.akshareItems, [key]: v } })} />
                    <span>{key === 'index' ? '指数数据' : '宏观数据'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Trading Config ──────────────────────────── */}
        {activeTab === 'trading-cfg' && (
          <div className="max-w-2xl space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-4">交易参数</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>默认资金 (元)</label><input type="number" value={trading.defaultCapital} onChange={(e) => setTrading({ ...trading, defaultCapital: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>手续费率</label><input type="number" step="0.0001" value={trading.commissionRate} onChange={(e) => setTrading({ ...trading, commissionRate: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>滑点估计</label><input type="number" step="0.001" value={trading.slippage} onChange={(e) => setTrading({ ...trading, slippage: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>最小下单量</label><input type="number" value={trading.minOrderAmount} onChange={(e) => setTrading({ ...trading, minOrderAmount: e.target.value })} className={inputCls} /></div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-4">风控参数</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>最大回撤限制</label><input type="number" step="0.01" value={trading.maxDrawdown} onChange={(e) => setTrading({ ...trading, maxDrawdown: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>单票最大仓位</label><input type="number" step="0.01" value={trading.maxPositionPct} onChange={(e) => setTrading({ ...trading, maxPositionPct: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>止损比例</label><input type="number" step="0.01" value={trading.stopLossPct} onChange={(e) => setTrading({ ...trading, stopLossPct: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>日亏损限额</label><input type="number" step="0.01" value={trading.dailyLossLimit} onChange={(e) => setTrading({ ...trading, dailyLossLimit: e.target.value })} className={inputCls} /></div>
              </div>
            </div>
          </div>
        )}

        {/* ── Notifications ──────────────────────────── */}
        {activeTab === 'notification' && (
          <div className="rounded-lg border border-border bg-card p-6 max-w-2xl space-y-4">
            {([
              ['strategyAlert', '策略状态变更通知', '策略启停、异常等状态变化时发送通知'],
              ['tradeExec', '交易执行通知', '委托成交、撤单等交易事件通知'],
              ['riskAlert', '风控告警通知', '风控指标超限等告警通知'],
              ['systemAlert', '系统告警通知', '系统异常、服务状态变化通知'],
              ['dailyReport', '每日报告推送', '每日收盘后推送策略绩效报告'],
            ] as const).map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
                <ToggleSwitch checked={(notif as Record<string, boolean>)[key]} onChange={(v) => setNotif({ ...notif, [key]: v })} />
              </div>
            ))}
          </div>
        )}

        {/* ── UI Settings ─────────────────────────────── */}
        {activeTab === 'ui' && (
          <div className="rounded-lg border border-border bg-card p-6 max-w-2xl space-y-5">
            <div><label className={labelCls}>主题模式</label>
              <div className="flex gap-3">
                {[['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']].map(([val, lbl]) => (
                  <label key={val} className="flex items-center gap-2 text-sm"><input type="radio" name="theme" checked={ui.theme === val} onChange={() => setUi({ ...ui, theme: val })} />{lbl}</label>
                ))}
              </div>
            </div>
            <div><label className={labelCls}>主题色</label>
              <div className="flex gap-3">
                {[['blue', '蓝色'], ['green', '绿色'], ['purple', '紫色'], ['orange', '橙色']].map(([val, lbl]) => (
                  <label key={val} className="flex items-center gap-2 text-sm"><input type="radio" name="color" checked={ui.colorScheme === val} onChange={() => setUi({ ...ui, colorScheme: val })} />{lbl}</label>
                ))}
              </div>
            </div>
            <div><label className={labelCls}>图表库</label>
              <select value={ui.chartLib} onChange={(e) => setUi({ ...ui, chartLib: e.target.value })} className={inputCls}>
                <option value="echarts">ECharts</option>
                <option value="tradingview">TradingView</option>
              </select>
            </div>
            <div><label className={labelCls}>每页行数</label>
              <select value={ui.pageSize} onChange={(e) => setUi({ ...ui, pageSize: e.target.value })} className={inputCls}>
                <option>10</option><option>20</option><option>50</option><option>100</option>
              </select>
            </div>
            <div className="flex items-center justify-between"><label className="text-sm font-medium">默认折叠侧边栏</label><ToggleSwitch checked={ui.sidebarCollapsed} onChange={(v) => setUi({ ...ui, sidebarCollapsed: v })} /></div>
          </div>
        )}

        {/* ── System Info ─────────────────────────────── */}
        {activeTab === 'system' && (
          <div className="rounded-lg border border-border bg-card p-6 max-w-2xl">
            <h3 className="font-semibold text-card-foreground mb-4">系统状态</h3>
            {sysItems.length > 0 ? (
              <div className="space-y-3">
                {sysItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无系统信息</p>
            )}
          </div>
        )}
      </TabPanel>
    </div>
  )
}
