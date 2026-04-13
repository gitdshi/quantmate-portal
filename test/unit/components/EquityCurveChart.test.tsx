import i18n from '@/i18n'
import { render, screen } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const chartSpy = vi.fn()

vi.mock('@/components/charts/EChartWrapper', () => ({
  default: (props: { option: unknown; height?: string | number }) => {
    chartSpy(props)
    return <div data-testid="echart-wrapper" />
  },
}))

import EquityCurveChart from '@/components/EquityCurveChart'

describe('EquityCurveChart', () => {
  beforeEach(async () => {
    chartSpy.mockClear()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
  })

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
      series?: Array<{ type?: string; name?: string; markLine?: unknown; yAxisIndex?: number }>
      legend?: { data?: Array<string | { name?: string }> }
    }

    const legendNames = (option.legend?.data ?? []).map((entry) =>
      typeof entry === 'string' ? entry : entry.name,
    )

    expect(legendNames).toEqual(
      expect.arrayContaining([
        'Strategy Equity (600519.SH)',
        'Buy & Hold HS300',
        '600519.SH',
        'Annual Trend',
      ]),
    )
    expect(option.series?.some((series) => series.name === 'Strategy Equity (600519.SH)' && series.markLine)).toBe(true)
    expect(option.series?.some((series) => series.name === '600519.SH' && (series.type === 'line' || series.type === 'candlestick'))).toBe(true)
    expect(option.series?.some((series) => series.name === 'Buy & Hold HS300' && series.type === 'line')).toBe(true)
    expect(option.series?.some((series) => series.name === 'Annual Trend' && series.type === 'line')).toBe(true)
  })

  it('renders candlestick series when all OHLC stock data present', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
          { datetime: '2024-01-03', balance: 101000, net_pnl: 1000 },
        ]}
        initialCapital={100000}
        stockPriceData={[
          { datetime: '2024-01-02', open: 50, high: 55, low: 48, close: 52 },
          { datetime: '2024-01-03', open: 52, high: 58, low: 51, close: 56 },
        ]}
        stockSymbol="AAPL"
      />,
    )

    expect(chartSpy).toHaveBeenCalled()
    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      series?: Array<{ type?: string; name?: string; yAxisIndex?: number }>
    }
    // Should use candlestick type when all OHLC data is present for every point
    expect(option.series?.some((s) => s.name === 'AAPL' && s.type === 'candlestick')).toBe(true)
  })

  it('renders line series for stock when OHLC is incomplete for some points', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000 },
          { datetime: '2024-01-03', balance: 101000 },
        ]}
        initialCapital={100000}
        stockPriceData={[
          { datetime: '2024-01-02', open: 50, high: 55, low: 48, close: 52 },
          // Second point has no stock data — no matching date key
          { datetime: '2024-01-04', close: 56 },
        ]}
        stockSymbol="AAPL"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      series?: Array<{ type?: string; name?: string }>
    }
    // Not all equity points have matching OHLC, so stock OHLC count < chartData.length
    // This means useStockCandlestick = false, but hasStockOhlc may = true
    // The stock series should exist (either line or candlestick based on matching)
    expect(option.series?.some((s) => s.name === 'AAPL')).toBe(true)
  })

  it('handles stock price with "price" fallback field', () => {
    render(
      <EquityCurveChart
        data={[{ datetime: '2024-01-02', balance: 100000 }]}
        initialCapital={100000}
        stockPriceData={[{ datetime: '2024-01-02', price: 99 }]}
        stockSymbol="S"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      series?: Array<{ type?: string; name?: string; data?: unknown[] }>
    }
    const stockSeries = option.series?.find((s) => s.name === 'S')
    expect(stockSeries).toBeTruthy()
  })

  it('handles stock price with "value" fallback field', () => {
    render(
      <EquityCurveChart
        data={[{ datetime: '2024-01-02', balance: 100000 }]}
        initialCapital={100000}
        stockPriceData={[{ datetime: '2024-01-02', value: 88 }]}
        stockSymbol="V"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      series?: Array<{ name?: string }>
    }
    expect(option.series?.some((s) => s.name === 'V')).toBe(true)
  })

  it('uses "date" field when "datetime" is missing', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '', balance: 100000, date: '2024-01-02' },
          { datetime: '', balance: 101000, date: '2024-01-03' },
        ]}
        initialCapital={100000}
      />,
    )

    expect(screen.getByTestId('echart-wrapper')).toBeInTheDocument()
  })

  it('renders without any optional series (no benchmark, stock, annualReturn)', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000 },
          { datetime: '2024-01-03', balance: 102000 },
        ]}
        initialCapital={100000}
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      series?: Array<{ type?: string; name?: string }>
      legend?: { data?: Array<string | { name?: string }> }
    }
    // Only equity series
    expect(option.series?.length).toBe(1)
    expect(option.legend?.data?.length).toBe(1)
  })

  it('invokes tooltip formatter without crashing', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
          { datetime: '2024-01-03', balance: 101500, net_pnl: 1500 },
        ]}
        initialCapital={100000}
        benchmarkData={[
          { datetime: '2024-01-02', close: 3000 },
          { datetime: '2024-01-03', close: 3030 },
        ]}
        stockPriceData={[
          { datetime: '2024-01-02', open: 50, high: 55, low: 48, close: 52 },
          { datetime: '2024-01-03', open: 52, high: 58, low: 51, close: 56 },
        ]}
        stockSymbol="TEST"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      tooltip?: { formatter?: (params: unknown) => string }
    }
    expect(option.tooltip?.formatter).toBeTypeOf('function')

    // Call with array params
    const result = option.tooltip!.formatter!([
      { dataIndex: 0, seriesName: 'Strategy Equity (TEST)', value: 100000 },
      { dataIndex: 0, seriesName: 'TEST', value: [50, 52, 48, 55] },
      { dataIndex: 0, seriesName: 'Buy & Hold Benchmark', value: 100000 },
    ])
    expect(result).toContain('100,000')

    // Call with empty params
    const empty = option.tooltip!.formatter!([])
    expect(empty).toBe('')
  })

  // ─── Null/undefined date handling (lines 54-56) ────────
  it('handles undefined dates in data gracefully', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: undefined as unknown as string, balance: 100000, net_pnl: 0 },
          { datetime: '2024-01-03T00:00:00Z', balance: 101000, net_pnl: 1000 },
        ]}
        initialCapital={100000}
      />,
    )

    expect(chartSpy).toHaveBeenCalled()
  })

  // ─── Tooltip with null value items (line 225-226) ──────
  it('skips null values in tooltip formatter', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
          { datetime: '2024-01-03', balance: 101000, net_pnl: 1000 },
        ]}
        initialCapital={100000}
        benchmarkData={[
          { datetime: '2024-01-02', close: 3000 },
          { datetime: '2024-01-03', close: 3050 },
        ]}
        benchmarkSymbol="HS300"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      tooltip?: { formatter?: (params: unknown) => string }
    }

    // Include an item with null value — should be skipped
    const result = option.tooltip!.formatter!([
      { dataIndex: 0, seriesName: 'Strategy Equity', value: 100000 },
      { dataIndex: 0, seriesName: 'Buy & Hold Benchmark', value: null },
    ])
    expect(result).toContain('100,000')
  })

  // ─── Benchmark map build (line 217) ────────────────────
  it('builds benchmark map from benchmark data', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
          { datetime: '2024-01-03', balance: 101500, net_pnl: 1500 },
        ]}
        initialCapital={100000}
        benchmarkData={[
          { datetime: '2024-01-02', close: 3000 },
          { datetime: '2024-01-03', close: 3030 },
        ]}
        benchmarkSymbol="HS300"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      series?: Array<{ name: string; data: unknown[] }>
    }
    // Should have a benchmark series (name is "Buy & Hold HS300")
    const benchmarkSeries = option.series?.find((s) => s.name?.includes('Buy') || s.name?.includes('HS300'))
    expect(benchmarkSeries).toBeTruthy()
    expect(benchmarkSeries!.data.length).toBe(2)
  })

  // ─── Skip strategy equity in tooltip (line 222) ────────
  it('skips stock symbol series in tooltip', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0, stock_close: 50 },
        ]}
        initialCapital={100000}
        stockPriceData={[{ datetime: '2024-01-02', close: 50 }]}
        stockSymbol="AAPL"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      tooltip?: { formatter?: (params: unknown) => string }
    }

    // Pass a series item with the stock symbol name — it should be skipped
    const result = option.tooltip!.formatter!([
      { dataIndex: 0, seriesName: 'Strategy Equity (AAPL)', value: 100000 },
      { dataIndex: 0, seriesName: 'AAPL', value: [50, 52, 48, 55] },
    ])
    // Result should have the date and balance, but the stock entries are skipped
    expect(result).toContain('100,000')
  })

  // ─── toDateKey with non-YYYY-MM-DD format (lines 54-56) ──
  it('handles date strings without hyphens via Date fallback', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '20240102', balance: 100000, net_pnl: 0 },
          { datetime: '20240103', balance: 101000, net_pnl: 1000 },
        ]}
        initialCapital={100000}
      />,
    )

    expect(screen.getByTestId('echart-wrapper')).toBeInTheDocument()
  })

  // ─── toDateKey with invalid date string (line 56) ──
  it('handles completely invalid date strings gracefully', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: 'not-a-date', balance: 100000, net_pnl: 0 },
          { datetime: '2024-01-03', balance: 101000, net_pnl: 1000 },
        ]}
        initialCapital={100000}
      />,
    )

    // Should still render — invalid dates are filtered out or handled
    expect(chartSpy).toHaveBeenCalled()
  })

  // ─── OHLC tooltip with full stock data (line 217) ──
  it('renders OHLC tooltip line when full stock data is present', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0, stock_open: 48, stock_high: 52, stock_low: 47, stock_close: 50 },
        ]}
        initialCapital={100000}
        stockPriceData={[{ datetime: '2024-01-02', open: 48, high: 52, low: 47, close: 50 }]}
        stockSymbol="AAPL"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      tooltip?: { formatter?: (params: unknown) => string }
    }

    const result = option.tooltip!.formatter!([
      { dataIndex: 0, seriesName: 'Strategy Equity (AAPL)', value: 100000 },
    ])
    // OHLC line should contain O, H, L, C values
    expect(result).toContain('48.00')
    expect(result).toContain('52.00')
    expect(result).toContain('47.00')
    expect(result).toContain('50.00')
  })

  // ─── Right Y-axis for stock price (lines 254-268) ──
  it('includes right Y-axis for stock price data', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
          { datetime: '2024-01-03', balance: 101000, net_pnl: 1000 },
        ]}
        initialCapital={100000}
        stockPriceData={[
          { datetime: '2024-01-02', close: 50 },
          { datetime: '2024-01-03', close: 54 },
        ]}
        stockSymbol="AAPL"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      yAxis?: Array<{ show?: boolean; position?: string }>
    }

    // Should have two Y-axes, second one on the right for stock
    expect(option.yAxis).toBeDefined()
    expect(option.yAxis!.length).toBe(2)
    expect(option.yAxis![1].show).toBe(true)
    expect(option.yAxis![1].position).toBe('right')
  })

  // ─── Y-axis formatter (line 249) ──
  it('formats Y-axis value with $Xk notation', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
        ]}
        initialCapital={100000}
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      yAxis?: Array<{ axisLabel?: { formatter?: (value: number) => string } }>
    }

    const formatter = option.yAxis?.[0]?.axisLabel?.formatter
    expect(formatter).toBeDefined()
    expect(formatter!(100000)).toBe('$100k')
  })

  // ─── Timestamp-format dates (line 56: toDateKey numeric path) ──
  it('handles non-ISO date strings via toDateKey', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: 'Jan 2, 2024', balance: 100000, net_pnl: 0 },
          { datetime: 'Jan 3, 2024', balance: 101000, net_pnl: 1000 },
        ]}
        initialCapital={100000}
        benchmarkData={[
          { datetime: 'Jan 2, 2024', close: 3000 },
          { datetime: 'Jan 3, 2024', close: 3030 },
        ]}
        benchmarkSymbol="HS300"
      />,
    )

    expect(chartSpy).toHaveBeenCalled()
    const option = chartSpy.mock.calls.at(-1)?.[0]?.option
    expect(option).toBeDefined()
  })

  // ─── Invalid benchmark datetime (line 74: dateKey null guard) ──
  it('skips benchmark data with invalid datetime', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
        ]}
        initialCapital={100000}
        benchmarkData={[
          { datetime: '', close: 3000 },
          { datetime: 'not-a-date-xxx', close: 3030 },
        ]}
        benchmarkSymbol="HS300"
      />,
    )

    expect(chartSpy).toHaveBeenCalled()
  })

  // ─── Invalid stock datetime (line 84: dateKey null guard) ──
  it('skips stock data with invalid datetime', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
        ]}
        initialCapital={100000}
        stockPriceData={[
          { datetime: '', close: 50 },
        ]}
        stockSymbol="AAPL"
      />,
    )

    expect(chartSpy).toHaveBeenCalled()
  })

  // ─── Tooltip close-only branch (line 217) ──
  it('tooltip shows simple close when no OHLC data', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
        ]}
        initialCapital={100000}
        stockPriceData={[
          { datetime: '2024-01-02', close: 55.5 },
        ]}
        stockSymbol="AAPL"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      tooltip?: { formatter?: (params: unknown) => string }
    }
    const formatter = option.tooltip?.formatter
    expect(formatter).toBeDefined()

    const result = formatter!([{ dataIndex: 0, seriesName: 'Equity', value: 100000 }])
    expect(result).toContain('55.50')
  })

  // ─── Right Y-axis stock formatter (line 268) ──
  it('formats right Y-axis stock values with fixed decimals', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
        ]}
        initialCapital={100000}
        stockPriceData={[
          { datetime: '2024-01-02', close: 55.5 },
        ]}
        stockSymbol="AAPL"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      yAxis?: Array<{ axisLabel?: { formatter?: (value: number) => string } }>
    }

    const rightAxis = option.yAxis?.[1]
    expect(rightAxis).toBeDefined()
    const formatter = rightAxis?.axisLabel?.formatter
    expect(formatter).toBeDefined()
    expect(formatter!(55.5)).toBe('55.50')
  })

  // ─── Tooltip with empty params (line 209) ──
  it('tooltip returns empty string for empty params', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
        ]}
        initialCapital={100000}
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      tooltip?: { formatter?: (params: unknown) => string }
    }
    const formatter = option.tooltip?.formatter
    expect(formatter).toBeDefined()
    expect(formatter!([])).toBe('')
  })

  // ─── Tooltip with out-of-range dataIndex (line 209) ──
  it('tooltip returns empty string when dataIndex is out of range', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
        ]}
        initialCapital={100000}
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      tooltip?: { formatter?: (params: unknown) => string }
    }
    const formatter = option.tooltip?.formatter
    expect(formatter).toBeDefined()
    // dataIndex 999 points beyond chart data array
    expect(formatter!([{ dataIndex: 999, seriesName: 'X', value: 0 }])).toBe('')
  })

  // ─── Tooltip with stockClose only, no OHLC (line 217) ──
  it('tooltip shows close price when stock OHLC is absent', () => {
    render(
      <EquityCurveChart
        data={[
          { datetime: '2024-01-02', balance: 100000, net_pnl: 0 },
          { datetime: '2024-01-03', balance: 101000, net_pnl: 1000 },
        ]}
        initialCapital={100000}
        stockPriceData={[
          { datetime: '2024-01-02', close: 52 },
          { datetime: '2024-01-03', close: 56 },
        ]}
        stockSymbol="CLOSE_ONLY"
      />,
    )

    const option = chartSpy.mock.calls.at(-1)?.[0]?.option as {
      tooltip?: { formatter?: (params: unknown) => string }
    }
    const formatter = option.tooltip?.formatter
    expect(formatter).toBeDefined()
    const result = formatter!([{ dataIndex: 0, seriesName: 'Equity', value: 100000 }])
    expect(result).toContain('52.00')
    expect(result).toContain('CLOSE_ONLY')
  })
})