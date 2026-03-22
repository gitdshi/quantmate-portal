import EChartWrapper from './EChartWrapper'
import '../../lib/echarts-advanced'
import type { EChartsOption } from '../../lib/echarts'
import { themeColors } from '../../lib/theme'

interface GaugeChartProps {
  value: number
  max?: number
  title?: string
  height?: number
  loading?: boolean
  color?: string
}

export default function GaugeChart({ value, max = 100, title, height = 250, loading, color }: GaugeChartProps) {
  const option: EChartsOption = {
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max,
      progress: { show: true, width: 14 },
      pointer: { show: false },
      axisLine: { lineStyle: { width: 14, color: [[1, themeColors.muted]] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: title ? { show: true, offsetCenter: [0, '70%'], fontSize: 13 } : { show: false },
      detail: {
        valueAnimation: true,
        offsetCenter: [0, '30%'],
        fontSize: 28,
        fontWeight: 'bold',
        formatter: '{value}',
        color: color || 'inherit',
      },
      data: [{ value, name: title || '' }],
      itemStyle: color ? { color } : undefined,
    }],
  }
  return <EChartWrapper option={option} height={height} loading={loading} />
}
