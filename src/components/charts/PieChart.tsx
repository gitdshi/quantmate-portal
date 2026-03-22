import EChartWrapper from './EChartWrapper'
import type { EChartsOption } from '../../lib/echarts'

interface PieChartProps {
  data: Array<{ name: string; value: number }>
  height?: number
  title?: string
  loading?: boolean
  donut?: boolean
}

export default function PieChart({ data, height = 300, title, loading, donut }: PieChartProps) {
  const option: EChartsOption = {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll' },
    series: [{
      type: 'pie',
      radius: donut ? ['40%', '65%'] : '65%',
      center: ['50%', '45%'],
      data,
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } },
      label: { formatter: '{b}\n{d}%', fontSize: 11 },
    }],
  }
  return <EChartWrapper option={option} height={height} loading={loading} />
}
