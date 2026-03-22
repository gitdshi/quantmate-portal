import { useMutation, useQuery } from '@tanstack/react-query'
import { Bell, Database, Monitor, Palette, Server, Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import TabPanel from '../components/ui/TabPanel'
import ToggleSwitch from '../components/ui/ToggleSwitch'
import { showToast } from '../components/ui/Toast'
import { systemAPI } from '../lib/api'

export default function Settings() {
  const { t, i18n } = useTranslation('settings')
  const [activeTab, setActiveTab] = useState('general')

  const tabs = useMemo(
    () => [
      { key: 'general', label: t('page.tabs.general'), icon: <Settings2 size={16} /> },
      { key: 'datasource', label: t('page.tabs.datasource'), icon: <Database size={16} /> },
      { key: 'trading-cfg', label: t('page.tabs.trading'), icon: <Monitor size={16} /> },
      { key: 'notification', label: t('page.tabs.notification'), icon: <Bell size={16} /> },
      { key: 'ui', label: t('page.tabs.ui'), icon: <Palette size={16} /> },
      { key: 'system', label: t('page.tabs.system'), icon: <Server size={16} /> },
    ],
    [t]
  )

  const [general, setGeneral] = useState({
    language: (i18n.resolvedLanguage ?? i18n.language).startsWith('zh') ? 'zh' : 'en',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    currency: 'CNY',
    autoSave: true,
  })

  const [ds, setDs] = useState({
    tushareToken: '',
    tushareEnabled: true,
    akshareEnabled: true,
    tushareItems: {
      daily: true,
      adj: true,
      income: true,
      balance: true,
      cashflow: true,
      fina: true,
      margin: true,
      moneyflow: true,
    },
    akshareItems: { index: true, macro: false },
  })

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

  const [notif, setNotif] = useState({
    strategyAlert: true,
    tradeExec: true,
    riskAlert: true,
    systemAlert: true,
    dailyReport: false,
  })

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
    mutationFn: async () => {
      await i18n.changeLanguage(general.language)
      localStorage.setItem('quantmate-lang', general.language)
      return true
    },
    onSuccess: () => showToast(t('page.saved'), 'success'),
  })

  const sysItems = systemInfo
    ? Object.entries(systemInfo).map(([key, value]) => ({
        label: key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-'),
      }))
    : []

  const inputCls = 'w-full px-3 py-2 text-sm rounded-md border border-border bg-background'
  const labelCls = 'block text-sm font-medium mb-1'

  const tushareLabels: Record<string, string> = {
    daily: t('page.datasource.daily'),
    adj: t('page.datasource.adj'),
    income: t('page.datasource.income'),
    balance: t('page.datasource.balance'),
    cashflow: t('page.datasource.cashflow'),
    fina: t('page.datasource.fina'),
    margin: t('page.datasource.margin'),
    moneyflow: t('page.datasource.moneyflow'),
  }

  const akshareLabels: Record<string, string> = {
    index: t('page.datasource.index'),
    macro: t('page.datasource.macro'),
  }

  const notifications = [
    'strategyAlert',
    'tradeExec',
    'riskAlert',
    'systemAlert',
    'dailyReport',
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('page.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('page.subtitle')}</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90"
        >
          {t('page.save')}
        </button>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'general' && (
          <div className="rounded-lg border border-border bg-card p-6 max-w-2xl space-y-5">
            <div>
              <label className={labelCls}>{t('page.general.language')}</label>
              <select
                value={general.language}
                onChange={(event) => setGeneral({ ...general, language: event.target.value })}
                className={inputCls}
              >
                <option value="zh">{t('page.general.zh')}</option>
                <option value="en">{t('page.general.en')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('page.general.timezone')}</label>
              <select
                value={general.timezone}
                onChange={(event) => setGeneral({ ...general, timezone: event.target.value })}
                className={inputCls}
              >
                <option value="Asia/Shanghai">{t('page.general.timezones.shanghai')}</option>
                <option value="America/New_York">{t('page.general.timezones.newYork')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('page.general.dateFormat')}</label>
              <select
                value={general.dateFormat}
                onChange={(event) => setGeneral({ ...general, dateFormat: event.target.value })}
                className={inputCls}
              >
                <option>YYYY-MM-DD</option>
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('page.general.currency')}</label>
              <select
                value={general.currency}
                onChange={(event) => setGeneral({ ...general, currency: event.target.value })}
                className={inputCls}
              >
                <option value="CNY">{t('page.general.cny')}</option>
                <option value="USD">{t('page.general.usd')}</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t('page.general.autoSave')}</label>
              <ToggleSwitch checked={general.autoSave} onChange={(value) => setGeneral({ ...general, autoSave: value })} />
            </div>
          </div>
        )}

        {activeTab === 'datasource' && (
          <div className="space-y-4 max-w-3xl">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-card-foreground">{t('page.datasource.tushareTitle')}</h3>
                  <p className="text-xs text-muted-foreground">{t('page.datasource.tushareDesc')}</p>
                </div>
                <ToggleSwitch checked={ds.tushareEnabled} onChange={(value) => setDs({ ...ds, tushareEnabled: value })} />
              </div>
              <div className="mb-4">
                <label className={labelCls}>{t('page.datasource.token')}</label>
                <input
                  type="password"
                  value={ds.tushareToken}
                  onChange={(event) => setDs({ ...ds, tushareToken: event.target.value })}
                  placeholder={t('page.datasource.tokenPlaceholder')}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(ds.tushareItems).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <ToggleSwitch
                      checked={value}
                      onChange={(nextValue) =>
                        setDs({ ...ds, tushareItems: { ...ds.tushareItems, [key]: nextValue } })
                      }
                    />
                    <span>{tushareLabels[key] || key}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-card-foreground">{t('page.datasource.akshareTitle')}</h3>
                  <p className="text-xs text-muted-foreground">{t('page.datasource.akshareDesc')}</p>
                </div>
                <ToggleSwitch checked={ds.akshareEnabled} onChange={(value) => setDs({ ...ds, akshareEnabled: value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ds.akshareItems).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <ToggleSwitch
                      checked={value}
                      onChange={(nextValue) =>
                        setDs({ ...ds, akshareItems: { ...ds.akshareItems, [key]: nextValue } })
                      }
                    />
                    <span>{akshareLabels[key] || key}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trading-cfg' && (
          <div className="max-w-2xl space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-4">{t('page.trading.title')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>{t('page.trading.defaultCapital')}</label><input type="number" value={trading.defaultCapital} onChange={(event) => setTrading({ ...trading, defaultCapital: event.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>{t('page.trading.commissionRate')}</label><input type="number" step="0.0001" value={trading.commissionRate} onChange={(event) => setTrading({ ...trading, commissionRate: event.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>{t('page.trading.slippage')}</label><input type="number" step="0.001" value={trading.slippage} onChange={(event) => setTrading({ ...trading, slippage: event.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>{t('page.trading.minOrderAmount')}</label><input type="number" value={trading.minOrderAmount} onChange={(event) => setTrading({ ...trading, minOrderAmount: event.target.value })} className={inputCls} /></div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-card-foreground mb-4">{t('page.trading.riskTitle')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>{t('page.trading.maxDrawdown')}</label><input type="number" step="0.01" value={trading.maxDrawdown} onChange={(event) => setTrading({ ...trading, maxDrawdown: event.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>{t('page.trading.maxPositionPct')}</label><input type="number" step="0.01" value={trading.maxPositionPct} onChange={(event) => setTrading({ ...trading, maxPositionPct: event.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>{t('page.trading.stopLossPct')}</label><input type="number" step="0.01" value={trading.stopLossPct} onChange={(event) => setTrading({ ...trading, stopLossPct: event.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>{t('page.trading.dailyLossLimit')}</label><input type="number" step="0.01" value={trading.dailyLossLimit} onChange={(event) => setTrading({ ...trading, dailyLossLimit: event.target.value })} className={inputCls} /></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notification' && (
          <div className="rounded-lg border border-border bg-card p-6 max-w-2xl space-y-4">
            {notifications.map((key) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{t(`page.notification.${key}.0`)}</div>
                  <div className="text-xs text-muted-foreground">{t(`page.notification.${key}.1`)}</div>
                </div>
                <ToggleSwitch
                  checked={notif[key]}
                  onChange={(value) => setNotif({ ...notif, [key]: value })}
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ui' && (
          <div className="rounded-lg border border-border bg-card p-6 max-w-2xl space-y-5">
            <div>
              <label className={labelCls}>{t('page.ui.theme')}</label>
              <div className="flex gap-3">
                {([
                  ['light', t('page.ui.light')],
                  ['dark', t('page.ui.dark')],
                  ['system', t('page.ui.system')],
                ] as const).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="theme" checked={ui.theme === value} onChange={() => setUi({ ...ui, theme: value })} />{label}</label>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('page.ui.colorScheme')}</label>
              <div className="flex gap-3">
                {([
                  ['blue', t('page.ui.blue')],
                  ['green', t('page.ui.green')],
                  ['purple', t('page.ui.purple')],
                  ['orange', t('page.ui.orange')],
                ] as const).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="color" checked={ui.colorScheme === value} onChange={() => setUi({ ...ui, colorScheme: value })} />{label}</label>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('page.ui.chartLib')}</label>
              <select value={ui.chartLib} onChange={(event) => setUi({ ...ui, chartLib: event.target.value })} className={inputCls}>
                <option value="echarts">ECharts</option>
                <option value="tradingview">TradingView</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('page.ui.pageSize')}</label>
              <select value={ui.pageSize} onChange={(event) => setUi({ ...ui, pageSize: event.target.value })} className={inputCls}>
                <option>10</option><option>20</option><option>50</option><option>100</option>
              </select>
            </div>
            <div className="flex items-center justify-between"><label className="text-sm font-medium">{t('page.ui.sidebarCollapsed')}</label><ToggleSwitch checked={ui.sidebarCollapsed} onChange={(value) => setUi({ ...ui, sidebarCollapsed: value })} /></div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="rounded-lg border border-border bg-card p-6 max-w-2xl">
            <h3 className="font-semibold text-card-foreground mb-4">{t('page.system.title')}</h3>
            {sysItems.length > 0 ? (
              <div className="space-y-3">
                {sysItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium break-all text-right max-w-[60%]">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t('page.system.empty')}</p>
            )}
          </div>
        )}
      </TabPanel>
    </div>
  )
}
