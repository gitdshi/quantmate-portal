import { useMutation, useQuery } from '@tanstack/react-query'
import { Bell, Database, Monitor, Palette, Server, Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import AkshareTab from '../components/AkshareTab'
import TushareProTab from '../components/TushareProTab'
import TabPanel from '../components/ui/TabPanel'
import ToggleSwitch from '../components/ui/ToggleSwitch'
import { showToast } from '../components/ui/toast-service'
import { usePermission } from '../hooks/usePermission'
import { systemAPI } from '../lib/api'

function DataSourceTab() {
  return <AkshareTab />
}

export default function Settings() {
  const { t, i18n } = useTranslation('settings')
  const { can, hasPermission } = usePermission()
  const [searchParams, setSearchParams] = useSearchParams()
  const canManageSystem = hasPermission('system.manage') || can('admin.system-config')

  const tabs = useMemo(() => {
    const baseTabs = [
      { key: 'personal', label: t('page.tabs.personal', 'Personal Settings'), icon: <Settings2 size={16} /> },
      {
        key: 'trading-preferences',
        label: t('page.tabs.tradingPreferences', 'Trading Preferences'),
        icon: <Monitor size={16} />,
      },
    ]
    if (canManageSystem) {
      baseTabs.push({
        key: 'system-management',
        label: t('page.tabs.systemManagement', 'System Management'),
        icon: <Server size={16} />,
      })
    }
    return baseTabs
  }, [canManageSystem, t])

  const [activeSystemTab, setActiveSystemTab] = useState<string>('datasources')

  const systemManagementTabs = useMemo(
    () => [
      {
        key: 'datasources',
        label: t('page.systemManagement.tabs.datasources', 'Data Sources'),
        icon: <Settings2 size={16} />,
      },
      {
        key: 'tushare-pro',
        label: t('page.systemManagement.tabs.tusharePro', 'Tushare Pro'),
        icon: <Database size={16} />,
      },
      {
        key: 'system-status',
        label: t('page.systemManagement.tabs.systemStatus', 'System Status'),
        icon: <Server size={16} />,
      },
    ],
    [t]
  )

  const activeTab = useMemo(() => {
    const requestedTab = searchParams.get('tab')
    if (requestedTab && tabs.some((tab) => tab.key === requestedTab)) {
      return requestedTab
    }
    return tabs[0]?.key ?? 'personal'
  }, [searchParams, tabs])

  const handleTabChange = (tabKey: string) => {
    const nextParams = new URLSearchParams(searchParams)
    if (tabKey === 'personal') {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', tabKey)
    }
    setSearchParams(nextParams, { replace: true })
  }

  const [general, setGeneral] = useState({
    language: (i18n.resolvedLanguage ?? i18n.language).startsWith('zh') ? 'zh' : 'en',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    currency: 'CNY',
    autoSave: true,
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

  const [notifications, setNotifications] = useState({
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
    queryFn: () => systemAPI.syncStatus().then((response) => response.data),
    enabled: activeTab === 'system-management' && activeSystemTab === 'system-status' && canManageSystem,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      await i18n.changeLanguage(general.language)
      localStorage.setItem('quantmate-lang', general.language)
      return true
    },
    onSuccess: () => showToast(t('page.saved'), 'success'),
  })

  const systemItems = systemInfo
    ? Object.entries(systemInfo).map(([key, value]) => ({
        label: key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-'),
      }))
    : []

  const inputClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm'
  const labelClass = 'mb-1 block text-sm font-medium'

  const notificationKeys = [
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
          <p className="text-sm text-muted-foreground">
            {t(
              'page.subtitle',
              'Personal preferences, trading defaults, and system management in one place.'
            )}
          </p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          className="rounded-md bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
        >
          {t('page.save')}
        </button>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={handleTabChange}>
        {activeTab === 'personal' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-6 max-w-3xl space-y-5">
              <div className="flex items-center gap-2">
                <Settings2 size={18} className="text-muted-foreground" />
                <h3 className="font-semibold text-card-foreground">
                  {t('page.sections.personalCore', 'Identity, locale, and display defaults')}
                </h3>
              </div>

              <div>
                <label className={labelClass}>{t('page.general.language')}</label>
                <select
                  value={general.language}
                  onChange={(event) => setGeneral({ ...general, language: event.target.value })}
                  className={inputClass}
                >
                  <option value="zh">{t('page.general.zh')}</option>
                  <option value="en">{t('page.general.en')}</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>{t('page.general.timezone')}</label>
                <select
                  value={general.timezone}
                  onChange={(event) => setGeneral({ ...general, timezone: event.target.value })}
                  className={inputClass}
                >
                  <option value="Asia/Shanghai">{t('page.general.timezones.shanghai')}</option>
                  <option value="America/New_York">{t('page.general.timezones.newYork')}</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>{t('page.general.dateFormat')}</label>
                <select
                  value={general.dateFormat}
                  onChange={(event) => setGeneral({ ...general, dateFormat: event.target.value })}
                  className={inputClass}
                >
                  <option>YYYY-MM-DD</option>
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>{t('page.general.currency')}</label>
                <select
                  value={general.currency}
                  onChange={(event) => setGeneral({ ...general, currency: event.target.value })}
                  className={inputClass}
                >
                  <option value="CNY">{t('page.general.cny')}</option>
                  <option value="USD">{t('page.general.usd')}</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('page.general.autoSave')}</label>
                <ToggleSwitch
                  checked={general.autoSave}
                  onChange={(value) => setGeneral({ ...general, autoSave: value })}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 max-w-3xl space-y-4">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-muted-foreground" />
                <h3 className="font-semibold text-card-foreground">
                  {t('page.sections.notifications', 'Notification preferences')}
                </h3>
              </div>

              {notificationKeys.map((key) => (
                <div key={key} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{t(`page.notification.${key}.0`)}</div>
                    <div className="text-xs text-muted-foreground">{t(`page.notification.${key}.1`)}</div>
                  </div>
                  <ToggleSwitch
                    checked={notifications[key]}
                    onChange={(value) => setNotifications({ ...notifications, [key]: value })}
                  />
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-card p-6 max-w-3xl space-y-5">
              <div className="flex items-center gap-2">
                <Palette size={18} className="text-muted-foreground" />
                <h3 className="font-semibold text-card-foreground">
                  {t('page.sections.display', 'Display preferences')}
                </h3>
              </div>

              <div>
                <label className={labelClass}>{t('page.ui.theme')}</label>
                <div className="flex gap-3">
                  {([
                    ['light', t('page.ui.light')],
                    ['dark', t('page.ui.dark')],
                    ['system', t('page.ui.system')],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="theme"
                        checked={ui.theme === value}
                        onChange={() => setUi({ ...ui, theme: value })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>{t('page.ui.colorScheme')}</label>
                <div className="flex gap-3">
                  {([
                    ['blue', t('page.ui.blue')],
                    ['green', t('page.ui.green')],
                    ['purple', t('page.ui.purple')],
                    ['orange', t('page.ui.orange')],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="color"
                        checked={ui.colorScheme === value}
                        onChange={() => setUi({ ...ui, colorScheme: value })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>{t('page.ui.chartLib')}</label>
                <select
                  value={ui.chartLib}
                  onChange={(event) => setUi({ ...ui, chartLib: event.target.value })}
                  className={inputClass}
                >
                  <option value="echarts">ECharts</option>
                  <option value="tradingview">TradingView</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trading-preferences' && (
          <div className="max-w-3xl space-y-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="mb-4 font-semibold text-card-foreground">{t('page.trading.title')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('page.trading.defaultCapital')}</label>
                  <input
                    type="number"
                    value={trading.defaultCapital}
                    onChange={(event) => setTrading({ ...trading, defaultCapital: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('page.trading.commissionRate')}</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={trading.commissionRate}
                    onChange={(event) => setTrading({ ...trading, commissionRate: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('page.trading.slippage')}</label>
                  <input
                    type="number"
                    step="0.001"
                    value={trading.slippage}
                    onChange={(event) => setTrading({ ...trading, slippage: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('page.trading.minOrderAmount')}</label>
                  <input
                    type="number"
                    value={trading.minOrderAmount}
                    onChange={(event) => setTrading({ ...trading, minOrderAmount: event.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="mb-4 font-semibold text-card-foreground">{t('page.trading.riskTitle')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('page.trading.maxDrawdown')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={trading.maxDrawdown}
                    onChange={(event) => setTrading({ ...trading, maxDrawdown: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('page.trading.maxPositionPct')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={trading.maxPositionPct}
                    onChange={(event) => setTrading({ ...trading, maxPositionPct: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('page.trading.stopLossPct')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={trading.stopLossPct}
                    onChange={(event) => setTrading({ ...trading, stopLossPct: event.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('page.trading.dailyLossLimit')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={trading.dailyLossLimit}
                    onChange={(event) => setTrading({ ...trading, dailyLossLimit: event.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system-management' && canManageSystem && (
          <div className="space-y-4">
            <TabPanel tabs={systemManagementTabs} activeTab={activeSystemTab} onChange={setActiveSystemTab}>
              {activeSystemTab === 'datasources' && <DataSourceTab />}

              {activeSystemTab === 'tushare-pro' && <TushareProTab />}

              {activeSystemTab === 'system-status' && (
                <div className="rounded-lg border border-border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Database size={18} className="text-muted-foreground" />
                    <h3 className="font-semibold text-card-foreground">
                      {t('page.system.title', 'System status')}
                    </h3>
                  </div>

                  {systemItems.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {systemItems.map((item) => (
                        <div key={item.label} className="rounded-lg border border-border bg-background px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                          <p className="mt-1 text-sm text-foreground break-all">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('page.system.empty')}</p>
                  )}
                </div>
              )}
            </TabPanel>
          </div>
        )}
      </TabPanel>
    </div>
  )
}
