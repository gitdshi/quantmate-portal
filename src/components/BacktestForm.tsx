import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Play, X } from 'lucide-react'
import { useState } from 'react'
import { backtestAPI, strategiesAPI } from '../lib/api'
import type { BacktestRequest } from '../types'

interface BacktestFormProps {
  onClose: () => void
  onSubmitSuccess?: (jobId: string) => void
}

export default function BacktestForm({ onClose, onSubmitSuccess }: BacktestFormProps) {
  const queryClient = useQueryClient()

  const [strategyId, setStrategyId] = useState<string>('')
  const [symbol, setSymbol] = useState('AAPL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [initialCapital, setInitialCapital] = useState('100000')
  const [rate, setRate] = useState('0.0003')
  const [slippage, setSlippage] = useState('0.0001')
  const [error, setError] = useState('')

  const { data: strategiesData } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => strategiesAPI.list(),
  })

  const strategies = strategiesData?.data || []

  const submitMutation = useMutation({
    mutationFn: (data: BacktestRequest) => backtestAPI.submit(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['backtests'] })
      const jobId = response.data?.job_id || response.data?.id
      if (onSubmitSuccess && jobId) {
        onSubmitSuccess(jobId)
      }
      onClose()
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Failed to submit backtest')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!strategyId) {
      setError('Please select a strategy')
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

    submitMutation.mutate({
      strategy_id: parseInt(strategyId),
      symbol: symbol.trim(),
      start_date: startDate,
      end_date: endDate,
      initial_capital: parseFloat(initialCapital),
      rate: parseFloat(rate),
      slippage: parseFloat(slippage),
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

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
            >
              <option value="">Select a strategy</option>
              {strategies.map((strategy: { id: number; name: string; is_active: boolean }) => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name} {!strategy.is_active && '(Inactive)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="symbol" className="block text-sm font-medium mb-2">
              Symbol *
            </label>
            <input
              id="symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="AAPL"
              required
            />
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
