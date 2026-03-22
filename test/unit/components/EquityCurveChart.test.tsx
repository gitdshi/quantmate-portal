import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@test/support/utils'

const chartSpy = vi.fn()

vi.mock('@/components/charts/EChartWrapper', () => ({
  default: (props: { option: unknown; height?: string | number }) => {
    chartSpy(props)
    return <div data-testid="echart-wrapper" />
  },
}))

import EquityCurveChart from '@/components/EquityCurveChart'

describe('EquityCurveChart', () => {
  it('renders empty state when no equity data is available', () => {
    render(<EquityCurveChart data={[]} initialCapital={100000} />)

    expect(screen.getByText(/no equity curve data available/i)).toBeInTheDocument()
    expect(screen.queryByTestId('echart-wrapper')).not.toBeInTheDocument()
  })

  it('builds an ECharts option with equity, benchmark, and trend series', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02T00:00:00Z', balance: 100000, net_pnl: 0 },
          { datetime: '2024-01-03T00:00:00Z', balance: 101500, net_pnl: 1500 },
        ]}
        initialCapital={100000}
        benchmarkData={[
          { datetime: '2024-01-02T00:00:00Z', close: 3000 },
          { datetime: '2024-01-03T00:00:00Z', close: 3030 },
        ]}
        benchmarkSymbol="HS300"
        stockPriceData={[
          { datetime: '2024-01-02T00:00:00Z', close: 100 },
          { datetime: '2024-01-03T00:00:00Z', close: 104 },
        ]}
        stockSymbol="600519.SH"
        annualReturn={12}
      />,
    )

    expect(screen.getByTestId('echart-wrapper')).toBeInTheDocument()
    expect(chartSpy).toHaveBeenCalled()

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      series?: Array<{ type?: string; name?: string; markLine?: unknown }>
      legend?: { data?: string[] }
    }

    expect(option.legend?.data).toEqual(
      expect.arrayContaining([
        'Strategy Equity',
        'Buy & Hold HS300',
        '600519.SH Price (Normalized)',
        'Annual Trend',
      ]),
    )
    expect(option.series?.filter((series) => series.type === 'line')).toHaveLength(4)
    expect(option.series?.some((series) => series.name === 'Strategy Equity' && series.markLine)).toBe(true)
  })
})