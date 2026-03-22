import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: LucideIcon
  iconColor?: string
  subtitle?: string
}

export default function StatCard({ label, value, change, changeType = 'neutral', icon: Icon, iconColor, subtitle }: StatCardProps) {
  const changeClass =
    changeType === 'positive' ? 'text-green-600 dark:text-green-400' :
    changeType === 'negative' ? 'text-red-600 dark:text-red-400' :
    'text-muted-foreground'

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon size={18} className={iconColor || 'text-muted-foreground'} />}
      </div>
      <div className="text-2xl font-bold text-card-foreground">{value}</div>
      {(change || subtitle) && (
        <div className="mt-1 text-sm">
          {change && <span className={changeClass}>{change}</span>}
          {subtitle && <span className="text-muted-foreground ml-1">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
