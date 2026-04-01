import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@test/support/utils'
import i18n from '@/i18n'

const chartSpy = vi.fn()

vi.mock('@/components/charts/EChartWrapper', () => ({
  default: (props: { option: unknown; height?: string | number }) => {
    chartSpy(props)
    return <div data-testid="echart-wrapper" />
  },
}))

import TradingChart from '@/components/TradingChart'

describe('TradingChart', () => {
  beforeEach(async () => {
    chartSpy.mockClear()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
  })

  it('renders empty state when no price data is available', () => {
    render(<TradingChart stockPriceData={[]} trades={[]} />)

    expect(screen.getByText(/no price data available/i)).toBeInTheDocument()
    expect(screen.queryByTestId('echart-wrapper')).not.toBeInTheDocument()
  })

  it('builds an ECharts option with candlestick, benchmark, and trade marker series', () => {
    render(
      <TradingChart
        stockPriceData={[
          { datetime: '2024-01-02T00:00:00Z', open: 10, high: 12, low: 9, close: 11 },
          { datetime: '2024-01-03T00:00:00Z', open: 11, high: 13, low: 10, close: 12 },
        ]}
        benchmarkData={[
          { datetime: '2024-01-02T00:00:00Z', close: 3200 },
          { datetime: '2024-01-03T00:00:00Z', close: 3210 },
        ]}
        trades={[
          { datetime: '2024-01-02T00:00:00Z', direction: 'LONG', offset: 'OPEN', price: 10.8, volume: 100 },
          { datetime: '2024-01-03T00:00:00Z', direction: 'SHORT', offset: 'CLOSE', price: 12.1, volume: 100 },
        ]}
        stockSymbol="600519.SH"
        benchmarkSymbol="HS300"
      />,
    )

    expect(screen.getByTestId('echart-wrapper')).toBeInTheDocument()
    expect(chartSpy).toHaveBeenCalled()

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      series?: Array<{ type?: string; name?: string; data?: unknown[] }>
      dataZoom?: unknown[]
      legend?: { data?: Array<string | { name?: string }> }
    }

    const legendNames = (option.legend?.data ?? []).map((entry) =>
      typeof entry === 'string' ? entry : entry.name,
    )

    expect(legendNames).toEqual(expect.arrayContaining(['600519.SH', 'HS300']))
    expect(option.dataZoom).toHaveLength(2)
    expect(option.series?.some((series) => series.type === 'candlestick' && series.name === '600519.SH')).toBe(true)
    expect(option.series?.some((series) => series.type === 'line' && series.name === 'HS300')).toBe(true)
    expect(option.series?.filter((series) => series.type === 'scatter').length).toBeGreaterThanOrEqual(2)
  })
})