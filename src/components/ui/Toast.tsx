import { useEffect, useState } from 'react'
import { CheckCircle, Info, X, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  closeConfirm,
  dismissToast,
  getConfirmState,
  subscribeToConfirm,
  subscribeToToasts,
  type ToastItem,
} from './toast-service'

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => subscribeToToasts(setToasts), [])

  if (toasts.length === 0) return null

  const iconMap = { success: CheckCircle, error: XCircle, info: Info }
  const colorMap = {
    success: 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    error: 'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    info: 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type]
        return (
          <div key={toast.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg border-l-4 shadow-lg text-sm ${colorMap[toast.type]}`}>
            <Icon size={16} />
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => dismissToast(toast.id)} className="p-0.5 hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function ConfirmDialog() {
  const { t } = useTranslation('common')
  const [state, setState] = useState(getConfirmState())

  useEffect(() => subscribeToConfirm(setState), [])

  if (!state.open) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => closeConfirm(false)} />
      <div className="relative max-w-sm w-full mx-4 rounded-lg border border-border bg-card shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{state.message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => closeConfirm(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">{t('cancel')}</button>
          <button onClick={() => closeConfirm(true)} className="px-4 py-2 text-sm rounded-md bg-destructive text-white hover:opacity-90">{t('confirm')}</button>
        </div>
      </div>
    </div>
  )
}
