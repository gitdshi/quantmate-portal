import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type EmptyStateType = 'setup' | 'activity' | 'risk' | 'preview'

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
}

interface EmptyStateProps {
  type: EmptyStateType
  icon?: ReactNode
  title: string
  explanation: string
  primaryCTA: EmptyStateAction
  secondaryCTAs?: EmptyStateAction[]
  helperText?: string
  className?: string
}

const toneClasses: Record<EmptyStateType, { panel: string; icon: string; accent: string }> = {
  setup: {
    panel: 'border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50',
    icon: 'bg-blue-600 text-white',
    accent: 'text-blue-700',
  },
  activity: {
    panel: 'border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/80',
    icon: 'bg-slate-800 text-white',
    accent: 'text-slate-700',
  },
  risk: {
    panel: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50',
    icon: 'bg-amber-500 text-white',
    accent: 'text-amber-800',
  },
  preview: {
    panel: 'border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50',
    icon: 'bg-indigo-600 text-white',
    accent: 'text-indigo-700',
  },
}

function ActionButton({
  action,
  primary,
}: {
  action: EmptyStateAction
  primary: boolean
}) {
  const className = primary
    ? 'inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90'
    : 'inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted'

  if (action.href) {
    return (
      <Link to={action.href} className={className}>
        {action.label}
      </Link>
    )
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  )
}

export default function EmptyState({
  type,
  icon,
  title,
  explanation,
  primaryCTA,
  secondaryCTAs = [],
  helperText,
  className = '',
}: EmptyStateProps) {
  const tone = toneClasses[type]

  return (
    <section className={`overflow-hidden rounded-2xl border ${tone.panel} ${className}`}>
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-start md:justify-between md:p-8">
        <div className="flex max-w-2xl gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
            {icon}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{explanation}</p>
            {helperText && <p className={`text-sm font-medium ${tone.accent}`}>{helperText}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <ActionButton action={primaryCTA} primary />
          {secondaryCTAs.map((action) => (
            <ActionButton
              key={`${action.label}-${action.href ?? 'button'}`}
              action={action}
              primary={false}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
