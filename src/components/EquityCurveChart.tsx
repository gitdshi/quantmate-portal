import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import EChartWrapper from './charts/EChartWrapper'
import '../lib/echarts-advanced'
import type { EChartsOption } from '../lib/echarts'
import { themeColors } from '../lib/theme'

interface EquityDataPoint {
  datetime: string
  balance: number
  net_pnl?: number
  date?: string
}

interface BenchmarkDataPoint {
  datetime: string
  close: number
}

interface StockPriceDataPoint {
  datetime: string
  open?: number
  high?: number
  low?: number
  close?: number
  price?: number
  value?: number
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

  const toDateKey = (raw: string | undefined): string | null => {
    if (!raw) return null
    if (raw.length >= 10 && raw.includes('-')) return raw.slice(0, 10)
    const dt = new Date(raw)
    if (Number.isNaN(dt.getTime())) return null
    return dt.toISOString().slice(0, 10)
  }

  const toDateLabel = (raw: string | undefined): string => {
    if (!raw) return '-'
    const dt = new Date(raw)
    if (Number.isNaN(dt.getTime())) return raw.slice(0, 10)
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // Create a map for benchmark data if available
    const benchmarkMap = new Map<string, number>()
    if (benchmarkData && benchmarkData.length > 0) {
      benchmarkData.forEach(point => {
        const dateKey = toDateKey(point.datetime)
        if (!dateKey) return
        benchmarkMap.set(dateKey, point.close)
      })
    }
    
    // Create a map for stock price data if available
    const stockPriceMap = new Map<string, { open: number; high: number; low: number; close: number }>()
    if (stockPriceData && stockPriceData.length > 0) {
      stockPriceData.forEach(point => {
        const dateKey = toDateKey(point.datetime)
        if (!dateKey) return
        const closeValue =
          point.close ??
          point.price ??
          point.value
        if (closeValue !== undefined && closeValue !== null) {
          stockPriceMap.set(dateKey, {
            open: point.open ?? closeValue,
            high: point.high ?? closeValue,
            low: point.low ?? closeValue,
            close: closeValue,
          })
        }
      })
    }
    
    // Get first benchmark value for normalization
    const firstBenchmark = benchmarkData?.[0]?.close || initialCapital
    return data.map((point, index) => {
      const rawDate = point.datetime || point.date
      const dateKey = toDateKey(rawDate)
      const benchmarkValue = benchmarkMap.get(dateKey)
      const stockPrice = stockPriceMap.get(dateKey)
      
      // Calculate annual return trend line (linear projection)
      let annualTrend = undefined
      if (annualReturn && data.length > 0) {
        const dailyReturn = Math.pow(1 + annualReturn / 100, 1 / 252) - 1
        annualTrend = initialCapital * Math.pow(1 + dailyReturn, index)
      }
      
      return {
        date: toDateLabel(rawDate),
        fullDate: rawDate || '-',
        balance: point.balance,
        pnl: point.net_pnl || 0,
        returnPct: ((point.balance - initialCapital) / initialCapital) * 100,
        benchmark: benchmarkValue ? (benchmarkValue / firstBenchmark) * initialCapital : undefined,
        benchmarkReturn: benchmarkValue ? ((benchmarkValue - firstBenchmark) / firstBenchmark) * 100 : undefined,
        benchmarkPrice: benchmarkValue,
        stockOpen: stockPrice?.open,
        stockHigh: stockPrice?.high,
        stockLow: stockPrice?.low,
        stockClose: stockPrice?.close,
        annualTrend: annualTrend,
      }
    })
  }, [annualReturn, benchmarkData, data, initialCapital, stockPriceData])

  const minBalance = Math.min(
    ...chartData.map(d => d.balance),
    ...chartData.map(d => d.benchmark || Infinity).filter(v => v !== Infinity),
    ...chartData.map(d => d.annualTrend || Infinity).filter(v => v !== Infinity)
  )
  const maxBalance = Math.max(
    ...chartData.map(d => d.balance),
    ...chartData.map(d => d.benchmark || -Infinity).filter(v => v !== -Infinity),
    ...chartData.map(d => d.annualTrend || -Infinity).filter(v => v !== -Infinity)
  )
  const padding = (maxBalance - minBalance) * 0.1

  const hasBenchmark = chartData.some(d => d.benchmark !== undefined)
  const hasStockPrice = chartData.some(d => d.stockClose !== undefined)
  const stockOhlcCount = chartData.filter((d) => d.stockOpen !== undefined && d.stockHigh !== undefined && d.stockLow !== undefined && d.stockClose !== undefined).length
  const hasStockOhlc = stockOhlcCount > 0
  const useStockCandlestick = hasStockOhlc && stockOhlcCount === chartData.length
  const hasAnnualTrend = chartData.some(d => d.annualTrend !== undefined)

  const stockValues = chartData
    .flatMap((d) => [d.stockLow, d.stockHigh, d.stockClose])
    .filter((v): v is number => v !== undefined && v !== null)
  const stockMin = stockValues.length > 0 ? Math.min(...stockValues) : 0
  const stockMax = stockValues.length > 0 ? Math.max(...stockValues) : 100
  const stockPadding = (stockMax - stockMin) * 0.1 || 1

  const option: EChartsOption = useMemo(() => ({
    animation: false,
    legend: {
      type: 'scroll',
      top: 0,
      left: 8,
      right: 8,
      data: [
        {
          name: `${t('results.strategyEquity')} (${stockSymbol})`,
          textStyle: { color: '#2563eb' },
        },
        ...(hasStockPrice
          ? [
              {
                name: stockSymbol,
                textStyle: { color: '#10b981' },
              },
            ]
          : []),
        ...(hasBenchmark
          ? [
              {
                name: t('results.buyAndHold', { symbol: benchmarkSymbol }),
                textStyle: { color: '#f59e0b' },
              },
            ]
          : []),
        ...(hasAnnualTrend
          ? [
              {
                name: t('results.annualTrend'),
                textStyle: { color: '#8b5cf6' },
              },
            ]
          : []),
      ],
      textStyle: { color: themeColors.mutedForeground },
      inactiveColor: '#9ca3af',
    },
    grid: { left: 56, right: hasStockPrice ? 72 : 24, top: 54, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
      textStyle: { color: themeColors.foreground },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params as Array<{ dataIndex: number; seriesName: string; value: number | number[] }> : []
        if (items.length === 0) return ''
        const point = chartData[items[0].dataIndex]
        if (!point) return ''

        const rows = [`<div style="margin-bottom:4px;color:${themeColors.mutedForeground}">${point.fullDate}</div>`]
        rows.push(`<div>${t('results.strategyEquity')}: <strong>$${Number(point.balance).toLocaleString()}</strong></div>`)
        if (point.stockClose !== undefined) {
          if (hasStockOhlc && point.stockOpen !== undefined && point.stockHigh !== undefined && point.stockLow !== undefined) {
            rows.push(`<div>${stockSymbol}: O <strong>${point.stockOpen.toFixed(2)}</strong> H <strong>${point.stockHigh.toFixed(2)}</strong> L <strong>${point.stockLow.toFixed(2)}</strong> C <strong>${point.stockClose.toFixed(2)}</strong></div>`)
          } else {
            rows.push(`<div>${stockSymbol}: <strong>${point.stockClose.toFixed(2)}</strong></div>`)
          }
        }
        for (const item of items) {
          if (item.seriesName === `${t('results.strategyEquity')} (${stockSymbol})` || item.seriesName === stockSymbol) {
            continue
          }
          if (item.value == null) continue
          const value = Array.isArray(item.value) ? item.value[item.value.length - 1] : item.value
          rows.push(`<div>${item.seriesName}: <strong>$${Number(value).toLocaleString()}</strong></div>`)
        }
        return rows.join('')
      },
    },
    xAxis: {
      type: 'category',
      data: chartData.map((point) => point.date),
      boundaryGap: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: themeColors.mutedForeground, fontSize: 12 },
    },
    yAxis: [
      {
        type: 'value',
        min: minBalance - padding,
        max: maxBalance + padding,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.28)',
            type: 'dashed',
          },
        },
        axisLabel: {
          color: themeColors.mutedForeground,
          formatter: (value: number) => `$${(value / 1000).toFixed(0)}k`,
        },
      },
      {
        type: 'value',
        show: hasStockPrice,
        min: stockMin - stockPadding,
        max: stockMax + stockPadding,
        position: 'right',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: '#10b981',
          formatter: (value: number) => value.toFixed(2),
        },
      },
    ],
    series: [
      {
        name: `${t('results.strategyEquity')} (${stockSymbol})`,
        type: 'line' as const,
        data: chartData.map((point) => point.balance),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: '#2563eb', width: 2.6 },
        itemStyle: { color: '#2563eb' },
        markLine: {
          symbol: ['none', 'none'],
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.55)',
            type: 'dashed',
          },
          label: {
            formatter: t('results.initial'),
            color: 'rgba(100, 116, 139, 0.9)',
          },
          data: [{ yAxis: initialCapital }],
        },
      },
      ...(hasStockPrice
        ? useStockCandlestick
          ? [{
              name: stockSymbol,
              type: 'candlestick' as const,
              yAxisIndex: 1,
              data: chartData.map((point) =>
                point.stockOpen !== undefined && point.stockClose !== undefined && point.stockLow !== undefined && point.stockHigh !== undefined
                  ? [point.stockOpen, point.stockClose, point.stockLow, point.stockHigh]
                  : null
              ),
              itemStyle: {
                color: '#ef4444',
                color0: '#10b981',
                borderColor: '#ef4444',
                borderColor0: '#10b981',
              },
            }]
          : [{
              name: stockSymbol,
              type: 'line' as const,
              yAxisIndex: 1,
              data: chartData.map((point) => point.stockClose ?? null),
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
            lineStyle: { color: 'rgba(139, 92, 246, 0.55)', width: 1.4, type: 'dashed' as const },
            itemStyle: { color: '#8b5cf6' },
          }]
        : []),
    ],
  }), [benchmarkSymbol, chartData, hasAnnualTrend, hasBenchmark, hasStockPrice, initialCapital, maxBalance, minBalance, padding, stockMax, stockMin, stockPadding, stockSymbol, t, useStockCandlestick])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">{t('results.noEquityData')}</p>
      </div>
    )
  }

  return (
    <div className="w-full h-80">
      <EChartWrapper option={option} height="100%" />
    </div>
  )
}
