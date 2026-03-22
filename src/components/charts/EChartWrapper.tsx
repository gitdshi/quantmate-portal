import ReactEChartsCore from 'echarts-for-react/lib/core'
import { echarts, type EChartsOption } from '../../lib/echarts'

interface EChartWrapperProps {
  option: EChartsOption
  height?: string | number
  className?: string
  loading?: boolean
  theme?: string
}

export default function EChartWrapper({ option, height = 350, className = '', loading, theme }: EChartWrapperProps) {
  const isDark = document.documentElement.classList.contains('dark')
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height, width: '100%' }}
      className={className}
      showLoading={loading}
      theme={theme || (isDark ? 'dark' : undefined)}
      opts={{ renderer: 'canvas' }}
      notMerge
    />
  )
}
