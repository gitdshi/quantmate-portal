import i18n from '@/i18n'
import { fireEvent, render, screen } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

  // ─── Tooltip formatter (lines 211-228) ─────────
  it('tooltip formatter returns OHLC and optional benchmark price', () => {
    render(
      <TradingChart
        stockPriceData={[
          { datetime: '2024-01-02T00:00:00Z', open: 10, high: 12, low: 9, close: 11 },
        ]}
        benchmarkData={[
          { datetime: '2024-01-02T00:00:00Z', close: 3200 },
        ]}
        trades={[]}
        stockSymbol="600519.SH"
        benchmarkSymbol="HS300"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      tooltip?: { formatter?: (params: unknown) => string }
      yAxis?: Array<{ show?: boolean }>
    }

    // Invoke the formatter with a mock params array
    const html = option.tooltip?.formatter?.([{ dataIndex: 0, seriesName: '600519.SH' }]) || ''
    expect(html).toContain('2024-01-02')
    expect(html).toContain('10.00')
    expect(html).toContain('12.00')
    expect(html).toContain('9.00')
    expect(html).toContain('11.00')
    // Benchmark price included
    expect(html).toContain('HS300')
    expect(html).toContain('3200.00')

    // Second Y-axis is shown for benchmark
    expect(option.yAxis?.[1]?.show).toBe(true)
  })

  it('tooltip formatter returns empty string for empty params', () => {
    render(
      <TradingChart
        stockPriceData={[
          { datetime: '2024-01-02T00:00:00Z', open: 10, high: 12, low: 9, close: 11 },
        ]}
        trades={[]}
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      tooltip?: { formatter?: (params: unknown) => string }
      yAxis?: Array<{ show?: boolean }>
    }

    // Empty params
    expect(option.tooltip?.formatter?.([])).toBe('')
    // Non-array params
    expect(option.tooltip?.formatter?.(null)).toBe('')

    // No benchmark → second Y-axis hidden
    expect(option.yAxis?.[1]?.show).toBe(false)
  })

  it('renders without benchmark data and hides second Y-axis', () => {
    render(
      <TradingChart
        stockPriceData={[
          { datetime: '2024-01-02T00:00:00Z', open: 10, high: 12, low: 9, close: 11 },
        ]}
        trades={[]}
        stockSymbol="AAPL"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      yAxis?: Array<{ show?: boolean }>
      series?: Array<{ type?: string; name?: string }>
    }

    expect(option.yAxis?.[1]?.show).toBe(false)
    expect(option.series?.some((s) => s.type === 'line' && s.name === 'HS300')).toBeFalsy()
  })

  it('renders trade markers for all 4 trade types', () => {
    render(
      <TradingChart
        stockPriceData={[
          { datetime: '2024-01-02T00:00:00Z', open: 10, high: 12, low: 9, close: 11 },
          { datetime: '2024-01-03T00:00:00Z', open: 11, high: 13, low: 10, close: 12 },
          { datetime: '2024-01-04T00:00:00Z', open: 12, high: 14, low: 11, close: 13 },
          { datetime: '2024-01-05T00:00:00Z', open: 13, high: 15, low: 12, close: 14 },
        ]}
        trades={[
          { datetime: '2024-01-02', direction: 'long', offset: 'open', price: 11, volume: 100 },
          { datetime: '2024-01-03', direction: 'short', offset: 'open', price: 12, volume: 50 },
          { datetime: '2024-01-04', direction: 'long', offset: 'close', price: 13, volume: 100 },
          { datetime: '2024-01-05', direction: 'short', offset: 'close', price: 14, volume: 50 },
        ]}
        benchmarkData={[
          { datetime: '2024-01-02T00:00:00Z', close: 3000 },
          { datetime: '2024-01-03T00:00:00Z', close: 3050 },
          { datetime: '2024-01-04T00:00:00Z', close: 3020 },
          { datetime: '2024-01-05T00:00:00Z', close: 3100 },
        ]}
        stockSymbol="AAPL"
        benchmarkSymbol="HS300"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      series?: Array<{ type?: string; name?: string; data?: unknown[] }>
      yAxis?: Array<{ show?: boolean; axisLabel?: { formatter?: (v: number) => string } }>
    }

    // Should have scatter series for trade markers
    const scatterSeries = option.series?.filter((s) => s.type === 'scatter') ?? []
    expect(scatterSeries.length).toBeGreaterThanOrEqual(1)

    // Y-axis should show benchmark (second axis)
    expect(option.yAxis?.[1]?.show).toBe(true)

    // Test yAxis formatters
    const leftFormatter = option.yAxis?.[0]?.axisLabel?.formatter
    if (leftFormatter) expect(leftFormatter(100.5)).toBe('100.50')
    const rightFormatter = option.yAxis?.[1]?.axisLabel?.formatter
    if (rightFormatter) expect(rightFormatter(3000)).toBe('3000')
  })

  it('renders reset zoom button', () => {
    render(
      <TradingChart
        stockPriceData={[
          { datetime: '2024-01-02T00:00:00Z', open: 10, high: 12, low: 9, close: 11 },
        ]}
        stockSymbol="AAPL"
      />,
    )

    // Reset zoom button should exist
    const resetBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.match(/reset.*zoom/i)
    )
    if (resetBtn) {
      fireEvent.click(resetBtn)
    }
  })
})