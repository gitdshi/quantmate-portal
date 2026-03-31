import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  FileText,
  List,
  Plus,
  PieChart as PieChartIcon,
  Radar,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import EmptyState from '../components/EmptyState'
import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { reportsAPI } from '../lib/api'
import type { Report } from '../types'

export default function Reports() {
  const { t } = useTranslation('monitoring')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('perf')
  const [newReportModal, setNewReportModal] = useState(false)

  const tabs = [
    { key: 'perf', label: t('reports.tabs.perf'), icon: <TrendingUp size={16} /> },
    { key: 'review', label: t('reports.tabs.review'), icon: <FileText size={16} /> },
    { key: 'attribution', label: t('reports.tabs.attribution'), icon: <PieChartIcon size={16} /> },
    { key: 'list', label: t('reports.tabs.list'), icon: <List size={16} /> },
  ]

  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ['reports'],
    queryFn: () =>
      reportsAPI.list().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
    enabled: activeTab === 'list',
  })

  const generateMutation = useMutation({
    mutationFn: (data: { report_type: string; title: string }) =>
      reportsAPI.generate({ report_type: data.report_type, title: data.title }),
    onSuccess: () => {
      showToast(t('reports.generating'), 'success')
      setNewReportModal(false)
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: () => showToast(t('reports.generateFailed'), 'error'),
  })

  const reportColumns: Column<Report>[] = [
    { key: 'title', label: t('reports.columns.title') },
    {
      key: 'report_type',
      label: t('reports.columns.type'),
      render: (r) => <Badge variant="primary">{r.report_type}</Badge>,
    },
    {
      key: 'created_at',
      label: t('reports.columns.createdAt'),
      render: (r) => new Date(r.created_at).toLocaleString(),
    },
  ]

  const emptyStates = {
    perf: (
      <EmptyState
        type="activity"
        icon={<TrendingUp size={24} />}
        title={t('reports.emptyStates.perf.title')}
        explanation={t('reports.emptyStates.perf.explanation')}
        primaryCTA={{ label: t('reports.emptyStates.perf.primary'), href: '/backtest' }}
        helperText={t('reports.emptyStates.perf.helper')}
      />
    ),
    review: (
      <EmptyState
        type="activity"
        icon={<FileText size={24} />}
        title={t('reports.emptyStates.review.title')}
        explanation={t('reports.emptyStates.review.explanation')}
        primaryCTA={{ label: t('reports.emptyStates.review.primary'), href: '/paper-trading' }}
        helperText={t('reports.emptyStates.review.helper')}
      />
    ),
    attribution: (
      <EmptyState
        type="setup"
        icon={<Radar size={24} />}
        title={t('reports.emptyStates.attribution.title')}
        explanation={t('reports.emptyStates.attribution.explanation')}
        primaryCTA={{ label: t('reports.emptyStates.attribution.primary'), href: '/backtest' }}
        helperText={t('reports.emptyStates.attribution.helper')}
      />
    ),
  } as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('reports.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('reports.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted">
            <Download size={14} className="inline mr-1" />
            {t('reports.exportPdf')}
          </button>
          <button
            onClick={() => setNewReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"
          >
            <Plus size={16} />
            {t('reports.createReport')}
          </button>
        </div>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'perf' && emptyStates.perf}
        {activeTab === 'review' && emptyStates.review}
        {activeTab === 'attribution' && emptyStates.attribution}
        {activeTab === 'list' && (
          <DataTable columns={reportColumns} data={reports} emptyText={t('reports.empty.list')} />
        )}
      </TabPanel>

      <Modal
        open={newReportModal}
        onClose={() => setNewReportModal(false)}
        title={t('reports.modal.title')}
        footer={
          <>
            <button
              onClick={() => setNewReportModal(false)}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
            >
              {t('reports.modal.cancel')}
            </button>
            <button
              onClick={() =>
                generateMutation.mutate({
                  report_type: 'monthly',
                  title: t('reports.modal.defaultReportTitle'),
                })
              }
              className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90"
            >
              {t('reports.modal.submit')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('reports.modal.reportType')}</label>
            <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option>{t('reports.modal.options.monthly')}</option>
              <option>{t('reports.modal.options.weekly')}</option>
              <option>{t('reports.modal.options.compare')}</option>
              <option>{t('reports.modal.options.attribution')}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('reports.modal.startDate')}</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('reports.modal.endDate')}</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('reports.modal.includeStrategies')}
            </label>
            <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
              <option>{t('reports.modal.options.all')}</option>
              <option>DualMA_Cross</option>
              <option>RSI_Reversal</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
