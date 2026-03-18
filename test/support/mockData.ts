import type { BacktestResult, Job, QueueStats, Strategy, User } from '../types'

export const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockStrategy: Strategy = {
  id: 1,
  name: 'Test Strategy',
  class_name: 'TestStrategy',
  description: 'A test strategy',
  code: 'class TestStrategy:\n    pass',
  user_id: 1,
  is_active: true,
  parameters: { period: 20 },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockStrategies: Strategy[] = [
  mockStrategy,
  {
    ...mockStrategy,
    id: 2,
    name: 'Another Strategy',
    is_active: false,
  },
]

export const mockBacktestResult: BacktestResult = {
  job_id: 'test-job-123',
  status: 'finished',
  symbol: 'AAPL',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  initial_capital: 100000,
  statistics: {
    total_return: 15.5,
    annual_return: 15.5,
    max_drawdown: -10.2,
    sharpe_ratio: 1.8,
    total_trades: 50,
    winning_rate: 65.5,
    profit_factor: 2.1,
  },
  trades: [],
  completed_at: '2024-12-31T23:59:59Z',
}

export const mockJob: Job = {
  job_id: 'job-123',
  user_id: 1,
  type: 'backtest',
  status: 'started',
  progress: 50,
  progress_message: 'Processing...',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:01:00Z',
}

export const mockQueueStats: QueueStats = {
  queues: {
    default: {
      queued: 5,
      failed: 2,
      finished: 100,
      started: 3,
    },
  },
}

export const mockAnalyticsData = {
  portfolio_stats: {
    total_value: 150000,
    total_pnl: 50000,
    total_pnl_pct: 50,
    daily_pnl: 500,
    daily_pnl_pct: 0.33,
    positions_count: 5,
  },
  performance_history: [
    {
      date: '2024-01-01',
      portfolio_value: 100000,
      daily_return: 0,
      cumulative_return: 0,
    },
    {
      date: '2024-01-02',
      portfolio_value: 101000,
      daily_return: 1,
      cumulative_return: 1,
    },
  ],
  strategy_performance: [
    {
      strategy_name: 'Test Strategy',
      total_trades: 50,
      winning_rate: 65,
      total_return: 15.5,
      sharpe_ratio: 1.8,
    },
  ],
  sector_allocation: [
    {
      sector: 'Technology',
      value: 50000,
      percentage: 50,
    },
    {
      sector: 'Finance',
      value: 30000,
      percentage: 30,
    },
  ],
  risk_metrics: {
    volatility: 15.5,
    max_drawdown: -10.2,
    var_95: -2.5,
    beta: 1.2,
    alpha: 5.5,
  },
}

export const mockRiskMetrics = {
  volatility: {
    daily: 1.5,
    monthly: 5.2,
    annual: 18.0,
  },
  value_at_risk: {
    var_95: -2.5,
    var_99: -3.8,
    cvar_95: -4.2,
  },
  drawdown: {
    current: -5.0,
    max: -10.2,
    max_duration: 15,
    recovery_time: 10,
  },
  beta: {
    beta: 1.2,
    alpha: 5.5,
    r_squared: 0.85,
  },
  concentration: {
    top_position_pct: 25,
    top_3_positions_pct: 60,
    top_5_positions_pct: 85,
    herfindahl_index: 0.18,
  },
  liquidity: {
    cash_ratio: 0.25,
    current_ratio: 1.8,
    quick_ratio: 1.5,
  },
}

export const mockPosition = {
  id: 1,
  symbol: 'AAPL',
  strategy_name: 'Test Strategy',
  direction: 'long' as const,
  quantity: 100,
  entry_price: 150.0,
  current_price: 155.0,
  unrealized_pnl: 500,
  unrealized_pnl_pct: 3.33,
  entry_date: '2024-01-01',
  market_value: 15500,
}

export const mockClosedTrade = {
  id: 1,
  symbol: 'AAPL',
  strategy_name: 'Test Strategy',
  direction: 'long' as const,
  quantity: 100,
  entry_price: 150.0,
  exit_price: 155.0,
  realized_pnl: 500,
  realized_pnl_pct: 3.33,
  entry_date: '2024-01-01',
  exit_date: '2024-01-15',
  holding_period: 14,
}
