import { describe, expect, it } from 'vitest'
import { render, screen } from '@test/support/utils'
import OptimizationHeatmap from '@/components/OptimizationHeatmap'

const mockResults = [
  { parameters: { fast_period: 5, slow_period: 20 }, total_return: 0.25, sharpe_ratio: 1.5, max_drawdown: -0.10 },
  { parameters: { fast_period: 5, slow_period: 40 }, total_return: 0.30, sharpe_ratio: 1.8, max_drawdown: -0.12 },
  { parameters: { fast_period: 10, slow_period: 20 }, total_return: 0.15, sharpe_ratio: 1.0, max_drawdown: -0.08 },
  { parameters: { fast_period: 10, slow_period: 40 }, total_return: 0.35, sharpe_ratio: 2.0, max_drawdown: -0.15 },
]

describe('OptimizationHeatmap', () => {
  it('renders table with heatmap cells', () => {
    render(
      <OptimizationHeatmap
        results={mockResults}
        xParam="fast_period"
        yParam="slow_period"
        metric="total_return"
      />,
    )
    // Should render a table
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('shows parameter values in headers', () => {
    render(
      <OptimizationHeatmap
        results={mockResults}
        xParam="fast_period"
        yParam="slow_period"
        metric="sharpe_ratio"
      />,
    )
    // X-axis values should appear
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders empty message when no results', () => {
    render(
      <OptimizationHeatmap
        results={[]}
        xParam="fast_period"
        yParam="slow_period"
        metric="total_return"
      />,
    )
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument()
  })

  it('displays metric values in cells', () => {
    render(
      <OptimizationHeatmap
        results={mockResults}
        xParam="fast_period"
        yParam="slow_period"
        metric="total_return"
      />,
    )
    // Values should be rendered (use getAllByText since same value may appear in multiple cells)
    expect(screen.getAllByText('0.25').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('0.35').length).toBeGreaterThanOrEqual(1)
  })
})


