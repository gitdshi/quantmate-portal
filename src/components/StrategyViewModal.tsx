import { useQuery } from '@tanstack/react-query'
import { Calendar, Code, GitCompare, Settings, User, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { strategiesAPI } from '../lib/api'
import type { Strategy } from '../types'

interface StrategyFactor {
  id: number
  factor_name: string
  factor_set: string
  weight: number
  direction: number
  expression?: string
  category?: string
}

interface StrategyViewModalProps {
  strategy: Strategy
  onClose: () => void
  onEdit: () => void
}

export default function StrategyViewModal({ strategy, onClose, onEdit }: StrategyViewModalProps) {
  const { t } = useTranslation(['strategies', 'common'])

  const { data: linkedFactors = [] } = useQuery<StrategyFactor[]>({
    queryKey: ['strategy-factors', strategy.id],
    queryFn: () => strategiesAPI.getFactors(strategy.id).then((r) => r.data ?? []),
  })
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{strategy.name}</h2>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium">
              v{strategy.version}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                strategy.is_active
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-gray-500/10 text-gray-500'
              }`}
            >
              {strategy.is_active ? t('common:active') : t('common:inactive')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {strategy.description && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('common:description')}</h3>
              <p className="text-sm">{strategy.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('view.userId')}</span>
              <span>{strategy.user_id}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('view.created')}</span>
              <span>{new Date(strategy.created_at).toLocaleString()}</span>
            </div>
          </div>

          {strategy.parameters && Object.keys(strategy.parameters).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">{t('common:parameters')}</h3>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                {Object.entries(strategy.parameters).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{key}:</span>
                    <span className="text-muted-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {linkedFactors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GitCompare className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Linked Factors</h3>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                {linkedFactors.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{f.factor_name}</span>
                    <div className="flex items-center gap-3 text-muted-foreground text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{f.factor_set}</span>
                      <span>W: {f.weight}</span>
                      <span>{f.direction === 1 ? 'Long' : 'Short'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Code className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">{t('view.strategyCode')}</h3>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs font-mono">{strategy.code}</pre>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-input rounded-md hover:bg-muted transition-colors"
          >
            {t('common:close')}
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {t('editStrategy')}
          </button>
        </div>
      </div>
    </div>
  )
}
