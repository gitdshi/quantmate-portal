import EChartWrapper from './EChartWrapper'
import type { EChartsOption } from '../../lib/echarts'

interface BarChartProps {
  xData: string[]
  series: Array<{ name: string; data: number[]; color?: string; stack?: string }>
  height?: number
  title?: string
  loading?: boolean
  horizontal?: boolean
}

export default function BarChart({ xData, series, height = 300, title, loading, horizontal }: BarChartProps) {
  const option: EChartsOption = {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
    tooltip: { trigger: 'axis' },
    legend: series.length > 1 ? { bottom: 0, data: series.map((s) => s.name) } : undefined,
    grid: { left: 60, right: 20, top: 40, bottom: series.length > 1 ? 40 : 20 },
    xAxis: horizontal
      ? { type: 'value' }
      : { type: 'category', data: xData },
    yAxis: horizontal
      ? { type: 'category', data: xData }
      : { type: 'value' },
    series: series.map((s) => ({
      name: s.name,
      type: 'bar' as const,
      data: s.data,
      stack: s.stack,
      itemStyle: s.color
        ? { color: s.color }
        : {
            color: (params: any) => {
              const v = params.data as number
              return v >= 0 ? '#22c55e' : '#ef4444'
            },
          },
    })),
  }
  return <EChartWrapper option={option} height={height} loading={loading} />
}
