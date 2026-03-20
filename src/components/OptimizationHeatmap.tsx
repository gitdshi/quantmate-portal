import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface OptimizationResult {
  parameters: Record<string, number>
  total_return: number
  sharpe_ratio: number
  max_drawdown: number
}

interface OptimizationHeatmapProps {
  results: OptimizationResult[]
  xParam: string
  yParam: string
  metric: 'total_return' | 'sharpe_ratio' | 'max_drawdown'
}

/**
 * Renders a 2D heatmap of optimization results.
 * X-axis = one parameter, Y-axis = another, color = metric value.
 */
export default function OptimizationHeatmap({
  results,
  xParam,
  yParam,
  metric,
}: OptimizationHeatmapProps) {
  const { t } = useTranslation(['strategies', 'common'])

  const metricLabels: Record<string, string> = {
    total_return: t('strategies:optimization.totalReturn'),
    sharpe_ratio: t('strategies:optimization.sharpeRatio'),
    max_drawdown: t('strategies:optimization.maxDrawdown'),
  }

  const { xValues, yValues, grid, minVal, maxVal } = useMemo(() => {
    const xSet = new Set<number>()
    const ySet = new Set<number>()
    const lookup = new Map<string, number>()

    for (const r of results) {
      const x = r.parameters[xParam]
      const y = r.parameters[yParam]
      if (x == null || y == null) continue
      xSet.add(x)
      ySet.add(y)
      lookup.set(`${x}_${y}`, r[metric])
    }

    const xs = [...xSet].sort((a, b) => a - b)
    const ys = [...ySet].sort((a, b) => a - b)

    let lo = Infinity
    let hi = -Infinity
    const g: (number | null)[][] = ys.map((y) =>
      xs.map((x) => {
        const val = lookup.get(`${x}_${y}`) ?? null
        if (val !== null) {
          lo = Math.min(lo, val)
          hi = Math.max(hi, val)
        }
        return val
      }),
    )

    return { xValues: xs, yValues: ys, grid: g, minVal: lo, maxVal: hi }
  }, [results, xParam, yParam, metric])

  if (!xValues.length || !yValues.length) {
    return <div className="text-gray-400 text-sm">{t('strategies:optimization.noDataForHeatmap')}</div>
  }

  const cellW = Math.max(40, Math.min(80, 600 / xValues.length))
  const cellH = 32

  return (
    <div className="overflow-auto">
      <div className="flex items-end gap-1 mb-2">
        <span className="text-xs text-gray-500 font-medium">{metricLabels[metric] ?? metric.replace('_', ' ')}</span>
        <div className="flex items-center gap-1 ml-4">
          <span className="text-xs text-gray-400">{minVal.toFixed(2)}</span>
          <div className="w-24 h-3 rounded" style={{
            background: 'linear-gradient(to right, #ef4444, #facc15, #22c55e)',
          }} />
          <span className="text-xs text-gray-400">{maxVal.toFixed(2)}</span>
        </div>
      </div>

      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-1 text-gray-500">{yParam} \ {xParam}</th>
            {xValues.map((x) => (
              <th key={x} className="p-1 text-center text-gray-500" style={{ width: cellW }}>
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yValues.map((y, yi) => (
            <tr key={y}>
              <td className="p-1 text-right text-gray-500 pr-2">{y}</td>
              {xValues.map((x, xi) => {
                const val = grid[yi][xi]
                return (
                  <td
                    key={x}
                    className="border text-center"
                    style={{
                      width: cellW,
                      height: cellH,
                      backgroundColor: val !== null ? colorScale(val, minVal, maxVal) : '#f3f4f6',
                      color: val !== null ? '#111' : '#9ca3af',
                    }}
                    title={`${xParam}=${x}, ${yParam}=${y}: ${val?.toFixed(4) ?? t('common:na')}`}
                  >
                    {val !== null ? val.toFixed(2) : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function colorScale(val: number, min: number, max: number): string {
  if (max === min) return '#facc15'
  const t = (val - min) / (max - min)
  // red(0) → yellow(0.5) → green(1)
  const r = t < 0.5 ? 239 : Math.round(239 - (t - 0.5) * 2 * (239 - 34))
  const g = t < 0.5 ? Math.round(68 + t * 2 * (204 - 68)) : Math.round(204 - (t - 0.5) * 2 * (204 - 197))
  const b = t < 0.5 ? 68 : Math.round(68 - (t - 0.5) * 2 * (68 - 30))
  return `rgba(${r},${g},${b},0.7)`
}
