import {
  BarChart3,
  Calculator,
  Eye,
  LayoutGrid,
  LineChart,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import EmptyState from '../components/EmptyState'
import TabPanel from '../components/ui/TabPanel'

export default function Analytics() {
  const { t } = useTranslation('analytics')
  const [activeTab, setActiveTab] = useState('tech')

  const tabs = useMemo(
    () => [
      { key: 'tech', label: t('tabs.tech'), icon: <BarChart3 size={16} /> },
      { key: 'fundamental', label: t('tabs.fundamental'), icon: <Calculator size={16} /> },
      { key: 'quant', label: t('tabs.quant'), icon: <Eye size={16} /> },
      { key: 'custom', label: t('tabs.custom'), icon: <LayoutGrid size={16} /> },
    ],
    [t]
  )

  const emptyStateConfig = {
    tech: {
      type: 'setup' as const,
      icon: <LineChart size={24} />,
      title: t('emptyStates.tech.title', 'Choose a symbol to start analyzing'),
      explanation: t(
        'emptyStates.tech.explanation',
        'Technical studies become useful after you pick a symbol in Market Data and load the latest candles.'
      ),
      primaryCTA: { label: t('emptyStates.tech.primary', 'Go to Market Data'), href: '/market-data' },
      helperText: t(
        'emptyStates.tech.helper',
        'Next step: select a symbol, then come back to compare momentum, trend, and volatility.'
      ),
    },
    fundamental: {
      type: 'activity' as const,
      icon: <Calculator size={24} />,
      title: t('emptyStates.fundamental.title', 'This symbol does not have analysis data yet'),
      explanation: t(
        'emptyStates.fundamental.explanation',
        'When fundamental fields or derived metrics are missing, the safest next step is to check system sync health first.'
      ),
      primaryCTA: {
        label: t('emptyStates.fundamental.primary', 'Check system status'),
        href: '/settings?tab=system-management',
      },
      helperText: t(
        'emptyStates.fundamental.helper',
        'After the relevant data source catches up, valuation and factor panels will become more meaningful.'
      ),
    },
    quant: {
      type: 'setup' as const,
      icon: <Eye size={24} />,
      title: t('emptyStates.quant.title', 'Run a backtest before reading analytics'),
      explanation: t(
        'emptyStates.quant.explanation',
        'Quant metrics are much more helpful once you have your first backtest result to benchmark against.'
      ),
      primaryCTA: { label: t('emptyStates.quant.primary', 'Start first backtest'), href: '/backtest' },
      helperText: t(
        'emptyStates.quant.helper',
        'A single completed backtest is enough to unlock win rate, drawdown, and return-quality analysis.'
      ),
    },
  } as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          {t('exportReport')}
        </button>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'tech' && <EmptyState {...emptyStateConfig.tech} />}
        {activeTab === 'fundamental' && <EmptyState {...emptyStateConfig.fundamental} />}
        {activeTab === 'quant' && <EmptyState {...emptyStateConfig.quant} />}

        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <LayoutGrid size={32} className="mx-auto mb-3 text-muted-foreground/70" />
              <p className="text-sm font-medium text-foreground">{t('custom.inProgress')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('custom.supports')}</p>
            </div>
          </div>
        )}
      </TabPanel>
    </div>
  )
}
