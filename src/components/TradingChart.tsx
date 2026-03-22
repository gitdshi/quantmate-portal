import { ArrowDown, ArrowUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EChartWrapper from './charts/EChartWrapper'
import '../lib/echarts-advanced'
import type { EChartsOption } from '../lib/echarts'
import { themeColors } from '../lib/theme'

interface StockPriceDataPoint {
  datetime: string
  open?: number
  high?: number
  low?: number
  close: number
}

interface BenchmarkDataPoint {
  datetime: string
  close: number
}

interface Trade {
  datetime?: string
  direction?: string
  offset?: string
  price?: number
  volume?: number
}

interface TradingChartProps {
  stockPriceData?: StockPriceDataPoint[]
  benchmarkData?: BenchmarkDataPoint[]
  trades?: Trade[]
  stockSymbol?: string
  benchmarkSymbol?: string
}

export default function TradingChart({
  stockPriceData,
  benchmarkData,
  trades,
  stockSymbol = 'Stock',
  benchmarkSymbol = 'Benchmark',
}: TradingChartProps) {
  const { t } = useTranslation(['market', 'common'])
  const [zoomRange, setZoomRange] = useState({ start: 70, end: 100 })
  const longDirectionLabel = '\u591a'
  const openOffsetLabel = '\u5f00'
  
  const { chartData, tradeMarkers } = useMemo(() => {
    if (!stockPriceData || stockPriceData.length === 0) {
      return { chartData: [], tradeMarkers: [] }
    }

    // Create maps for quick lookup
    const stockMap = new Map<string, number>()
    stockPriceData.forEach(point => {
      const dateKey = new Date(point.datetime).toISOString().split('T')[0]
      stockMap.set(dateKey, point.close)
    })

    const benchmarkMap = new Map<string, number>()
    if (benchmarkData && benchmarkData.length > 0) {
      benchmarkData.forEach(point => {
        const dateKey = new Date(point.datetime).toISOString().split('T')[0]
        benchmarkMap.set(dateKey, point.close)
      })
    }

    // Build chart data with formatted date as key for X axis
    const data = stockPriceData.map(point => {
      const dt = new Date(point.datetime)
      const dateKey = dt.toISOString().split('T')[0]
      const benchmarkValue = benchmarkMap.get(dateKey)

      return {
        date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: point.datetime,
        dateKey: dateKey,
        open: point.open ?? point.close,
        high: point.high ?? point.close,
        low: point.low ?? point.close,
        close: point.close,
        benchmarkPrice: benchmarkValue,
      }
    })

    // Process trades to create markers — match to chart date labels
    const markers: Array<{
      date: string      // formatted date label (must match X axis)
      price: number     // trade price (on stock Y axis)
      isLong: boolean
      isEntry: boolean
      direction: string
      offset: string
    }> = []

    if (trades && trades.length > 0) {
      // Build a dateKey -> formatted date label lookup
      const dateKeyToLabel = new Map<string, string>()
      data.forEach(d => dateKeyToLabel.set(d.dateKey, d.date))

      trades.forEach(trade => {
        if (trade.datetime && trade.price) {
          const dt = new Date(trade.datetime)
          const dateKey = dt.toISOString().split('T')[0]
          const dateLabel = dateKeyToLabel.get(dateKey)
          if (!dateLabel) return // skip if date not in chart range

          const dir = (trade.direction || '').toUpperCase()
          const ofs = (trade.offset || '').toUpperCase()
          const isLong = dir === longDirectionLabel || dir === 'LONG'
          const isEntry = ofs === openOffsetLabel || ofs === 'OPEN'

          markers.push({
            date: dateLabel,
            price: trade.price,
            isLong,
            isEntry,
            direction: trade.direction || '',
            offset: trade.offset || '',
          })
        }
      })
    }
    return { chartData: data, tradeMarkers: markers }
  }, [stockPriceData, benchmarkData, trades, longDirectionLabel, openOffsetLabel])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">{t('chart.noData')}</p>
      </div>
    )
  }

  const hasBenchmark = chartData.some(d => d.benchmarkPrice !== undefined)

  const priceValues = chartData.flatMap((point) => [point.open, point.high, point.low, point.close])
  const tradePrices = tradeMarkers.map((trade) => trade.price)
  const allStockValues = [...priceValues, ...tradePrices]
  const stockMin = allStockValues.length > 0 ? Math.min(...allStockValues) : 0
  const stockMax = allStockValues.length > 0 ? Math.max(...allStockValues) : 100
  const stockPadding = (stockMax - stockMin) * 0.08 || 1

  const benchmarkValues = chartData.map((point) => point.benchmarkPrice).filter((value): value is number => value !== undefined)
  const benchMin = benchmarkValues.length > 0 ? Math.min(...benchmarkValues) : 0
  const benchMax = benchmarkValues.length > 0 ? Math.max(...benchmarkValues) : 100
  const benchPadding = (benchMax - benchMin) * 0.08 || 1

  const dateToIndex = new Map(chartData.map((point, index) => [point.date, index]))

  const buildScatterSeries = (
    name: string,
    data: Array<{ date: string; price: number }>,
    color: string,
    symbol: string,
  ) => ({
    name,
    type: 'scatter' as const,
    data: data.map((point) => [dateToIndex.get(point.date) ?? 0, point.price]),
    symbol,
    symbolSize: 10,
    itemStyle: {
      color,
      borderColor: '#ffffff',
      borderWidth: 1.5,
    },
    tooltip: {
      formatter: (_param: unknown) => name,
    },
    emphasis: {
      scale: 1.2,
    },
    z: 5,
  })

  const longEntries = tradeMarkers.filter((trade) => trade.isLong && trade.isEntry)
  const shortEntries = tradeMarkers.filter((trade) => !trade.isLong && trade.isEntry)
  const longExits = tradeMarkers.filter((trade) => trade.isLong && !trade.isEntry)
  const shortExits = tradeMarkers.filter((trade) => !trade.isLong && !trade.isEntry)

  const handleResetZoom = () => {
    setZoomRange({ start: 0, end: 100 })
  }

  const option: EChartsOption = useMemo(() => ({
    animation: false,
    legend: {
      bottom: 0,
      data: [stockSymbol, ...(hasBenchmark ? [benchmarkSymbol] : [])],
      textStyle: { color: themeColors.mutedForeground },
    },
    grid: { left: 56, right: hasBenchmark ? 64 : 24, top: 16, bottom: 52 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
      textStyle: { color: themeColors.foreground },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params as Array<{ dataIndex: number; seriesName: string }> : []
        if (items.length === 0) return ''
        const point = chartData[items[0].dataIndex]
        if (!point) return ''

        const lines = [
          `<div style="margin-bottom:4px;color:${themeColors.mutedForeground}">${point.fullDate.split('T')[0]}</div>`,
          `<div>${t('overview.open')}: <strong>${point.open.toFixed(2)}</strong></div>`,
          `<div>${t('overview.high')}: <strong>${point.high.toFixed(2)}</strong></div>`,
          `<div>${t('overview.low')}: <strong>${point.low.toFixed(2)}</strong></div>`,
          `<div>${t('overview.close')}: <strong>${point.close.toFixed(2)}</strong></div>`,
        ]

        if (point.benchmarkPrice != null) {
          lines.push(`<div style="margin-top:4px;padding-top:4px;border-top:1px solid ${themeColors.border}">${benchmarkSymbol}: <strong>${point.benchmarkPrice.toFixed(2)}</strong></div>`)
        }

        return lines.join('')
      },
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
    },
    xAxis: {
      type: 'category',
      data: chartData.map((point) => point.date),
      boundaryGap: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: themeColors.mutedForeground, fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        scale: true,
        min: stockMin - stockPadding,
        max: stockMax + stockPadding,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: themeColors.border, opacity: 0.5 } },
        axisLabel: {
          color: '#10b981',
          formatter: (value: number) => value.toFixed(2),
        },
      },
      {
        type: 'value',
        scale: true,
        show: hasBenchmark,
        min: benchMin - benchPadding,
        max: benchMax + benchPadding,
        position: 'right',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: '#f59e0b',
          formatter: (value: number) => value.toFixed(0),
        },
      },
    ],
    dataZoom: [
      { type: 'inside', start: zoomRange.start, end: zoomRange.end },
      { type: 'slider', start: zoomRange.start, end: zoomRange.end, bottom: 20, height: 18 },
    ],
    series: [
      {
        name: stockSymbol,
        type: 'candlestick',
        data: chartData.map((point) => [point.open, point.close, point.low, point.high]),
        itemStyle: {
          color: '#ef4444',
          color0: '#10b981',
          borderColor: '#ef4444',
          borderColor0: '#10b981',
        },
      },
      ...(hasBenchmark
        ? [{
            name: benchmarkSymbol,
            type: 'line' as const,
            yAxisIndex: 1,
            data: chartData.map((point) => point.benchmarkPrice ?? null),
            showSymbol: false,
            smooth: true,
            connectNulls: true,
            lineStyle: { color: '#f59e0b', width: 2 },
            itemStyle: { color: '#f59e0b' },
          }]
        : []),
      buildScatterSeries(t('chart.longEntry'), longEntries, '#ef4444', 'triangle'),
      buildScatterSeries(t('chart.shortEntry'), shortEntries, '#10b981', 'triangle'),
      buildScatterSeries(t('chart.longExit'), longExits, '#ef4444', 'diamond'),
      buildScatterSeries(t('chart.shortExit'), shortExits, '#10b981', 'diamond'),
    ],
  }), [benchmarkSymbol, benchMax, benchMin, benchPadding, chartData, hasBenchmark, longEntries, longExits, shortEntries, shortExits, stockMax, stockMin, stockPadding, stockSymbol, t, zoomRange.end, zoomRange.start])

  return (
    <div className="w-full">
      {/* Legend for trade markers and zoom controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
              <ArrowUp className="w-2 h-2 text-white" />
            </div>
            <span>{t('chart.longEntry')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <ArrowDown className="w-2 h-2 text-white" />
            </div>
            <span>{t('chart.shortEntry')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-[8px]">✕</span>
            </div>
            <span>{t('chart.longExit')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-[8px]">✕</span>
            </div>
            <span>{t('chart.shortExit')}</span>
          </div>
        </div>
        <button
          onClick={handleResetZoom}
          className="px-3 py-1 text-xs border border-input rounded-md hover:bg-muted transition-colors"
        >
          {t('chart.resetZoom')}
        </button>
      </div>

      <EChartWrapper option={option} height={320} />
    </div>
  )
}
