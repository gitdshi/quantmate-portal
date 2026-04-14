import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Bot,
    ChevronRight,
    Database,
    Download,
    Loader2,
    Play,
    Square,
    TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { rdagentAPI } from '../lib/api'

// ── Local types ──────────────────────────────────────────────────────

interface MiningRun {
  run_id: string
  scenario: string
  status: string
  current_iteration: number
  total_iterations: number
  created_at: string
  completed_at?: string
}

interface Iteration {
  id: number
  run_id: string
  iteration_number: number
  hypothesis?: string
  experiment_code?: string
  metrics?: Record<string, number>
  feedback?: string
  status: string
  created_at: string
}

interface DiscoveredFactor {
  id: number
  run_id: string
  factor_name: string
  expression: string
  description?: string
  ic_mean?: number
  icir?: number
  sharpe?: number
  status: string
  created_at: string
}

interface CatalogSummary {
  categories: Record<string, string[]>
  total_fields: number
  sources: string[]
}

// ── Component ────────────────────────────────────────────────────────

export default function AutoPilot() {
  const { t } = useTranslation('social')
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('runs')
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  // Mining configuration
  const [scenario, setScenario] = useState('fin_factor')
  const [maxIterations, setMaxIterations] = useState(10)
  const [llmModel, setLlmModel] = useState('gpt-4o-mini')
  const [universe, setUniverse] = useState('csi300')
  const [startDate, setStartDate] = useState('2018-01-01')
  const [endDate, setEndDate] = useState('2024-12-31')

  const tabs = [
    { id: 'runs', label: 'Mining Runs', icon: <Bot className="w-4 h-4" /> },
    { id: 'catalog', label: 'Data Catalog', icon: <Database className="w-4 h-4" /> },
  ]

  // ── Queries ──────────────────────────────────────────────────────

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['rdagent-runs'],
    queryFn: () => rdagentAPI.listRuns({ limit: 50 }),
    select: (res) => res.data as MiningRun[],
  })

  const { data: iterationsData } = useQuery({
    queryKey: ['rdagent-iterations', selectedRunId],
    queryFn: () => rdagentAPI.getIterations(selectedRunId!),
    enabled: !!selectedRunId,
    select: (res) => res.data as Iteration[],
  })

  const { data: discoveredData } = useQuery({
    queryKey: ['rdagent-factors', selectedRunId],
    queryFn: () => rdagentAPI.getDiscoveredFactors(selectedRunId!),
    enabled: !!selectedRunId,
    select: (res) => res.data as DiscoveredFactor[],
  })

  const { data: catalogData } = useQuery({
    queryKey: ['rdagent-catalog'],
    queryFn: () => rdagentAPI.getDataCatalog(),
    enabled: activeTab === 'catalog',
    select: (res) => res.data as CatalogSummary,
  })

  // ── Mutations ────────────────────────────────────────────────────

  const startMining = useMutation({
    mutationFn: () =>
      rdagentAPI.startMining({
        scenario,
        max_iterations: maxIterations,
        llm_model: llmModel,
        universe,
        start_date: startDate,
        end_date: endDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdagent-runs'] })
      showToast({ type: 'success', message: 'Mining run started' })
    },
    onError: () => showToast({ type: 'error', message: 'Failed to start mining run' }),
  })

  const cancelRun = useMutation({
    mutationFn: (runId: string) => rdagentAPI.cancelRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdagent-runs'] })
      showToast({ type: 'success', message: 'Mining run cancelled' })
    },
    onError: () => showToast({ type: 'error', message: 'Failed to cancel run' }),
  })

  const importFactor = useMutation({
    mutationFn: ({ runId, factorId }: { runId: string; factorId: number }) =>
      rdagentAPI.importFactor(runId, factorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdagent-factors', selectedRunId] })
      showToast({ type: 'success', message: 'Factor imported to Factor Lab' })
    },
    onError: () => showToast({ type: 'error', message: 'Failed to import factor' }),
  })

  // ── Status badge helper ──────────────────────────────────────────

  const statusColor = (s: string) => {
    switch (s) {
      case 'running': return 'blue'
      case 'completed': return 'green'
      case 'failed': return 'red'
      case 'cancelled': return 'gray'
      default: return 'yellow'
    }
  }

  // ── Run columns ──────────────────────────────────────────────────

  const runColumns: Column<MiningRun>[] = [
    {
      key: 'run_id',
      title: 'Run ID',
      render: (row) => (
        <button
          className="text-blue-600 hover:underline text-xs font-mono"
          onClick={() => setSelectedRunId(row.run_id)}
        >
          {row.run_id.slice(0, 8)}...
        </button>
      ),
    },
    { key: 'scenario', title: 'Scenario' },
    {
      key: 'status',
      title: 'Status',
      render: (row) => <Badge color={statusColor(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'current_iteration',
      title: 'Progress',
      render: (row) => `${row.current_iteration}/${row.total_iterations}`,
    },
    { key: 'created_at', title: 'Created' },
    {
      key: 'actions' as keyof MiningRun,
      title: '',
      render: (row) =>
        (row.status === 'queued' || row.status === 'running') ? (
          <button
            className="text-red-500 hover:text-red-700"
            onClick={() => cancelRun.mutate(row.run_id)}
          >
            <Square className="w-4 h-4" />
          </button>
        ) : null,
    },
  ]

  // ── Discovered factor columns ────────────────────────────────────

  const factorColumns: Column<DiscoveredFactor>[] = [
    { key: 'factor_name', title: 'Name' },
    { key: 'expression', title: 'Expression' },
    {
      key: 'ic_mean',
      title: 'IC',
      render: (row) => row.ic_mean?.toFixed(4) ?? '-',
    },
    {
      key: 'icir',
      title: 'ICIR',
      render: (row) => row.icir?.toFixed(4) ?? '-',
    },
    {
      key: 'sharpe',
      title: 'Sharpe',
      render: (row) => row.sharpe?.toFixed(4) ?? '-',
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => <Badge color={row.status === 'imported' ? 'green' : 'yellow'}>{row.status}</Badge>,
    },
    {
      key: 'actions' as keyof DiscoveredFactor,
      title: '',
      render: (row) =>
        row.status !== 'imported' && selectedRunId ? (
          <button
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
            onClick={() => importFactor.mutate({ runId: selectedRunId, factorId: row.id })}
          >
            <Download className="w-3 h-3" /> Import
          </button>
        ) : null,
    },
  ]

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto Pilot</h1>
          <p className="text-gray-500 text-sm mt-1">
            LLM-driven autonomous factor mining powered by RD-Agent
          </p>
        </div>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'runs' && (
        <div className="space-y-6">
          {/* Start Mining Card */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Play className="w-5 h-5 text-green-600" /> Start New Mining Run
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scenario</label>
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="fin_factor">Factor Mining</option>
                  <option value="fin_model">Model Optimization</option>
                  <option value="fin_quant">Joint (Factor + Model)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Iterations</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LLM Model</label>
                <select
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Universe</label>
                <select
                  value={universe}
                  onChange={(e) => setUniverse(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="csi300">CSI 300</option>
                  <option value="csi500">CSI 500</option>
                  <option value="csi1000">CSI 1000</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={() => startMining.mutate()}
              disabled={startMining.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {startMining.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Mining
            </button>
          </div>

          {/* Runs Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Mining Runs</h2>
            </div>
            <DataTable
              columns={runColumns}
              data={runsData ?? []}
              loading={runsLoading}
              emptyMessage="No mining runs yet"
            />
          </div>

          {/* Selected Run Detail */}
          {selectedRunId && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Run Detail: {selectedRunId.slice(0, 8)}...
                </h3>

                {/* Iterations */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2">Iterations</h4>
                  {iterationsData && iterationsData.length > 0 ? (
                    <div className="space-y-2">
                      {iterationsData.map((it) => (
                        <div key={it.id} className="border rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">Iteration {it.iteration_number}</span>
                            <Badge color={statusColor(it.status)}>{it.status}</Badge>
                          </div>
                          {it.hypothesis && (
                            <p className="text-gray-600 ml-6 mb-1">
                              <strong>Hypothesis:</strong> {it.hypothesis}
                            </p>
                          )}
                          {it.feedback && (
                            <p className="text-gray-500 ml-6 text-xs">{it.feedback}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No iterations yet</p>
                  )}
                </div>

                {/* Discovered Factors */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Discovered Factors</h4>
                  <DataTable
                    columns={factorColumns}
                    data={discoveredData ?? []}
                    emptyMessage="No factors discovered yet"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-purple-600" /> Data Catalog
          </h2>
          {catalogData ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {catalogData.total_fields} numeric fields available from{' '}
                {catalogData.sources.join(', ')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(catalogData.categories)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([category, fields]) => (
                    <div key={category} className="border rounded-lg p-3">
                      <h3 className="font-medium text-gray-800 mb-1 capitalize">
                        {category}{' '}
                        <span className="text-gray-400 text-sm font-normal">
                          ({fields.length})
                        </span>
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {fields.map((f) => (
                          <span
                            key={f}
                            className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading catalog...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
