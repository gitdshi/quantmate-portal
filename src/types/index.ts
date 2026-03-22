export interface User {
  id: number
  username: string
  email: string
  created_at: string
}

// Generic paginated response matching backend format
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    page_size: number
    total: number
  }
}

// Pagination request parameters
export interface PaginationParams {
  page?: number
  page_size?: number
}

export interface Strategy {
  id: number
  name: string
  class_name?: string
  description?: string
  code: string
  user_id: number
  version: number
  is_active: boolean
  parameters?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BacktestRequest {
  strategy_id?: number
  strategy_class?: string
  symbol: string
  symbol_name?: string
  strategy_name?: string
  start_date: string
  end_date: string
  initial_capital: number
  rate?: number
  slippage?: number
  size?: number
  pricetick?: number
  benchmark?: string
  parameters?: Record<string, unknown>
}

export interface BacktestResult {
  job_id: string
  status: 'queued' | 'started' | 'finished' | 'failed' | 'cancelled'
  symbol: string
  symbol_name?: string
  strategy_name?: string
  start_date: string
  end_date: string
  initial_capital: number
  benchmark?: string
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
  symbol_name?: string
  strategy_name?: string
  strategy_version?: number
}

export interface BulkBacktestRequest {
  strategy_id?: number
  strategy_class?: string
  strategy_name?: string
  symbols: string[]
  start_date: string
  end_date: string
  initial_capital?: number
  rate?: number
  slippage?: number
  size?: number
  pricetick?: number
  benchmark?: string
  parameters?: Record<string, unknown>
}

export interface BulkJobChildResult {
  job_id: string
  symbol: string
  symbol_name?: string
  status: string
  error?: string
  created_at?: string
  completed_at?: string
  statistics?: {
    total_return: number
    annual_return: number
    max_drawdown: number
    max_drawdown_percent?: number
    sharpe_ratio: number
    total_trades: number
    winning_rate: number
    profit_factor: number
  }
}

export interface BulkJobResultsPage {
  results: BulkJobChildResult[]
  total: number
  page: number
  page_size: number
  sort_order: 'asc' | 'desc'
}

export interface BulkBacktestSummary {
  job_id: string
  total_symbols: number
  completed_count: number
  failed_count: number
  winning_count: number
  losing_count: number
  win_rate: number
  avg_metrics: {
    total_return: number | null
    annual_return: number | null
    sharpe_ratio: number | null
    max_drawdown: number | null
    winning_rate: number | null
    profit_factor: number | null
    total_trades: number | null
  }
  top10: BulkSummarySymbol[]
  bottom10: BulkSummarySymbol[]
  return_distribution: Record<string, number>
  failed_symbols: { symbol: string; symbol_name?: string; error: string }[]
}

export interface BulkSummarySymbol {
  symbol: string
  symbol_name?: string
  total_return: number | null
  annual_return: number | null
  sharpe_ratio: number | null
  max_drawdown: number | null
  total_trades: number | null
  winning_rate: number | null
  profit_factor: number | null
}

export interface QueueStats {
  queues: Record<string, {
    queued: number
    failed: number
    finished: number
    started: number
  }>
}

export interface StrategyFile {
  name: string
  filename: string
  source: 'data' | 'project'
  path: string
  size: number
  modified: number
  hash: string
}

export interface StrategyFileContent {
  name: string
  content: string
}

export interface StrategyFileCreate {
  name: string
  content: string
  source?: 'data' | 'project'
}

export interface StrategyFileUpdate {
  content: string
  source?: 'data' | 'project'
}

export interface SyncResult {
  copied_to_data: number
  copied_to_project: number
  unchanged: number
  errors: string[]
}

export interface StrategyComparison {
  name: string
  status: 'synced' | 'data_newer' | 'project_newer' | 'different' | 'data_only' | 'project_only'
  data: StrategyFile | null
  project: StrategyFile | null
}

// ── P2 Types ─────────────────────────────────────────────────────────

export interface Order {
  id: number
  symbol: string
  direction: 'buy' | 'sell'
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit'
  quantity: number
  price?: number
  stop_price?: number
  status: 'created' | 'submitted' | 'partial_filled' | 'filled' | 'cancelled' | 'rejected' | 'expired'
  mode: 'paper' | 'live'
  filled_quantity?: number
  avg_fill_price?: number
  fee?: number
  created_at: string
  updated_at?: string
}

export interface AlertRule {
  id: number
  name: string
  metric: string
  comparator: string
  threshold: number
  level: 'info' | 'warning' | 'severe'
  is_active: boolean
  time_window?: number
  created_at: string
}

export interface AlertHistory {
  id: number
  rule_id: number
  message: string
  level: string
  status: 'unread' | 'read' | 'acknowledged'
  triggered_at: string
}

export interface NotificationChannel {
  id: number
  channel_type: 'email' | 'wechat' | 'dingtalk' | 'telegram' | 'slack' | 'webhook'
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface Report {
  id: number
  report_type: 'daily' | 'weekly' | 'monthly' | 'custom'
  title: string
  content_json?: Record<string, unknown>
  pdf_path?: string
  created_at: string
}

export interface APIKey {
  id: number
  key_id: string
  name: string
  permissions?: string[]
  expires_at?: string
  rate_limit: number
  is_active: boolean
  created_at: string
  last_used_at?: string
}

export interface UserSession {
  id: number
  device_info?: string
  ip_address?: string
  created_at: string
  expires_at: string
  last_active_at?: string
}

export interface RiskRule {
  id: number
  name: string
  rule_type: string
  threshold: number
  action: 'block' | 'reduce' | 'warn'
  is_active: boolean
  created_at: string
}

export interface BrokerConfig {
  id: number
  broker_name: string
  config: Record<string, unknown>
  is_paper: boolean
  is_active: boolean
  created_at: string
}

// ── P3 Types ─────────────────────────────────────────────────────────

export interface AIConversation {
  id: number
  user_id: number
  title: string
  model?: string
  total_tokens: number
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface AIMessage {
  id: number
  conversation_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens?: number
  created_at: string
}

export interface AIModelConfig {
  id: number
  name: string
  provider: string
  model_id: string
  api_base?: string
  max_tokens: number
  temperature: number
  is_active: boolean
  created_at: string
}

export interface FactorDefinition {
  id: number
  user_id: number
  name: string
  category: string
  expression: string
  description?: string
  status: 'draft' | 'testing' | 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface FactorEvaluation {
  id: number
  factor_id: number
  start_date: string
  end_date: string
  ic_mean?: number
  ic_std?: number
  ir?: number
  long_short_return?: number
  turnover?: number
  metrics_json?: Record<string, unknown>
  created_at: string
}

export interface StrategyTemplate {
  id: number
  author_id: number
  name: string
  description?: string
  category?: string
  code: string
  parameters_schema?: Record<string, unknown>
  is_public: boolean
  downloads: number
  avg_rating?: number
  rating_count?: number
  created_at: string
  updated_at: string
}

export interface StrategyComment {
  id: number
  template_id: number
  user_id: number
  username?: string
  content: string
  parent_id?: number
  created_at: string
}

export interface StrategyRating {
  template_id: number
  avg_rating: number
  rating_count: number
}

export interface TeamWorkspace {
  id: number
  name: string
  description?: string
  owner_id: number
  max_members: number
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  workspace_id: number
  user_id: number
  username?: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joined_at: string
}

export interface StrategyShare {
  id: number
  strategy_id: number
  shared_by: number
  shared_with_user_id: number
  permission: 'view' | 'edit' | 'execute'
  created_at: string
}

// ── Dashboard / Analytics types ──────────────────────────────────────

export interface DashboardMetrics {
  portfolio_stats: {
    total_value: number
    daily_pnl: number
    daily_pnl_pct: number
    total_pnl: number
    total_pnl_pct: number
    cash: number
  }
  performance_history: Array<{ date: string; value: number; benchmark?: number }>
  strategy_performance: Array<{ name: string; status: string; daily_return: number; total_return: number }>
  sector_allocation: Array<{ name: string; value: number }>
  risk_metrics: {
    volatility: number
    max_drawdown: number
    sharpe_ratio: number
    var_95: number
  }
}

export interface RiskMetrics {
  volatility: number
  value_at_risk: number
  max_drawdown: number
  beta: number
  sharpe_ratio: number
  concentration: number
  liquidity_score: number
}

// ── Market Data types ────────────────────────────────────────────────

export interface MarketSymbol {
  symbol: string
  name: string
  exchange: string
  vt_symbol: string
  industry?: string
  list_date?: string
}

export interface OHLCBar {
  datetime: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface MarketQuote {
  symbol: string
  name?: string
  price: number
  change: number
  change_pct: number
  volume: number
  turnover?: number
  high?: number
  low?: number
  open?: number
  prev_close?: number
}

// ── Portfolio types ──────────────────────────────────────────────────

export interface Position {
  symbol: string
  name?: string
  quantity: number
  avg_cost: number
  market_price: number
  market_value: number
  pnl: number
  pnl_pct: number
  strategy?: string
  direction?: 'long' | 'short'
}

export interface PortfolioData {
  portfolio_id: number
  cash: number
  positions: Position[]
}

export interface Transaction {
  id: number
  symbol: string
  direction: string
  quantity: number
  price: number
  fee: number
  created_at: string
}

// ── Settings types ───────────────────────────────────────────────────

export interface DataSourceItem {
  source: string
  item_key: string
  display_name?: string
  enabled: boolean
  permission?: string
  category?: string
}

export interface SystemHealth {
  version: string
  python_version?: string
  database: string
  redis: string
  uptime?: string
  disk_usage?: string
  memory_usage?: string
}

// ── User Profile ─────────────────────────────────────────────────────

export interface UserProfile {
  user_id: number
  first_name?: string
  last_name?: string
  display_name?: string
  bio?: string
  avatar_url?: string
  timezone?: string
  language?: string
  preferences?: Record<string, unknown>
}

// ── Deployment ───────────────────────────────────────────────────────

export interface PaperDeployment {
  id: number
  strategy_id: number
  strategy_name?: string
  vt_symbol: string
  status: 'running' | 'stopped' | 'error'
  parameters?: Record<string, unknown>
  created_at: string
}

export interface PaperPerformance {
  total_return: number
  sharpe_ratio: number
  max_drawdown: number
  total_trades: number
  winning_rate: number
}
