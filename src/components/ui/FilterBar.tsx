import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  searchValue?: string
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  filters?: Array<{
    key: string
    value: string
    options: FilterOption[]
    onChange: (val: string) => void
    placeholder?: string
  }>
  children?: React.ReactNode
}

export default function FilterBar({ searchValue, onSearchChange, searchPlaceholder, filters, children }: FilterBarProps) {
  const { t } = useTranslation('common')
  const resolvedSearchPlaceholder = searchPlaceholder ?? `${t('search')}...`

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {onSearchChange && (
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchValue || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={resolvedSearchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
      {filters?.map((f) => (
        <select
          key={f.key}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {f.placeholder && <option value="">{f.placeholder}</option>}
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
      {children}
    </div>
  )
}
