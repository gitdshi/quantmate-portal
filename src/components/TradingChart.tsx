import { ArrowDown, ArrowUp } from 'lucide-react'
import { useMemo } from 'react'
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ReferenceDot,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

interface StockPriceDataPoint {
  datetime: string
  close: number
}

interface BenchmarkDataPoint {
  datetime: string
  close: number
}

interface Trade {
  datetime?: string
  direction?: string
  offset?: string
  price?: number
  volume?: number
}

interface TradingChartProps {
  stockPriceData?: StockPriceDataPoint[]
  benchmarkData?: BenchmarkDataPoint[]
  trades?: Trade[]
  stockSymbol?: string
  benchmarkSymbol?: string
}

export default function TradingChart({
  stockPriceData,
  benchmarkData,
  trades,
  stockSymbol = 'Stock',
  benchmarkSymbol = 'Benchmark',
}: TradingChartProps) {
  const { chartData, tradeMarkers } = useMemo(() => {
    if (!stockPriceData || stockPriceData.length === 0) {
      return { chartData: [], tradeMarkers: [] }
    }

    // Create maps for quick lookup
    const stockMap = new Map<string, number>()
    stockPriceData.forEach(point => {
      const dateKey = new Date(point.datetime).toISOString().split('T')[0]
      stockMap.set(dateKey, point.close)
    })

    const benchmarkMap = new Map<string, number>()
    if (benchmarkData && benchmarkData.length > 0) {
      benchmarkData.forEach(point => {
        const dateKey = new Date(point.datetime).toISOString().split('T')[0]
        benchmarkMap.set(dateKey, point.close)
      })
    }

    // Build chart data
    const data = stockPriceData.map(point => {
      const dt = new Date(point.datetime)
      const dateKey = dt.toISOString().split('T')[0]
      const benchmarkValue = benchmarkMap.get(dateKey)

      return {
        date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: point.datetime,
        dateKey: dateKey,
        stockPrice: point.close,
        benchmarkPrice: benchmarkValue,
      }
    })

    // Process trades to create markers
    const markers: Array<{
      dateKey: string
      date: string
      fullDate: string
      price: number
      direction: string
      offset: string
      isLong: boolean
      isEntry: boolean
    }> = []

    if (trades && trades.length > 0) {
      trades.forEach(trade => {
        if (trade.datetime && trade.price) {
          const dt = new Date(trade.datetime)
          const dateKey = dt.toISOString().split('T')[0]
          const isLong = trade.direction === '多' || trade.direction === 'LONG'
          const isEntry = trade.offset === '开' || trade.offset === 'OPEN'

          markers.push({
            dateKey,
            date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            fullDate: trade.datetime,
            price: trade.price,
            direction: trade.direction || '',
            offset: trade.offset || '',
            isLong,
            isEntry,
          })
        }
      })
    }

    return { chartData: data, tradeMarkers: markers }
  }, [stockPriceData, benchmarkData, trades])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">No price data available</p>
      </div>
    )
  }

  const hasBenchmark = chartData.some(d => d.benchmarkPrice !== undefined)

  // Calculate price domain
  const stockPrices = chartData.map(d => d.stockPrice).filter(p => p !== undefined)
  const benchmarkPrices = chartData.map(d => d.benchmarkPrice).filter(p => p !== undefined)
  const tradePrices = tradeMarkers.map(t => t.price)
  const allPrices = [...stockPrices, ...benchmarkPrices, ...tradePrices]
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const padding = (maxPrice - minPrice) * 0.1

  // Custom dot component for trade markers
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (!payload) return null

    // Find trades at this date
    const tradesAtDate = tradeMarkers.filter(t => t.dateKey === payload.dateKey)
    if (tradesAtDate.length === 0) return null

    return (
      <>
        {tradesAtDate.map((trade, idx) => {
          // Map price to pixel position (approximate)
          const yPixel = cy - ((trade.price - minPrice) / (maxPrice - minPrice)) * 200

          if (trade.isEntry) {
            // Entry: Arrow pointing up (long) or down (short)
            return (
              <g key={idx}>
                <circle
                  cx={cx}
                  cy={yPixel}
                  r={6}
                  fill={trade.isLong ? '#10b981' : '#ef4444'}
                  stroke="#fff"
                  strokeWidth={2}
                />
                {trade.isLong ? (
                  <polygon
                    points={`${cx},${yPixel - 3} ${cx - 3},${yPixel + 2} ${cx + 3},${yPixel + 2}`}
                    fill="#fff"
                  />
                ) : (
                  <polygon
                    points={`${cx},${yPixel + 3} ${cx - 3},${yPixel - 2} ${cx + 3},${yPixel - 2}`}
                    fill="#fff"
                  />
                )}
              </g>
            )
          } else {
            // Exit: X mark
            return (
              <g key={idx}>
                <circle
                  cx={cx}
                  cy={yPixel}
                  r={6}
                  fill={trade.isLong ? '#10b981' : '#ef4444'}
                  stroke="#fff"
                  strokeWidth={2}
                />
                <line
                  x1={cx - 3}
                  y1={yPixel - 3}
                  x2={cx + 3}
                  y2={yPixel + 3}
                  stroke="#fff"
                  strokeWidth={2}
                />
                <line
                  x1={cx - 3}
                  y1={yPixel + 3}
                  x2={cx + 3}
                  y2={yPixel - 3}
                  stroke="#fff"
                  strokeWidth={2}
                />
              </g>
            )
          }
        })}
      </>
    )
  }

  return (
    <div className="w-full">
      {/* Legend for trade markers */}
      <div className="flex items-center gap-4 mb-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <ArrowUp className="w-2 h-2 text-white" />
          </div>
          <span>Long Entry</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
            <ArrowDown className="w-2 h-2 text-white" />
          </div>
          <span>Short Entry</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <span className="text-white text-[8px]">✕</span>
          </div>
          <span>Long Exit</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-[8px]">✕</span>
          </div>
          <span>Short Exit</span>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: any, name: any) => {
                if (value === undefined) return ['N/A', name]
                if (name === 'stockPrice') {
                  return [value.toFixed(2), stockSymbol]
                }
                if (name === 'benchmarkPrice') {
                  return [value.toFixed(2), benchmarkSymbol]
                }
                return [value, name]
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullDate
                }
                return label
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="line" />
            <Line
              type="monotone"
              dataKey="stockPrice"
              name={stockSymbol}
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
            {hasBenchmark && (
              <Line
                type="monotone"
                dataKey="benchmarkPrice"
                name={benchmarkSymbol}
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            )}
            {/* Trade markers */}
            {tradeMarkers.map((trade, idx) => {
              const dataPoint = chartData.find(d => d.dateKey === trade.dateKey)
              if (!dataPoint) return null

              return (
                <ReferenceDot
                  key={idx}
                  x={dataPoint.date}
                  y={trade.price}
                  r={0}
                  shape={<CustomDot />}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
