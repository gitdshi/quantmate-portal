export interface User {
  id: number
  username: string
  email: string
  created_at: string
}

export interface Strategy {
  id: number
  name: string
  class_name?: string
  description?: string
  code: string
  user_id: number
  is_active: boolean
  parameters?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BacktestRequest {
  strategy_id?: number
  strategy_class?: string
  symbol: string
  start_date: string
  end_date: string
  initial_capital: number
  rate?: number
  slippage?: number
  size?: number
  pricetick?: number
  parameters?: Record<string, unknown>
}

export interface BacktestResult {
  job_id: string
  status: 'queued' | 'started' | 'finished' | 'failed' | 'cancelled'
  symbol: string
  start_date: string
  end_date: string
  initial_capital: number
  statistics?: {
    total_return: number
    annual_return: number
    max_drawdown: number
    sharpe_ratio: number
    total_trades: number
    winning_rate: number
    profit_factor: number
  }
  trades?: unknown[]
  completed_at?: string
  error?: string
}

export interface Job {
  job_id: string
  user_id: number
  type: 'backtest' | 'batch_backtest' | 'optimization'
  status: 'queued' | 'started' | 'finished' | 'failed' | 'cancelled'
  progress: number
  progress_message: string
  created_at: string
  updated_at: string
  result?: unknown
}

export interface QueueStats {
  queues: Record<string, {
    queued: number
    failed: number
    finished: number
    started: number
  }>
}
