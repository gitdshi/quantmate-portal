import * as echarts from 'echarts/core'
import {
  BarChart,
  ScatterChart,
  LineChart,
  PieChart,
} from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  BarChart,
  LineChart,
  ScatterChart,
  PieChart,
  CanvasRenderer,
])

export { echarts }
export type { EChartsOption } from 'echarts'
