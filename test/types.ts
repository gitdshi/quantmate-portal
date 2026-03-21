export interface User {
  id: number
  username: string
  email: string
  created_at: string
}

export interface Strategy {
  id: number
  name: string
  class_name: string
  description?: string
  code: string
  user_id: number
  is_active: boolean
  parameters?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BacktestResult {
  job_id: string
  status: string
  symbol: string
  start_date: string
  end_date: string
  initial_capital: number
  statistics: Record<string, number>
  trades: unknown[]
  completed_at: string
}

export interface Job {
  job_id: string
  user_id: number
  type: string
  status: string
  progress: number
  progress_message: string
  created_at: string
  updated_at: string
}

export interface QueueStats {
  queues: Record<string, {
    queued: number
    failed: number
    finished: number
    started: number
  }>
}
