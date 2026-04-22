import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Database, Loader2, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SystemConfigCatalogItem } from '../lib/api'
import { systemAPI } from '../lib/api'
import ToggleSwitch from './ui/ToggleSwitch'
import { showToast } from './ui/toast-service'

function formatCategoryLabel(category: string) {
  return category
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatValueSource(source: SystemConfigCatalogItem['value_source']) {
  if (source === 'db') return 'Database'
  if (source === 'legacy_env') return 'Legacy env fallback'
  if (source === 'env') return 'Environment'
  return 'Default'
}

function isNumberType(valueType: SystemConfigCatalogItem['value_type']) {
  return valueType === 'int' || valueType === 'float'
}

export default function SystemConfigTab() {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const { data, isLoading, error } = useQuery<{ configs: SystemConfigCatalogItem[] }>({
    queryKey: ['system-config-catalog'],
    queryFn: () => systemAPI.listConfigCatalog().then((response) => response.data),
  })

  useEffect(() => {
    if (!data?.configs) {
      return
    }
    setDrafts(
      Object.fromEntries(
        data.configs.map((item) => [item.key, item.current_value ?? item.default_value ?? ''])
      )
    )
  }, [data])

  const groupedConfigs = useMemo(() => {
    const groups = new Map<string, SystemConfigCatalogItem[]>()
    for (const item of data?.configs ?? []) {
      const existing = groups.get(item.category) ?? []
      existing.push(item)
      groups.set(item.category, existing)
    }
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right))
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (item: SystemConfigCatalogItem) =>
      systemAPI.upsertConfig({
        config_key: item.key,
        config_value: drafts[item.key] ?? item.current_value ?? item.default_value ?? '',
        category: item.category,
        description: item.description,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['system-config-catalog'] })
      showToast(t('page.systemConfig.saved', 'System configuration saved'), 'success')
    },
  })

  const updateDraft = (key: string, value: string) => {
    setDrafts((current) => ({ ...current, [key]: value }))
  }

  const renderInput = (item: SystemConfigCatalogItem) => {
    const value = drafts[item.key] ?? item.current_value ?? item.default_value ?? ''

    if (item.value_type === 'bool') {
      const checked = value === 'true'
      return (
        <ToggleSwitch
          checked={checked}
          onChange={(next) => updateDraft(item.key, next ? 'true' : 'false')}
          disabled={saveMutation.isPending}
        />
      )
    }

    return (
      <input
        type={isNumberType(item.value_type) ? 'number' : 'text'}
        step={item.value_type === 'float' ? 'any' : undefined}
        value={value}
        onChange={(event) => updateDraft(item.key, event.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-6 flex items-center gap-2">
        <Database size={18} className="text-muted-foreground" />
        <div>
          <h3 className="font-semibold text-card-foreground">
            {t('page.systemConfig.title', 'System Configuration')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(
              'page.systemConfig.description',
              'DB-managed runtime behavior settings take precedence over legacy environment fallbacks and apply without restarting the web app.'
            )}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span>{t('page.systemConfig.loading', 'Loading system configuration...')}</span>
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {t('page.systemConfig.loadError', 'Failed to load system configuration.')}
        </p>
      ) : groupedConfigs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('page.systemConfig.empty', 'No DB-managed system configuration items are available.')}
        </p>
      ) : (
        <div className="space-y-6">
          {groupedConfigs.map(([category, items]) => (
            <section key={category} className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatCategoryLabel(category)}
                </h4>
              </div>
              <div className="space-y-3">
                {items.map((item) => {
                  const draftValue = drafts[item.key] ?? item.current_value ?? item.default_value ?? ''
                  const isDirty = draftValue !== (item.current_value ?? '')
                  const canSave = isDirty || !item.is_overridden
                  return (
                    <div
                      key={item.key}
                      className="rounded-lg border border-border bg-background/50 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="text-sm font-medium text-foreground">{item.label}</h5>
                            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                              {item.key}
                            </span>
                            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                              {formatValueSource(item.value_source)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('page.systemConfig.defaultValue', 'Default')}: {item.default_value || '-'}
                          </p>
                        </div>

                        <div className="w-full max-w-xl space-y-3">
                          {renderInput(item)}
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => saveMutation.mutate(item)}
                              disabled={!canSave || saveMutation.isPending}
                              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              <span>{t('page.systemConfig.save', 'Save')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
