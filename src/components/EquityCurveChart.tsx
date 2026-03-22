import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import EChartWrapper from './charts/EChartWrapper'
import type { EChartsOption } from '../lib/echarts'
import { themeColors } from '../lib/theme'

interface EquityDataPoint {
  datetime: string
  balance: number
  net_pnl?: number
}

interface BenchmarkDataPoint {
  datetime: string
  close: number
}

interface StockPriceDataPoint {
  datetime: string
  close: number
}

interface EquityCurveChartProps {
  data: EquityDataPoint[]
  initialCapital: number
  benchmarkData?: BenchmarkDataPoint[]
  benchmarkSymbol?: string
  stockPriceData?: StockPriceDataPoint[]
  stockSymbol?: string
  annualReturn?: number
}

export default function EquityCurveChart({ 
  data, 
  initialCapital,
  benchmarkData,
  benchmarkSymbol = 'Benchmark',
  stockPriceData,
  stockSymbol = 'Stock',
  annualReturn
}: EquityCurveChartProps) {
  const { t } = useTranslation(['backtest', 'common'])
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // Create a map for benchmark data if available
    const benchmarkMap = new Map<string, number>()
    if (benchmarkData && benchmarkData.length > 0) {
      benchmarkData.forEach(point => {
        const dateKey = new Date(point.datetime).toISOString().split('T')[0]
        benchmarkMap.set(dateKey, point.close)
      })
    }
    
    // Create a map for stock price data if available
    const stockPriceMap = new Map<string, number>()
    if (stockPriceData && stockPriceData.length > 0) {
      stockPriceData.forEach(point => {
        const dateKey = new Date(point.datetime).toISOString().split('T')[0]
        stockPriceMap.set(dateKey, point.close)
      })
    }
    
    // Get first benchmark value for normalization
    const firstBenchmark = benchmarkData?.[0]?.close || initialCapital
    // Get first stock price for normalization
    const firstStockPrice = stockPriceData?.[0]?.close || initialCapital
    
    return data.map((point, index) => {
      const dt = new Date(point.datetime)
      const dateKey = dt.toISOString().split('T')[0]
      const benchmarkValue = benchmarkMap.get(dateKey)
      const stockPrice = stockPriceMap.get(dateKey)
      
      // Calculate annual return trend line (linear projection)
      let annualTrend = undefined
      if (annualReturn && data.length > 0) {
        const dailyReturn = Math.pow(1 + annualReturn / 100, 1 / 252) - 1
        annualTrend = initialCapital * Math.pow(1 + dailyReturn, index)
      }
      
      return {
        date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: point.datetime,
        balance: point.balance,
        pnl: point.net_pnl || 0,
        returnPct: ((point.balance - initialCapital) / initialCapital) * 100,
        benchmark: benchmarkValue ? (benchmarkValue / firstBenchmark) * initialCapital : undefined,
        benchmarkReturn: benchmarkValue ? ((benchmarkValue - firstBenchmark) / firstBenchmark) * 100 : undefined,
        benchmarkPrice: benchmarkValue,
        stockPrice: stockPrice,
        stockPriceNormalized: stockPrice ? (stockPrice / firstStockPrice) * initialCapital : undefined,
        annualTrend: annualTrend,
      }
    })
  }, [data, initialCapital, benchmarkData, stockPriceData, annualReturn])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">{t('results.noEquityData')}</p>
      </div>
    )
  }

  const minBalance = Math.min(
    ...chartData.map(d => d.balance),
    ...chartData.map(d => d.benchmark || Infinity).filter(v => v !== Infinity),
    ...chartData.map(d => d.stockPriceNormalized || Infinity).filter(v => v !== Infinity),
    ...chartData.map(d => d.annualTrend || Infinity).filter(v => v !== Infinity)
  )
  const maxBalance = Math.max(
    ...chartData.map(d => d.balance),
    ...chartData.map(d => d.benchmark || -Infinity).filter(v => v !== -Infinity),
    ...chartData.map(d => d.stockPriceNormalized || -Infinity).filter(v => v !== -Infinity),
    ...chartData.map(d => d.annualTrend || -Infinity).filter(v => v !== -Infinity)
  )
  const padding = (maxBalance - minBalance) * 0.1

  const hasBenchmark = chartData.some(d => d.benchmark !== undefined)
  const hasStockPrice = chartData.some(d => d.stockPriceNormalized !== undefined)
  const hasAnnualTrend = chartData.some(d => d.annualTrend !== undefined)

  const option: EChartsOption = useMemo(() => ({
    animation: false,
    legend: {
      bottom: 0,
      data: [
        t('results.strategyEquity'),
        ...(hasStockPrice ? [t('results.priceNormalized', { symbol: stockSymbol })] : []),
        ...(hasBenchmark ? [t('results.buyAndHold', { symbol: benchmarkSymbol })] : []),
        ...(hasAnnualTrend ? [t('results.annualTrend')] : []),
      ],
      textStyle: { color: themeColors.mutedForeground },
    },
    grid: { left: 56, right: 24, top: 16, bottom: 52 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
      textStyle: { color: themeColors.foreground },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params as Array<{ dataIndex: number; seriesName: string; value: number }> : []
        if (items.length === 0) return ''
        const point = chartData[items[0].dataIndex]
        if (!point) return ''

        const rows = [`<div style="margin-bottom:4px;color:${themeColors.mutedForeground}">${point.fullDate}</div>`]
        for (const item of items) {
          if (item.value == null) continue
          rows.push(`<div>${item.seriesName}: <strong>$${Number(item.value).toLocaleString()}</strong></div>`)
        }
        return rows.join('')
      },
    },
    xAxis: {
      type: 'category',
      data: chartData.map((point) => point.date),
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: themeColors.mutedForeground, fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      min: minBalance - padding,
      max: maxBalance + padding,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: themeColors.border, opacity: 0.5 } },
      axisLabel: {
        color: themeColors.mutedForeground,
        formatter: (value: number) => `$${(value / 1000).toFixed(0)}k`,
      },
    },
    series: [
      {
        name: t('results.strategyEquity'),
        type: 'line' as const,
        data: chartData.map((point) => point.balance),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: themeColors.primary, width: 2 },
        itemStyle: { color: themeColors.primary },
        markLine: {
          symbol: ['none', 'none'],
          lineStyle: {
            color: themeColors.mutedForeground,
            type: 'dashed',
          },
          label: {
            formatter: t('results.initial'),
            color: themeColors.mutedForeground,
          },
          data: [{ yAxis: initialCapital }],
        },
      },
      ...(hasStockPrice
        ? [{
            name: t('results.priceNormalized', { symbol: stockSymbol }),
            type: 'line' as const,
            data: chartData.map((point) => point.stockPriceNormalized ?? null),
            smooth: true,
            showSymbol: false,
            connectNulls: true,
            lineStyle: { color: '#10b981', width: 2 },
            itemStyle: { color: '#10b981' },
          }]
        : []),
      ...(hasBenchmark
        ? [{
            name: t('results.buyAndHold', { symbol: benchmarkSymbol }),
            type: 'line' as const,
            data: chartData.map((point) => point.benchmark ?? null),
            smooth: true,
            showSymbol: false,
            connectNulls: true,
            lineStyle: { color: '#f59e0b', width: 2 },
            itemStyle: { color: '#f59e0b' },
          }]
        : []),
      ...(hasAnnualTrend
        ? [{
            name: t('results.annualTrend'),
            type: 'line' as const,
            data: chartData.map((point) => point.annualTrend ?? null),
            smooth: true,
            showSymbol: false,
            connectNulls: true,
            lineStyle: { color: '#8b5cf6', width: 1.5, type: 'dashed' as const },
            itemStyle: { color: '#8b5cf6' },
          }]
        : []),
    ],
  }), [benchmarkSymbol, chartData, hasAnnualTrend, hasBenchmark, hasStockPrice, initialCapital, maxBalance, minBalance, padding, stockSymbol, t])

  return (
    <div className="w-full h-80">
      <EChartWrapper option={option} height="100%" />
    </div>
  )
}
