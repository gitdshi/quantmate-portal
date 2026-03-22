import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  className?: string
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: string
  emptyText?: string
  onRowClick?: (row: T) => void
  className?: string
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, keyField = 'id', emptyText, onRowClick, className = '',
}: DataTableProps<T>) {
  const { t } = useTranslation('common')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const resolvedEmptyText = emptyText ?? t('noData')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey]
        const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sortDir === 'asc' ? cmp : -cmp
      })
    : data

  return (
    <div className={`overflow-x-auto rounded-lg border border-border ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-medium text-muted-foreground ${col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''} ${col.className || ''}`}
                style={col.width ? { width: col.width } : undefined}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                {resolvedEmptyText}
              </td>
            </tr>
          ) : (
            sorted.map((row, idx) => (
              <tr
                key={row[keyField] ?? idx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-border transition-colors hover:bg-muted/50 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
