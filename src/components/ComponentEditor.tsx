/**
 * Shared component editor panel used by ComponentsTab and Composite Strategies.
 *
 * Displays code / config / parameters tabs with a collapsible backtest drawer.
 */

import { useMutation } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Loader2,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge, { type BadgeVariant } from './ui/Badge'
import TabPanel from './ui/TabPanel'
import { showToast } from './ui/toast-service'
import { componentBacktestAPI } from '../lib/api'
import type { ComponentLayer, StrategyComponent } from '../types'

const LAYER_VARIANT: Record<ComponentLayer, BadgeVariant> = {
  universe: 'primary',
  trading: 'warning',
  risk: 'destructive',
}

type EditorSubTab = 'code' | 'config' | 'parameters'

type ComponentEditorProps = {
  detail: StrategyComponent | null
  onDelete?: (id: number) => void
  emptyMessage?: string
}

export default function ComponentEditor({ detail, onDelete, emptyMessage }: ComponentEditorProps) {
  const { t } = useTranslation('strategies')
  const [editorTab, setEditorTab] = useState<EditorSubTab>('code')
  const [showBacktest, setShowBacktest] = useState(false)

  const backtestMut = useMutation({
    mutationFn: (id: number) => componentBacktestAPI.run(id),
    onSuccess: () => showToast(t('page.components.backtestDone', 'Backtest complete'), 'success'),
  })

  const backtestResult = backtestMut.data?.data as Record<string, unknown> | undefined

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {emptyMessage || t('page.components.selectPrompt', 'Select a component to edit')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">{detail.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={LAYER_VARIANT[detail.layer]}>{detail.layer}</Badge>
            <span className="text-xs text-muted-foreground">{detail.sub_type}</span>
          </div>
        </div>
        {onDelete && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDelete(detail.id)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* sub-tabs */}
      <TabPanel
        tabs={[
          { key: 'code', label: t('page.components.tabs.code', 'Code') },
          { key: 'config', label: t('page.components.tabs.config', 'Config') },
          { key: 'parameters', label: t('page.components.tabs.parameters', 'Parameters') },
        ]}
        activeTab={editorTab}
        onChange={(k) => setEditorTab(k as EditorSubTab)}
      >
        <div className="min-h-[300px]">
          {editorTab === 'code' && (
            <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[400px] whitespace-pre-wrap">
              {detail.code || '# No code yet'}
            </pre>
          )}
          {editorTab === 'config' && (
            <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[400px] whitespace-pre-wrap">
              {JSON.stringify(detail.config ?? {}, null, 2)}
            </pre>
          )}
          {editorTab === 'parameters' && (
            <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[400px] whitespace-pre-wrap">
              {JSON.stringify(detail.parameters ?? {}, null, 2)}
            </pre>
          )}
        </div>
      </TabPanel>

      {/* backtest drawer */}
      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setShowBacktest(!showBacktest)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {showBacktest ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <FlaskConical size={14} />
          {t('page.components.backtest', 'Component Backtest')}
        </button>

        {showBacktest && (
          <div className="mt-3 space-y-3">
            <button
              type="button"
              onClick={() => backtestMut.mutate(detail.id)}
              disabled={backtestMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {backtestMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
              {t('page.components.runBacktest', 'Run Backtest')}
            </button>

            {backtestResult && (
              <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-[300px] whitespace-pre-wrap">
                {JSON.stringify(backtestResult, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
