import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, X } from 'lucide-react'
import { useState } from 'react'
import { strategiesAPI } from '../lib/api'
import type { Strategy } from '../types'

interface StrategyFormProps {
  strategy?: Strategy
  onClose: () => void
}

export default function StrategyForm({ strategy, onClose }: StrategyFormProps) {
  const queryClient = useQueryClient()
  const isEdit = !!strategy

  const [name, setName] = useState(strategy?.name || '')
  const [description, setDescription] = useState(strategy?.description || '')
  const [code, setCode] = useState(strategy?.code || '')
  const [isActive, setIsActive] = useState(strategy?.is_active ?? true)
  const [error, setError] = useState('')

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Strategy>) => {
      if (isEdit && strategy) {
        return strategiesAPI.update(strategy.id, data)
      }
      return strategiesAPI.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      onClose()
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Failed to save strategy')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Strategy name is required')
      return
    }

    if (!code.trim()) {
      setError('Strategy code is required')
      return
    }

    saveMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      code: code.trim(),
      is_active: isActive,
    })
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">
            {isEdit ? 'Edit Strategy' : 'Create New Strategy'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Strategy Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="My Trading Strategy"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Strategy description..."
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-2">
              Strategy Code *
            </label>
            <textarea
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
              placeholder="from vnpy.trader.app.cta_strategy import CtaTemplate..."
              rows={12}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter your VnPy strategy code here
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              Active (enable this strategy for trading)
            </label>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-input rounded-md hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
