import { useEffect, useRef, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let toastId = 0
let listeners: Array<(items: ToastItem[]) => void> = []
let items: ToastItem[] = []

function emit() { listeners.forEach((l) => l([...items])) }

export function showToast(message: string, type: ToastItem['type'] = 'info') {
  const id = ++toastId
  items = [...items, { id, message, type }]
  emit()
  setTimeout(() => { items = items.filter((t) => t.id !== id); emit() }, 3500)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    listeners.push(setToasts)
    return () => { listeners = listeners.filter((l) => l !== setToasts) }
  }, [])

  if (toasts.length === 0) return null

  const iconMap = { success: CheckCircle, error: XCircle, info: Info }
  const colorMap = {
    success: 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    error: 'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    info: 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const Icon = iconMap[t.type]
        return (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg border-l-4 shadow-lg text-sm ${colorMap[t.type]}`}>
            <Icon size={16} />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => { items = items.filter((x) => x.id !== t.id); emit() }} className="p-0.5 hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// Confirm dialog
interface ConfirmState {
  open: boolean
  title: string
  message: string
  resolve: ((ok: boolean) => void) | null
}

let confirmState: ConfirmState = { open: false, title: '', message: '', resolve: null }
let confirmListeners: Array<(s: ConfirmState) => void> = []

function emitConfirm() { confirmListeners.forEach((l) => l({ ...confirmState })) }

export function showConfirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState = { open: true, title, message, resolve }
    emitConfirm()
  })
}

export function ConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(confirmState)

  useEffect(() => {
    confirmListeners.push(setState)
    return () => { confirmListeners = confirmListeners.filter((l) => l !== setState) }
  }, [])

  const handleClose = useCallback((ok: boolean) => {
    state.resolve?.(ok)
    confirmState = { open: false, title: '', message: '', resolve: null }
    emitConfirm()
  }, [state.resolve])

  if (!state.open) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => handleClose(false)} />
      <div className="relative max-w-sm w-full mx-4 rounded-lg border border-border bg-card shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{state.message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => handleClose(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">取消</button>
          <button onClick={() => handleClose(true)} className="px-4 py-2 text-sm rounded-md bg-destructive text-white hover:opacity-90">确认</button>
        </div>
      </div>
    </div>
  )
}
