import { useQuery } from '@tanstack/react-query'
import { Copy, X } from 'lucide-react'
import { useState } from 'react'
import { strategiesAPI } from '../lib/api'

interface BuiltinStrategiesModalProps {
  onClose: () => void
  onCreate: (code: string, name: string) => void
}

export default function BuiltinStrategiesModal({ onClose, onCreate }: BuiltinStrategiesModalProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<{ name: string; code: string } | null>(null)

  const { data: strategiesData, isLoading } = useQuery({
    queryKey: ['builtin-strategies'],
    queryFn: () => strategiesAPI.listBuiltin(),
  })

  const builtinStrategies = strategiesData?.data || []

  const handleUseStrategy = () => {
    if (selectedStrategy) {
      onCreate(selectedStrategy.code, selectedStrategy.name)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">Built-in Strategies</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="w-1/3 border-r border-border overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading strategies...
              </div>
            ) : builtinStrategies.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No built-in strategies available
              </div>
            ) : (
              <div className="p-2">
                {builtinStrategies.map((strategy: { name: string; code: string; description?: string }, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedStrategy(strategy)}
                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                      selectedStrategy?.name === strategy.name
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{strategy.name}</div>
                    {strategy.description && (
                      <div className="text-xs opacity-80 mt-1">{strategy.description}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedStrategy ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">{selectedStrategy.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Preview the strategy code below
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs font-mono">{selectedStrategy.code}</pre>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a strategy to preview
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-input rounded-md hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUseStrategy}
            disabled={!selectedStrategy}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Use This Strategy
          </button>
        </div>
      </div>
    </div>
  )
}
