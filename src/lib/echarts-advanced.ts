import { CandlestickChart, GaugeChart, HeatmapChart } from 'echarts/charts'
import { VisualMapComponent } from 'echarts/components'
import { echarts } from './echarts'

echarts.use([
  VisualMapComponent,
  CandlestickChart,
  GaugeChart,
  HeatmapChart,
])
