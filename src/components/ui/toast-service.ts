export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ConfirmState {
  open: boolean
  title: string
  message: string
  resolve: ((ok: boolean) => void) | null
}

let toastId = 0
let toastListeners: Array<(items: ToastItem[]) => void> = []
let toastItems: ToastItem[] = []

let confirmState: ConfirmState = { open: false, title: '', message: '', resolve: null }
let confirmListeners: Array<(state: ConfirmState) => void> = []

function emitToasts() {
  toastListeners.forEach((listener) => listener([...toastItems]))
}

function emitConfirm() {
  confirmListeners.forEach((listener) => listener({ ...confirmState }))
}

export function showToast(message: string, type: ToastItem['type'] = 'info') {
  const id = ++toastId
  toastItems = [...toastItems, { id, message, type }]
  emitToasts()
  setTimeout(() => {
    toastItems = toastItems.filter((item) => item.id !== id)
    emitToasts()
  }, 3500)
}

export function dismissToast(id: number) {
  toastItems = toastItems.filter((item) => item.id !== id)
  emitToasts()
}

export function subscribeToToasts(listener: (items: ToastItem[]) => void) {
  toastListeners.push(listener)
  return () => {
    toastListeners = toastListeners.filter((item) => item !== listener)
  }
}

export function showConfirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState = { open: true, title, message, resolve }
    emitConfirm()
  })
}

export function closeConfirm(ok: boolean) {
  confirmState.resolve?.(ok)
  confirmState = { open: false, title: '', message: '', resolve: null }
  emitConfirm()
}

export function subscribeToConfirm(listener: (state: ConfirmState) => void) {
  confirmListeners.push(listener)
  return () => {
    confirmListeners = confirmListeners.filter((item) => item !== listener)
  }
}

export function getConfirmState() {
  return confirmState
}
