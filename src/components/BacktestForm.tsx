import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Play, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { marketDataAPI, queueAPI, strategiesAPI } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import SymbolSearch from './SymbolSearch'

interface BacktestFormProps {
  onClose: () => void
  onSubmitSuccess?: (jobId: string) => void
}

interface Strategy {
  id: number
  name: string
  class_name: string
  is_active: boolean
  parameters?: Record<string, unknown>
  version?: number
}

export default function BacktestForm({ onClose, onSubmitSuccess }: BacktestFormProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  console.log('Current user:', user)

  const [strategyId, setStrategyId] = useState<string>('')
  const [symbol, setSymbol] = useState('')
  const [symbolName, setSymbolName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [initialCapital, setInitialCapital] = useState('100000')
  const [rate, setRate] = useState('0.0003')
  const [slippage, setSlippage] = useState('0.0001')
  const [benchmark, setBenchmark] = useState('399300.SZ')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'basic' | 'parameters'>('basic')
  const [parameters, setParameters] = useState<string>('{}')

  // Benchmark options (can be extended later)
  const [benchmarkOptions, setBenchmarkOptions] = useState<{value:string,label:string}[]>([
    { value: '399300.SZ', label: 'HS300 (沪深300)' },
    { value: '000016.SH', label: 'SSE50 (上证50)' },
    { value: '000905.SH', label: 'CSI500 (中证500)' },
    { value: '399006.SZ', label: 'ChiNext (创业板指)' },
    { value: '000001.SH', label: 'SSE Composite (上证综指)' },
  ])

  // Load benchmark index options from backend
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const resp = await marketDataAPI.indexes()
        if (!mounted) return
        const data = resp?.data || []
        if (Array.isArray(data) && data.length > 0) {
          setBenchmarkOptions(data)
        }
      } catch (e) {
        // fallback: keep default list
      }
    })()
    return () => { mounted = false }
  }, [])

  // Set default dates (recent one year)
  useEffect(() => {
    const today = new Date()
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(today.getFullYear() - 1)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(oneYearAgo.toISOString().split('T')[0])
  }, [])

  // Fetch strategies from DB
  const { data: strategiesData, isLoading: isLoadingStrategies, isError: isErrorStrategies } = useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const result = await strategiesAPI.list()
      console.log('Strategies API response:', result)
      console.log('Strategies data:', result?.data)
      return result
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })

  const strategies = useMemo<Strategy[]>(() => {
    const payload = strategiesData?.data
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && 'data' in payload) {
      const nested = (payload as { data?: unknown }).data
      if (Array.isArray(nested)) return nested as Strategy[]
    }
    return []
  }, [strategiesData])
  
  console.log('Final strategies array:', strategies)
  try {
    console.log('Final strategies JSON:', JSON.stringify(strategies, null, 2))
  } catch (e) {
    console.log('Could not stringify strategies', e)
  }


  // Auto-select first active strategy
  useEffect(() => {
    if (!strategyId && strategies.length > 0) {
      const firstActive = strategies.find((s) => s.is_active) ?? strategies[0]
      if (firstActive) {
        setStrategyId(String(firstActive.id))
        // Load strategy's default parameters
        console.log('Auto-selected strategy:', firstActive)
        if (firstActive.parameters) {
          setParameters(JSON.stringify(firstActive.parameters, null, 2))
        }
      }
    }
  }, [strategies, strategyId])

  // Update parameters when strategy changes
  useEffect(() => {
    if (strategyId) {
      const selected = strategies.find((s) => String(s.id) === strategyId)
      if (selected && selected.parameters && Object.keys(selected.parameters).length > 0) {
        setParameters(JSON.stringify(selected.parameters, null, 2))
      } else {
        // If the list endpoint doesn't include parameters, fetch full strategy details
        ;(async () => {
          try {
            const resp = await strategiesAPI.get(parseInt(strategyId))
            const data = resp?.data
            console.log('Fetched strategy details for backtest form (status:', resp?.status, '):', data)
            const paramsObj = data?.parameters || {}
            console.log('Populating parameters state with:', paramsObj)
            setParameters(JSON.stringify(paramsObj, null, 2))
          } catch (e) {
            console.error('Failed to fetch strategy details for parameters:', e)
            setParameters('{}')
          }
        })()
      }
    }
  }, [strategyId, strategies])

  const submitMutation = useMutation({
    mutationFn: (data: {
      strategy_id?: number
      strategy_class?: string
      symbol: string
      start_date: string
      end_date: string
      initial_capital?: number
      rate?: number
      slippage?: number
      parameters?: Record<string, unknown>
    }) => queueAPI.submitBacktest(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['backtests'] })
      queryClient.invalidateQueries({ queryKey: ['queue-jobs'] })
      const jobId = response.data?.job_id || response.data?.id
      if (onSubmitSuccess && jobId) {
        onSubmitSuccess(jobId)
      }
      onClose()
    },
    onError: (err: unknown) => {
      // Normalize various error shapes (string, array, object) into a string
      // and avoid rendering raw objects which cause React to crash.
      const e = err as { response?: { data?: { detail?: unknown } } }
      console.error('Backtest submit error:', e)

      let message = 'Failed to submit backtest'
      const resp = e?.response?.data
      const detail = resp?.detail

      if (typeof detail === 'string') {
        message = detail
      } else if (Array.isArray(detail)) {
        // pydantic validation errors -> array of {loc,msg,...}
        const parts = detail.map((d) => {
          if (typeof d === 'string') return d
          if (d && typeof d === 'object' && 'msg' in d) {
            const msg = (d as { msg?: unknown }).msg
            return typeof msg === 'string' ? msg : JSON.stringify(d)
          }
          return JSON.stringify(d)
        })
        message = parts.join('; ')
      } else if (detail && typeof detail === 'object') {
        message = JSON.stringify(detail)
      } else if (typeof resp === 'string') {
        message = resp
      }

      setError(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!strategyId) {
      setError('Please select a strategy')
      return
    }

    if (!symbol) {
      setError('Please select a symbol')
      return
    }

    if (!startDate || !endDate) {
      setError('Please select start and end dates')
      return
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('End date must be after start date')
      return
    }

    // Parse parameters
    let paramsObj: Record<string, unknown> = {}
    try {
      paramsObj = parameters && parameters.trim() ? JSON.parse(parameters) : {}
    } catch {
      setError('Parameters must be valid JSON')
      return
    }

    const selectedStrategy = strategies.find((s) => String(s.id) === strategyId)

    submitMutation.mutate({
      strategy_id: strategyId ? parseInt(strategyId) : undefined,
      strategy_name: selectedStrategy?.name || '',
      symbol: symbol.trim(),
      symbol_name: symbolName,
      start_date: startDate,
      end_date: endDate,
      parameters: paramsObj,
      initial_capital: parseFloat(initialCapital),
      rate: parseFloat(rate),
      slippage: parseFloat(slippage),
      benchmark: benchmark,
    })
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">Submit Backtest</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'basic'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Basic Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parameters')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'parameters'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Strategy Parameters
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {activeTab === 'basic' && (
            <>

          <div>
            <label htmlFor="strategy" className="block text-sm font-medium mb-2">
              Strategy *
            </label>
            <select
              id="strategy"
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              required
              disabled={isLoadingStrategies}
            >
              <option value="">
                {isLoadingStrategies ? 'Loading strategies...' : isErrorStrategies ? 'Error loading strategies' : strategies.length === 0 ? 'No strategies available' : 'Select a strategy'}
              </option>
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name} v{strategy.version || 1} ({strategy.class_name}) {!strategy.is_active && '(Inactive)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="symbol" className="block text-sm font-medium mb-2">Symbol *</label>
            <SymbolSearch
              onChoose={(stock) => {
                setSymbol(stock.vt_symbol || '')
                setSymbolName(stock.name || '')
              }}
            />
            {symbol && (
              <div className="mt-1 text-xs text-muted-foreground">Selected: {symbol}{symbolName ? ` — ${symbolName}` : ''}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium mb-2">
                Start Date *
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                End Date *
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="initialCapital" className="block text-sm font-medium mb-2">
              Initial Capital *
            </label>
            <input
              id="initialCapital"
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              min="0"
              step="1000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rate" className="block text-sm font-medium mb-2">
                Commission Rate
              </label>
              <input
                id="rate"
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                min="0"
                step="0.0001"
              />
            </div>
            <div>
              <label htmlFor="slippage" className="block text-sm font-medium mb-2">
                Slippage
              </label>
              <input
                id="slippage"
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                min="0"
                step="0.0001"
              />
            </div>
          </div>

          <div>
            <label htmlFor="benchmark" className="block text-sm font-medium mb-2">
              Benchmark *
            </label>
            <select
              id="benchmark"
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              {benchmarkOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          </>
          )}

          {activeTab === 'parameters' && (
            <div>
              <label htmlFor="parameters" className="block text-sm font-medium mb-2">
                Strategy Parameters (JSON)
              </label>
              <textarea
                id="parameters"
                value={parameters}
                onChange={(e) => setParameters(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                rows={18}
                placeholder='{"fast_window": 5, "slow_window": 20}'
              />
              <p className="text-xs text-muted-foreground mt-2">
                Override strategy default parameters. Leave unchanged to use defaults from the strategy.
              </p>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-input rounded-md hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {submitMutation.isPending ? 'Submitting...' : 'Submit Backtest'}
          </button>
        </div>
      </div>
    </div>
  )
}
