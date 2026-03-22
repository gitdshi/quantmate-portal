import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  GitCompare,
  Library,
  LineChart as LineChartIcon,
  Plus,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import Modal from '../components/ui/Modal'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/Toast'
import { factorAPI } from '../lib/api'

interface Factor {
  id: string
  name: string
  category: string
  ic: number
  icir: number
  turnover: number
  coverage: number
  status: string
  formula?: string
}

export default function FactorLab() {
  const { t } = useTranslation('social')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('library')
  const [newFactorModal, setNewFactorModal] = useState(false)
  const [search, setSearch] = useState('')
  const [, setSelectedFactor] = useState<string | null>(null)

  const tabs = [
    { key: 'library', label: t('factorLab.tabs.library'), icon: <Library size={16} /> },
    { key: 'icir', label: t('factorLab.tabs.icir'), icon: <LineChartIcon size={16} /> },
    { key: 'combine', label: t('factorLab.tabs.combine'), icon: <GitCompare size={16} /> },
    { key: 'backtest', label: t('factorLab.tabs.backtest'), icon: <TrendingUp size={16} /> },
  ]

  const { data: factors = [] } = useQuery<Factor[]>({
    queryKey: ['factors'],
    queryFn: () =>
      factorAPI.list().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; category: string; formula: string }) => factorAPI.create(data),
    onSuccess: () => {
      showToast(t('factorLab.created'), 'success')
      setNewFactorModal(false)
      queryClient.invalidateQueries({ queryKey: ['factors'] })
    },
    onError: () => showToast(t('factorLab.createFailed'), 'error'),
  })

  const filtered = factors.filter(
    (factor) => !search || factor.name.includes(search) || factor.category.includes(search)
  )

  const factorCols: Column<Factor>[] = [
    {
      key: 'name',
      label: t('factorLab.columns.name'),
      render: (factor) => (
        <span
          className="font-medium cursor-pointer text-primary hover:underline"
          onClick={() => {
            setSelectedFactor(factor.name)
            setActiveTab('icir')
          }}
        >
          {factor.name}
        </span>
      ),
    },
    {
      key: 'category',
      label: t('factorLab.columns.category'),
      render: (factor) => <Badge variant="primary">{factor.category}</Badge>,
    },
    {
      key: 'ic',
      label: t('factorLab.columns.ic'),
      render: (factor) => (
        <span className={factor.ic >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
          {factor.ic.toFixed(3)}
        </span>
      ),
    },
    {
      key: 'icir',
      label: t('factorLab.columns.icir'),
      render: (factor) => (
        <span className={factor.icir >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
          {factor.icir.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'turnover',
      label: t('factorLab.columns.turnover'),
      render: (factor) => `${(factor.turnover * 100).toFixed(0)}%`,
    },
    {
      key: 'coverage',
      label: t('factorLab.columns.coverage'),
      render: (factor) => `${factor.coverage}%`,
    },
    {
      key: 'status',
      label: t('factorLab.columns.status'),
      render: (factor) => (
        <Badge variant={factor.status === 'active' ? 'success' : 'warning'}>
          {factor.status === 'active'
            ? t('factorLab.status.active')
            : t('factorLab.status.testing')}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('factorLab.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('factorLab.subtitle')}</p>
        </div>
        <button
          onClick={() => setNewFactorModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"
        >
          <Plus size={16} />
          {t('factorLab.newFactor')}
        </button>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'library' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <FilterBar
                filters={[{ key: 'search', label: t('factorLab.search'), type: 'search' as const }]}
                values={{ search }}
                onChange={(v) => setSearch((v.search as string) || '')}
              />
              <div className="text-sm text-muted-foreground">
                {t('factorLab.total', { count: filtered.length })}
              </div>
            </div>
            <DataTable columns={factorCols} data={filtered} emptyText={t('factorLab.empty.library')} />
          </div>
        )}

        {activeTab === 'icir' && (
          <p className="text-center text-muted-foreground py-8">{t('factorLab.empty.icir')}</p>
        )}
        {activeTab === 'combine' && (
          <p className="text-center text-muted-foreground py-8">{t('factorLab.empty.combine')}</p>
        )}
        {activeTab === 'backtest' && (
          <p className="text-center text-muted-foreground py-8">{t('factorLab.empty.backtest')}</p>
        )}
      </TabPanel>

      <Modal
        open={newFactorModal}
        onClose={() => setNewFactorModal(false)}
        title={t('factorLab.modal.title')}
        footer={
          <>
            <button
              onClick={() => setNewFactorModal(false)}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
            >
              {t('factorLab.modal.cancel')}
            </button>
            <button
              onClick={() =>
                createMutation.mutate({
                  name: t('factorLab.modal.newFactorName'),
                  category: t('factorLab.modal.customCategory'),
                  formula: '',
                })
              }
              className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90"
            >
              {t('factorLab.modal.submit')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('factorLab.modal.name')}</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
              placeholder={t('factorLab.modal.namePlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('factorLab.modal.category')}</label>
              <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option>{t('factorLab.modal.technical')}</option>
                <option>{t('factorLab.modal.fundamental')}</option>
                <option>{t('factorLab.modal.style')}</option>
                <option>{t('factorLab.modal.customCategory')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('factorLab.modal.frequency')}</label>
              <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option>{t('factorLab.modal.daily')}</option>
                <option>{t('factorLab.modal.weekly')}</option>
                <option>{t('factorLab.modal.monthly')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('factorLab.modal.formula')}</label>
            <textarea className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background min-h-[120px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('factorLab.modal.lookback')}</label>
              <input type="number" defaultValue={20} className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('factorLab.modal.normalize')}</label>
              <select className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background">
                <option>{t('factorLab.modal.raw')}</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
