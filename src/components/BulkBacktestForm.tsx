import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Layers, Play, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { marketDataAPI, queueAPI, strategiesAPI } from '../lib/api'

interface BulkBacktestFormProps {
  onClose: () => void
  onSubmitSuccess?: (jobId: string) => void
}

interface Stock {
  symbol: string
  name: string
  vt_symbol: string
  ts_code: string
  exchange: string
  industry?: string
}

type SelectionMode = 'industry' | 'exchange' | 'manual'

export default function BulkBacktestForm({ onClose, onSubmitSuccess }: BulkBacktestFormProps) {
  const queryClient = useQueryClient()

  const [strategyId, setStrategyId] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [initialCapital, setInitialCapital] = useState('100000')
  const [rate, setRate] = useState('0.0003')
  const [slippage, setSlippage] = useState('0.0001')
  const [benchmark, setBenchmark] = useState('399300.SZ')
  const [error, setError] = useState('')

  // Symbol selection
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('industry')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedExchange, setSelectedExchange] = useState('')
  const [selectedSymbols, setSelectedSymbols] = useState<Map<string, Stock>>(new Map())
  const [manualSearch, setManualSearch] = useState('')
  const [showManualDropdown, setShowManualDropdown] = useState(false)
  const manualRef = useRef<HTMLDivElement>(null)

  const benchmarkOptions = [
    { value: '399300.SZ', label: 'HS300 (沪深300)' },
  ]

  // Default dates
  useEffect(() => {
    const today = new Date()
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(today.getFullYear() - 1)
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(oneYearAgo.toISOString().split('T')[0])
  }, [])

  // Strategies
  const { data: strategiesData, isLoading: isLoadingStrategies } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => strategiesAPI.list(),
  })
  const strategies = strategiesData?.data || []

  useEffect(() => {
    if (!strategyId && strategies.length > 0) {
      const first = strategies.find((s: any) => s.is_active) || strategies[0]
      if (first) setStrategyId(String(first.id))
    }
  }, [strategies, strategyId])

  // Sectors (industries)
  const { data: sectorsData } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => marketDataAPI.sectors(),
  })
  const sectors: { name: string; count: number }[] = sectorsData?.data || []

  // Exchanges
  const { data: exchangesData } = useQuery({
    queryKey: ['exchanges'],
    queryFn: () => marketDataAPI.exchanges(),
  })
  const exchanges: { code: string; name: string; count: number }[] = exchangesData?.data || []

  // Filtered symbols (by industry or exchange)
  const filterParams = selectionMode === 'industry' && selectedIndustry
    ? { industry: selectedIndustry }
    : selectionMode === 'exchange' && selectedExchange
    ? { exchange: selectedExchange }
    : null

  const { data: filteredData, isLoading: isLoadingFiltered } = useQuery({
    queryKey: ['symbols-by-filter', filterParams],
    queryFn: () => marketDataAPI.symbolsByFilter(filterParams!),
    enabled: !!filterParams,
  })
  const filteredStocks: Stock[] = filteredData?.data || []

  // Manual symbol search (paginated)
  const PAGE_SIZE = 20
  const {
    data: manualPages,
    isLoading: isLoadingManual,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<Stock[]>({
    queryKey: ['manual-stocks', manualSearch],
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number
      const res = await marketDataAPI.symbols(undefined, manualSearch.trim() || undefined, PAGE_SIZE, offset)
      return res.data as Stock[]
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined),
    enabled: selectionMode === 'manual',
  })
  const manualStocks: Stock[] = manualPages?.pages.flat() || []

  // Close manual dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (manualRef.current && !manualRef.current.contains(e.target as Node)) {
        setShowManualDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Select / deselect helpers
  const toggleSymbol = (stock: Stock) => {
    setSelectedSymbols(prev => {
      const next = new Map(prev)
      const key = stock.ts_code || stock.vt_symbol
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.set(key, stock)
      }
      return next
    })
  }

  const selectAll = (stocks: Stock[]) => {
    setSelectedSymbols(prev => {
      const next = new Map(prev)
      for (const s of stocks) {
        next.set(s.ts_code || s.vt_symbol, s)
      }
      return next
    })
  }

  const deselectAll = (stocks: Stock[]) => {
    setSelectedSymbols(prev => {
      const next = new Map(prev)
      for (const s of stocks) {
        next.delete(s.ts_code || s.vt_symbol)
      }
      return next
    })
  }

  const removeChip = (key: string) => {
    setSelectedSymbols(prev => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: (data: any) => queueAPI.submitBulkBacktest(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['backtest-jobs'] })
      const jobId = response.data?.job_id
      if (onSubmitSuccess && jobId) onSubmitSuccess(jobId)
      onClose()
    },
    onError: (err: any) => {
      const resp = err?.response?.data
      let msg = 'Failed to submit bulk backtest'
      if (resp?.detail) {
        msg = typeof resp.detail === 'string' ? resp.detail : JSON.stringify(resp.detail)
      }
      setError(msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!strategyId) { setError('Please select a strategy'); return }
    if (selectedSymbols.size === 0) { setError('Please select at least one symbol'); return }
    if (!startDate || !endDate) { setError('Please select start and end dates'); return }
    if (new Date(startDate) >= new Date(endDate)) { setError('End date must be after start date'); return }

    const selectedStrategy = strategies.find((s: any) => String(s.id) === strategyId)

    // Convert selected symbols to ts_code format (000001.SZ) for the backend
    const symbolList = Array.from(selectedSymbols.values()).map(s => s.ts_code || s.vt_symbol)

    submitMutation.mutate({
      strategy_id: parseInt(strategyId),
      strategy_name: selectedStrategy?.name || '',
      symbols: symbolList,
      start_date: startDate,
      end_date: endDate,
      parameters: {},
      initial_capital: parseFloat(initialCapital),
      rate: parseFloat(rate),
      slippage: parseFloat(slippage),
      benchmark,
    })
  }

  // Are all filtered stocks selected?
  const allFilteredSelected = filteredStocks.length > 0 && filteredStocks.every(s => selectedSymbols.has(s.ts_code || s.vt_symbol))

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Bulk Backtest</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-md transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          {/* Strategy */}
          <div>
            <label className="block text-sm font-medium mb-2">Strategy *</label>
            <select
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              required
              disabled={isLoadingStrategies}
            >
              <option value="">{isLoadingStrategies ? 'Loading...' : 'Select a strategy'}</option>
              {strategies.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} v{s.version || 1} ({s.class_name})
                </option>
              ))}
            </select>
          </div>

          {/* Symbol Selection Mode */}
          <div>
            <label className="block text-sm font-medium mb-2">Symbol Selection *</label>
            <div className="flex gap-1 mb-3">
              {(['industry', 'exchange', 'manual'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectionMode(mode)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors capitalize ${
                    selectionMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {mode === 'industry' ? 'By Industry' : mode === 'exchange' ? 'By Exchange' : 'Manual'}
                </button>
              ))}
            </div>

            {/* Industry picker */}
            {selectionMode === 'industry' && (
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select industry...</option>
                    {sectors.map(s => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.count})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedIndustry && (
                  <SymbolCheckboxList
                    stocks={filteredStocks}
                    selected={selectedSymbols}
                    loading={isLoadingFiltered}
                    allSelected={allFilteredSelected}
                    onToggle={toggleSymbol}
                    onSelectAll={() => selectAll(filteredStocks)}
                    onDeselectAll={() => deselectAll(filteredStocks)}
                  />
                )}
              </div>
            )}

            {/* Exchange picker */}
            {selectionMode === 'exchange' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {exchanges.map(ex => (
                    <button
                      key={ex.code}
                      type="button"
                      onClick={() => setSelectedExchange(ex.code)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        selectedExchange === ex.code
                          ? 'bg-blue-500 text-white'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {ex.code} ({ex.count})
                    </button>
                  ))}
                </div>
                {selectedExchange && (
                  <SymbolCheckboxList
                    stocks={filteredStocks}
                    selected={selectedSymbols}
                    loading={isLoadingFiltered}
                    allSelected={allFilteredSelected}
                    onToggle={toggleSymbol}
                    onSelectAll={() => selectAll(filteredStocks)}
                    onDeselectAll={() => deselectAll(filteredStocks)}
                  />
                )}
              </div>
            )}

            {/* Manual search */}
            {selectionMode === 'manual' && (
              <div ref={manualRef} className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => { setManualSearch(e.target.value); setShowManualDropdown(true) }}
                    onFocus={() => setShowManualDropdown(true)}
                    className="w-full px-3 py-2 pr-10 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Search by code or name..."
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                  {showManualDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
                      {isLoadingManual ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">Loading...</div>
                      ) : manualStocks.length > 0 ? (
                        manualStocks.map(stock => {
                          const key = stock.ts_code || stock.vt_symbol
                          const isSelected = selectedSymbols.has(key)
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleSymbol(stock as Stock)}
                              className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b border-border last:border-0 flex items-center justify-between ${
                                isSelected ? 'bg-primary/5' : ''
                              }`}
                            >
                              <div>
                                <span className="font-medium text-sm">{stock.symbol}</span>
                                <span className="text-xs text-muted-foreground ml-2">{stock.name}</span>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-primary" />}
                            </button>
                          )
                        })
                      ) : (
                        <div className="p-3 text-sm text-muted-foreground text-center">No results</div>
                      )}
                      {(hasNextPage || isFetchingNextPage) && (
                        <div className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => fetchNextPage()}
                            className="px-3 py-1 rounded bg-muted/20 hover:bg-muted text-sm"
                          >
                            {isFetchingNextPage ? 'Loading...' : '...'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected chips */}
            {selectedSymbols.size > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {selectedSymbols.size} symbol{selectedSymbols.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedSymbols(new Map())}
                    className="text-xs text-destructive hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {Array.from(selectedSymbols.entries()).map(([key, stock]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                    >
                      {stock.symbol} {stock.name}
                      <button type="button" onClick={() => removeChip(key)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date *</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>
          </div>

          {/* Capital */}
          <div>
            <label className="block text-sm font-medium mb-2">Initial Capital *</label>
            <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              min="0" step="1000" required />
          </div>

          {/* Rate / slippage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Commission Rate</label>
              <input type="number" value={rate} onChange={(e) => setRate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                min="0" step="0.0001" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Slippage</label>
              <input type="number" value={slippage} onChange={(e) => setSlippage(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                min="0" step="0.0001" />
            </div>
          </div>

          {/* Benchmark */}
          <div>
            <label className="block text-sm font-medium mb-2">Benchmark *</label>
            <select value={benchmark} onChange={(e) => setBenchmark(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring" required>
              {benchmarkOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button type="button" onClick={onClose}
            className="px-4 py-2 border border-input rounded-md hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
            <Play className="h-4 w-4" />
            {submitMutation.isPending ? 'Submitting...' : `Bulk Test (${selectedSymbols.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Sub-component: checkbox list for industry/exchange mode ---------- */

function SymbolCheckboxList({
  stocks, selected, loading, allSelected, onToggle, onSelectAll, onDeselectAll,
}: {
  stocks: Stock[]
  selected: Map<string, Stock>
  loading: boolean
  allSelected: boolean
  onToggle: (s: Stock) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}) {
  if (loading) return <div className="text-sm text-muted-foreground py-2">Loading symbols...</div>
  if (stocks.length === 0) return <div className="text-sm text-muted-foreground py-2">No symbols found</div>

  return (
    <div className="border border-border rounded-md">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">{stocks.length} symbols</span>
        <button
          type="button"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="text-xs text-primary hover:underline"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-0">
        {stocks.map(stock => {
          const key = stock.ts_code || stock.vt_symbol
          const checked = selected.has(key)
          return (
            <label
              key={key}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/40 text-sm border-b border-r border-border ${
                checked ? 'bg-primary/5' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(stock)}
                className="rounded border-input"
              />
              <span className="font-mono text-xs">{stock.symbol}</span>
              <span className="text-xs text-muted-foreground truncate">{stock.name}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
