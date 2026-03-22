import { CandlestickChart, GaugeChart, HeatmapChart } from 'echarts/charts'
import { DataZoomComponent, VisualMapComponent } from 'echarts/components'
import { echarts } from './echarts'

echarts.use([
  DataZoomComponent,
  VisualMapComponent,
  CandlestickChart,
  GaugeChart,
  HeatmapChart,
])
