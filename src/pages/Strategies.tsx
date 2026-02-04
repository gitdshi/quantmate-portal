import { BookOpen, Plus } from 'lucide-react'
import { useState } from 'react'
import BuiltinStrategiesModal from '../components/BuiltinStrategiesModal'
import StrategyForm from '../components/StrategyForm'
import StrategyList from '../components/StrategyList'
import StrategyOptimization from '../components/StrategyOptimization'
import StrategyViewModal from '../components/StrategyViewModal'
import type { Strategy } from '../types'

export default function Strategies() {
  const [showForm, setShowForm] = useState(false)
  const [showBuiltin, setShowBuiltin] = useState(false)
  const [showView, setShowView] = useState(false)
  const [editStrategy, setEditStrategy] = useState<Strategy | undefined>()
  const [viewStrategy, setViewStrategy] = useState<Strategy | undefined>()

  const handleEdit = (strategy: Strategy) => {
    setEditStrategy(strategy)
    setShowForm(true)
  }

  const handleView = (strategy: Strategy) => {
    setViewStrategy(strategy)
    setShowView(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditStrategy(undefined)
  }

  const handleCloseView = () => {
    setShowView(false)
    setViewStrategy(undefined)
  }

  const handleUseBuiltin = (code: string, name: string) => {
    setEditStrategy({
      id: 0,
      user_id: 0,
      name: name,
      code: code,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setShowForm(true)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Strategies</h1>
          <p className="text-muted-foreground mt-2">
            Manage your trading strategies
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StrategyOptimization />
          <button
            onClick={() => setShowBuiltin(true)}
            className="px-4 py-2 border border-input rounded-md hover:bg-muted transition-colors flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Built-in Strategies
          </button>
          <button
            onClick={() => {
              setEditStrategy(undefined)
              setShowForm(true)
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Strategy
          </button>
        </div>
      </div>

      <StrategyList onEdit={handleEdit} onView={handleView} />

      {showForm && (
        <StrategyForm
          strategy={editStrategy}
          onClose={handleCloseForm}
        />
      )}

      {showView && viewStrategy && (
        <StrategyViewModal
          strategy={viewStrategy}
          onClose={handleCloseView}
          onEdit={() => {
            handleCloseView()
            handleEdit(viewStrategy)
          }}
        />
      )}

      {showBuiltin && (
        <BuiltinStrategiesModal
          onClose={() => setShowBuiltin(false)}
          onCreate={handleUseBuiltin}
        />
      )}
    </div>
  )
}
