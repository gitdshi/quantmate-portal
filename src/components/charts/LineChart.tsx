import EChartWrapper from './EChartWrapper'
import type { EChartsOption } from '../../lib/echarts'

interface Series {
  name: string
  data: number[]
  color?: string
  areaStyle?: boolean
}

interface LineChartProps {
  xData: string[]
  series: Series[]
  height?: number
  title?: string
  loading?: boolean
}

export default function LineChart({ xData, series, height = 350, title, loading }: LineChartProps) {
  const option: EChartsOption = {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, data: series.map((s) => s.name) },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: xData, boundaryGap: false },
    yAxis: { type: 'value' },
    series: series.map((s) => ({
      name: s.name,
      type: 'line' as const,
      data: s.data,
      smooth: true,
      symbol: 'none',
      itemStyle: s.color ? { color: s.color } : undefined,
      areaStyle: s.areaStyle ? { opacity: 0.15 } : undefined,
    })),
  }
  return <EChartWrapper option={option} height={height} loading={loading} />
}
