/**
 * Mock Data Validation Tests
 * Ensures test fixtures conform to expected data shapes
 */
import { describe, expect, it } from 'vitest'
import {
  mockAnalyticsData,
  mockBacktestResult,
  mockClosedTrade,
  mockJob,
  mockPosition,
  mockQueueStats,
  mockStrategies,
  mockStrategy,
  mockUser,
} from '@test/support/mockData'

describe('Mock Data - Shape Validation', () => {
  describe('mockUser', () => {
    it('has required fields', () => {
      expect(mockUser).toHaveProperty('id')
      expect(mockUser).toHaveProperty('username')
      expect(mockUser).toHaveProperty('email')
      expect(mockUser).toHaveProperty('created_at')
    })

    it('has correct types', () => {
      expect(typeof mockUser.id).toBe('number')
      expect(typeof mockUser.username).toBe('string')
      expect(typeof mockUser.email).toBe('string')
    })
  })

  describe('mockStrategy', () => {
    it('has required fields', () => {
      expect(mockStrategy).toHaveProperty('id')
      expect(mockStrategy).toHaveProperty('name')
      expect(mockStrategy).toHaveProperty('code')
      expect(mockStrategy).toHaveProperty('user_id')
      expect(mockStrategy).toHaveProperty('is_active')
    })

    it('is_active is boolean', () => {
      expect(typeof mockStrategy.is_active).toBe('boolean')
    })

    it('parameters is an object', () => {
      expect(typeof mockStrategy.parameters).toBe('object')
    })
  })

  describe('mockStrategies', () => {
    it('is an array with multiple items', () => {
      expect(Array.isArray(mockStrategies)).toBe(true)
      expect(mockStrategies.length).toBeGreaterThanOrEqual(2)
    })

    it('contains active and inactive strategies', () => {
      const active = mockStrategies.filter(s => s.is_active)
      const inactive = mockStrategies.filter(s => !s.is_active)
      expect(active.length).toBeGreaterThan(0)
      expect(inactive.length).toBeGreaterThan(0)
    })
  })

  describe('mockBacktestResult', () => {
    it('has required fields', () => {
      expect(mockBacktestResult).toHaveProperty('job_id')
      expect(mockBacktestResult).toHaveProperty('status')
      expect(mockBacktestResult).toHaveProperty('symbol')
      expect(mockBacktestResult).toHaveProperty('initial_capital')
    })

    it('has statistics with performance metrics', () => {
      const stats = mockBacktestResult.statistics
      expect(stats).toBeDefined()
      expect(stats).toHaveProperty('total_return')
      expect(stats).toHaveProperty('sharpe_ratio')
      expect(stats).toHaveProperty('max_drawdown')
      expect(stats).toHaveProperty('winning_rate')
    })
  })

  describe('mockJob', () => {
    it('has required fields', () => {
      expect(mockJob).toHaveProperty('job_id')
      expect(mockJob).toHaveProperty('user_id')
      expect(mockJob).toHaveProperty('type')
      expect(mockJob).toHaveProperty('status')
      expect(mockJob).toHaveProperty('progress')
    })

    it('progress is a number between 0 and 100', () => {
      expect(mockJob.progress).toBeGreaterThanOrEqual(0)
      expect(mockJob.progress).toBeLessThanOrEqual(100)
    })
  })

  describe('mockQueueStats', () => {
    it('has queues object', () => {
      expect(mockQueueStats).toHaveProperty('queues')
      expect(mockQueueStats.queues).toHaveProperty('default')
    })

    it('default queue has required stat fields', () => {
      const q = mockQueueStats.queues.default
      expect(q).toHaveProperty('queued')
      expect(q).toHaveProperty('failed')
      expect(q).toHaveProperty('finished')
      expect(q).toHaveProperty('started')
    })
  })

  describe('mockAnalyticsData', () => {
    it('has portfolio_stats', () => {
      expect(mockAnalyticsData.portfolio_stats).toHaveProperty('total_value')
      expect(mockAnalyticsData.portfolio_stats).toHaveProperty('total_pnl')
      expect(mockAnalyticsData.portfolio_stats).toHaveProperty('daily_pnl')
      expect(mockAnalyticsData.portfolio_stats).toHaveProperty('positions_count')
    })

    it('has performance_history array', () => {
      expect(Array.isArray(mockAnalyticsData.performance_history)).toBe(true)
      expect(mockAnalyticsData.performance_history.length).toBeGreaterThan(0)
      expect(mockAnalyticsData.performance_history[0]).toHaveProperty('date')
      expect(mockAnalyticsData.performance_history[0]).toHaveProperty('portfolio_value')
    })

    it('has strategy_performance array', () => {
      expect(Array.isArray(mockAnalyticsData.strategy_performance)).toBe(true)
      expect(mockAnalyticsData.strategy_performance[0]).toHaveProperty('strategy_name')
      expect(mockAnalyticsData.strategy_performance[0]).toHaveProperty('total_return')
    })

    it('has sector_allocation array', () => {
      expect(Array.isArray(mockAnalyticsData.sector_allocation)).toBe(true)
      expect(mockAnalyticsData.sector_allocation[0]).toHaveProperty('sector')
      expect(mockAnalyticsData.sector_allocation[0]).toHaveProperty('percentage')
    })

    it('has risk_metrics', () => {
      expect(mockAnalyticsData.risk_metrics).toHaveProperty('volatility')
    })
  })

  describe('mockPosition', () => {
    it('has trade fields', () => {
      expect(mockPosition).toHaveProperty('symbol')
      expect(mockPosition).toHaveProperty('quantity')
      expect(mockPosition).toHaveProperty('entry_price')
      expect(mockPosition).toHaveProperty('current_price')
      expect(mockPosition).toHaveProperty('unrealized_pnl')
    })

    it('unrealized P&L matches price difference', () => {
      const expected = (mockPosition.current_price - mockPosition.entry_price) * mockPosition.quantity
      expect(mockPosition.unrealized_pnl).toBe(expected)
    })
  })

  describe('mockClosedTrade', () => {
    it('has exit fields', () => {
      expect(mockClosedTrade).toHaveProperty('exit_price')
      expect(mockClosedTrade).toHaveProperty('exit_date')
      expect(mockClosedTrade).toHaveProperty('realized_pnl')
      expect(mockClosedTrade).toHaveProperty('holding_period')
    })

    it('realized P&L matches price difference', () => {
      const expected = (mockClosedTrade.exit_price - mockClosedTrade.entry_price) * mockClosedTrade.quantity
      expect(mockClosedTrade.realized_pnl).toBe(expected)
    })
  })
})
