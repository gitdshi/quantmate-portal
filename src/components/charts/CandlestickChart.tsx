import EChartWrapper from './EChartWrapper'
import '../../lib/echarts-advanced'
import type { EChartsOption } from '../../lib/echarts'
import { themeColors } from '../../lib/theme'

interface CandlestickChartProps {
  dates: string[]
  /** [open, close, low, high] per date */
  ohlc: [number, number, number, number][]
  volumes?: number[]
  height?: number
  loading?: boolean
  indicators?: Array<{ name: string; data: number[]; color?: string }>
}

export default function CandlestickChart({ dates, ohlc, volumes, height = 450, loading, indicators }: CandlestickChartProps) {
  const option: EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { bottom: 0, data: ['K线', ...(indicators?.map((i) => i.name) || [])] },
    grid: volumes
      ? [
          { left: 60, right: 20, top: 20, height: '55%' },
          { left: 60, right: 20, top: '72%', height: '18%' },
        ]
      : [{ left: 60, right: 20, top: 20, bottom: 40 }],
    xAxis: volumes
      ? [
          { type: 'category', data: dates, boundaryGap: true, gridIndex: 0 },
          { type: 'category', data: dates, boundaryGap: true, gridIndex: 1, show: false },
        ]
      : [{ type: 'category', data: dates, boundaryGap: true }],
    yAxis: volumes
      ? [
          { type: 'value', scale: true, gridIndex: 0 },
          { type: 'value', scale: true, gridIndex: 1, splitNumber: 2 },
        ]
      : [{ type: 'value', scale: true }],
    dataZoom: [
      { type: 'inside', xAxisIndex: volumes ? [0, 1] : [0], start: 70, end: 100 },
      { type: 'slider', xAxisIndex: volumes ? [0, 1] : [0], start: 70, end: 100, bottom: volumes ? 0 : 10 },
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: ohlc,
        xAxisIndex: 0,
        yAxisIndex: 0,
        itemStyle: {
          color: '#ef4444',
          color0: '#22c55e',
          borderColor: '#ef4444',
          borderColor0: '#22c55e',
        },
      },
      ...(indicators || []).map((ind) => ({
        name: ind.name,
        type: 'line' as const,
        data: ind.data,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1, color: ind.color },
        xAxisIndex: 0,
        yAxisIndex: 0,
      })),
      ...(volumes
        ? [{
            name: '成交量',
            type: 'bar' as const,
            data: volumes,
            xAxisIndex: 1,
            yAxisIndex: 1,
            itemStyle: { color: `${themeColors.primary.replace(')', ' / 0.4)')}` },
          }]
        : []),
    ],
  }
  return <EChartWrapper option={option} height={height} loading={loading} />
}
