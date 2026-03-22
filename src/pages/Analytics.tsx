import {
  BarChart3,
  Calculator,
  Eye,
  LayoutGrid,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <button className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted">{t('exportReport')}</button>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Tech ──────────────────────────────────────── */}
        {activeTab === 'tech' && (
          <p className="text-center text-muted-foreground py-8">{t('empty.tech')}</p>
        )}

        {/* ── Fundamental ──────────────────────────────── */}
        {activeTab === 'fundamental' && (
          <p className="text-center text-muted-foreground py-8">{t('empty.fundamental')}</p>
        )}

        {/* ── Quant ────────────────────────────────────── */}
        {activeTab === 'quant' && (
          <p className="text-center text-muted-foreground py-8">{t('empty.quant')}</p>
        )}

        {/* ── Custom Dashboard ─────────────────────────── */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center text-muted-foreground">
              <LayoutGrid size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t('custom.inProgress')}</p>
              <p className="text-xs mt-1">{t('custom.supports')}</p>
            </div>
          </div>
        )}
      </TabPanel>
    </div>
  )
}
