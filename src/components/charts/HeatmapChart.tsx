import EChartWrapper from './EChartWrapper'
import '../../lib/echarts-advanced'
import type { EChartsOption } from '../../lib/echarts'

interface HeatmapChartProps {
  xLabels: string[]
  yLabels: string[]
  /** [xIdx, yIdx, value] */
  data: [number, number, number][]
  height?: number
  title?: string
  loading?: boolean
  min?: number
  max?: number
}

export default function HeatmapChart({ xLabels, yLabels, data, height = 300, title, loading, min, max }: HeatmapChartProps) {
  const allVals = data.map((d) => d[2])
  const lo = min ?? Math.min(...allVals)
  const hi = max ?? Math.max(...allVals)

  const option: EChartsOption = {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
    tooltip: {
      formatter: (params: any) => `${yLabels[params.data[1]]} / ${xLabels[params.data[0]]}: ${params.data[2]?.toFixed(2)}`,
    },
    grid: { left: 80, right: 40, top: 40, bottom: 20 },
    xAxis: { type: 'category', data: xLabels, splitArea: { show: true } },
    yAxis: { type: 'category', data: yLabels, splitArea: { show: true } },
    visualMap: {
      min: lo,
      max: hi,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#ef4444', '#fbbf24', '#22c55e'] },
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: true, formatter: (p: any) => p.data[2]?.toFixed(1) },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
    }],
  }
  return <EChartWrapper option={option} height={height} loading={loading} />
}
