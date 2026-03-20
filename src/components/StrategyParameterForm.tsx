import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'

/** Supported parameter types for auto-rendering. */
type ParamType = 'number' | 'string' | 'boolean' | 'select'

export interface ParamSchema {
  key: string
  label?: string
  type: ParamType
  defaultValue?: unknown
  min?: number
  max?: number
  step?: number
  options?: { label: string; value: string | number }[]
  description?: string
}

interface StrategyParameterFormProps {
  /** Pre-built schema; if empty, falls back to free-form key-value editing. */
  schema?: ParamSchema[]
  /** Current parameter values. */
  values: Record<string, unknown>
  /** Called on every change. */
  onChange: (values: Record<string, unknown>) => void
  /** If true, show read-only view. */
  readOnly?: boolean
}

/**
 * Renders strategy parameters based on an optional schema.
 * - With schema: typed fields (number sliders, selects, toggles).
 * - Without schema: dynamic key-value editor with type inference.
 */
export default function StrategyParameterForm({
  schema,
  values,
  onChange,
  readOnly = false,
}: StrategyParameterFormProps) {
  if (schema && schema.length > 0) {
    return (
      <div className="space-y-4">
        {schema.map((param) => (
          <SchemaField
            key={param.key}
            param={param}
            value={values[param.key] ?? param.defaultValue ?? ''}
            onChange={(v) => onChange({ ...values, [param.key]: v })}
            readOnly={readOnly}
          />
        ))}
      </div>
    )
  }

  return (
    <FreeFormEditor values={values} onChange={onChange} readOnly={readOnly} />
  )
}

// ── Schema-driven field ─────────────────────────────────────────────

function SchemaField({
  param,
  value,
  onChange,
  readOnly,
}: {
  param: ParamSchema
  value: unknown
  onChange: (v: unknown) => void
  readOnly: boolean
}) {
  const label = param.label || param.key
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {param.description && (
          <span className="ml-2 text-xs text-gray-400">{param.description}</span>
        )}
      </label>
      {param.type === 'number' && (
        <div className="flex items-center gap-3">
          <input
            type="number"
            className="w-full border rounded px-3 py-1.5 text-sm"
            value={value as number}
            min={param.min}
            max={param.max}
            step={param.step ?? 1}
            disabled={readOnly}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          />
          {param.min !== undefined && param.max !== undefined && (
            <input
              type="range"
              className="flex-1"
              min={param.min}
              max={param.max}
              step={param.step ?? 1}
              value={value as number}
              disabled={readOnly}
              onChange={(e) => onChange(parseFloat(e.target.value))}
            />
          )}
        </div>
      )}
      {param.type === 'string' && (
        <input
          type="text"
          className="w-full border rounded px-3 py-1.5 text-sm"
          value={String(value)}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {param.type === 'boolean' && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="text-sm text-gray-600">{label}</span>
        </label>
      )}
      {param.type === 'select' && param.options && (
        <select
          className="w-full border rounded px-3 py-1.5 text-sm"
          value={String(value)}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        >
          {param.options.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  )
}

// ── Free-form key-value editor ──────────────────────────────────────

function FreeFormEditor({
  values,
  onChange,
  readOnly,
}: {
  values: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
  readOnly: boolean
}) {
  const { t } = useTranslation(['strategies'])
  const [entries, setEntries] = useState<{ key: string; value: string }[]>([])

  useEffect(() => {
    const init = Object.entries(values).map(([k, v]) => ({
      key: k,
      value: typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''),
    }))
    setEntries(init.length ? init : [{ key: '', value: '' }])
  }, []) // only on mount

  const sync = useCallback(
    (updated: { key: string; value: string }[]) => {
      setEntries(updated)
      const result: Record<string, unknown> = {}
      for (const e of updated) {
        if (!e.key.trim()) continue
        result[e.key] = inferValue(e.value)
      }
      onChange(result)
    },
    [onChange],
  )

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 mb-1">
        <span>{t('parameterForm.key')}</span><span>{t('parameterForm.value')}</span><span />
      </div>
      {entries.map((e, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder={t('parameterForm.parameterNamePlaceholder')}
            value={e.key}
            disabled={readOnly}
            onChange={(ev) => {
              const n = [...entries]
              n[i] = { ...n[i], key: ev.target.value }
              sync(n)
            }}
          />
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder={t('parameterForm.valuePlaceholder')}
            value={e.value}
            disabled={readOnly}
            onChange={(ev) => {
              const n = [...entries]
              n[i] = { ...n[i], value: ev.target.value }
              sync(n)
            }}
          />
          {!readOnly && (
            <button
              className="text-red-400 hover:text-red-600"
              onClick={() => sync(entries.filter((_, j) => j !== i))}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          onClick={() => sync([...entries, { key: '', value: '' }])}
        >
          <Plus size={14} /> {t('parameterForm.addParameter')}
        </button>
      )}
    </div>
  )
}

function inferValue(v: string): unknown {
  if (v === 'true') return true
  if (v === 'false') return false
  const n = Number(v)
  if (v !== '' && !isNaN(n)) return n
  try {
    return JSON.parse(v)
  } catch {
    return v
  }
}
