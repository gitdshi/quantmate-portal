interface ProgressBarProps {
  value: number
  max?: number
  color?: 'primary' | 'success' | 'warning' | 'destructive'
  label?: string
  showValue?: boolean
  className?: string
}

const colorClasses = {
  primary: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-orange-500',
  destructive: 'bg-red-500',
}

export default function ProgressBar({ value, max = 100, color = 'primary', label, showValue, className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          {label && <span>{label}</span>}
          {showValue && <span>{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClasses[color]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
