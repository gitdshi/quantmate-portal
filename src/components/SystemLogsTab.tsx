import { RefreshCcw, RotateCcw, SquareTerminal } from 'lucide-react'
import { startTransition, useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { systemAPI, type SystemLogStreamError, type SystemLogStreamEvent } from '../lib/api'

const MAX_RENDERED_LINES = 500
const AUTO_RECONNECT_BASE_DELAY_MS = 1000
const AUTO_RECONNECT_MAX_DELAY_MS = 10000

const LOG_MODULES = [
  { key: 'api', label: 'API', description: 'FastAPI application and request logs' },
  { key: 'datasync', label: 'DataSync', description: 'Scheduler and sync daemon activity' },
  { key: 'datasync-init', label: 'DataSync Init', description: 'Initialization and reconciliation output' },
  { key: 'datasync-backfill', label: 'DataSync Backfill', description: 'Backfill task execution logs' },
  { key: 'worker', label: 'Worker', description: 'RQ worker and job execution logs' },
  { key: 'rdagent', label: 'RDAgent', description: 'Agent service and tool invocation logs' },
  { key: 'portal', label: 'Portal', description: 'Frontend container and web server logs' },
] as const

function formatStreamError(error: unknown, fallback: string): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return ''
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

function shouldRetryStream(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return false
  }

  const streamError = error as SystemLogStreamError | undefined
  if (typeof streamError?.status === 'number') {
    return streamError.status >= 500
  }

  return true
}

export default function SystemLogsTab() {
  const { t } = useTranslation('settings')
  const [selectedModule, setSelectedModule] = useState<string>('api')
  const [tail, setTail] = useState<number>(200)
  const [refreshKey, setRefreshKey] = useState(0)
  const [retryKey, setRetryKey] = useState(0)
  const [lines, setLines] = useState<string[]>([])
  const deferredLines = useDeferredValue(lines)
  const [status, setStatus] = useState<'connecting' | 'streaming' | 'error'>('connecting')
  const [containerName, setContainerName] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const logViewportRef = useRef<HTMLDivElement | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptRef = useRef(0)
  const defaultStreamError = t('page.systemLogs.streamFailed', 'Log stream failed')

  const clearReconnectTimer = useEffectEvent(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  })

  const scheduleReconnect = useEffectEvent((message?: string) => {
    clearReconnectTimer()
    reconnectAttemptRef.current += 1
    const delay = Math.min(
      AUTO_RECONNECT_BASE_DELAY_MS * (2 ** (reconnectAttemptRef.current - 1)),
      AUTO_RECONNECT_MAX_DELAY_MS,
    )
    const seconds = Math.ceil(delay / 1000)
    setStatus('connecting')
    setErrorMessage(
      t(
        'page.systemLogs.reconnecting',
        'Connection lost. Reconnecting in {{seconds}}s.',
        { seconds, reason: message || defaultStreamError },
      ),
    )
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null
      setRetryKey((value) => value + 1)
    }, delay)
  })

  const activeModule = LOG_MODULES.find((item) => item.key === selectedModule) ?? LOG_MODULES[0]

  const handleLogEvent = useEffectEvent((event: SystemLogStreamEvent) => {
    if (event.type === 'meta') {
      clearReconnectTimer()
      reconnectAttemptRef.current = 0
      setStatus('streaming')
      setContainerName(event.container || '')
      setErrorMessage('')
      return
    }

    if (event.type === 'heartbeat') {
      setStatus('streaming')
      return
    }

    if (event.type === 'error') {
      setStatus('error')
      setErrorMessage(event.message || defaultStreamError)
      return
    }

    const line = event.line?.trimEnd()
    if (!line) {
      return
    }

    startTransition(() => {
      setLines((previous) => {
        const next = previous.length >= MAX_RENDERED_LINES
          ? previous.slice(previous.length - MAX_RENDERED_LINES + 1)
          : previous
        return [...next, line]
      })
    })
  })

  useEffect(() => {
    clearReconnectTimer()
    reconnectAttemptRef.current = 0
    setRetryKey(0)
    setStatus('connecting')
    setContainerName('')
    setErrorMessage('')
    setLines([])

    return () => clearReconnectTimer()
  }, [clearReconnectTimer, refreshKey, selectedModule, tail])

  useEffect(() => {
    const viewport = logViewportRef.current
    if (!viewport) {
      return
    }
    viewport.scrollTop = viewport.scrollHeight
  }, [deferredLines])

  useEffect(() => {
    const abortController = new AbortController()
    setStatus((previous) => (previous === 'streaming' ? previous : 'connecting'))

    void systemAPI
      .streamLogs({
        module: selectedModule,
        tail,
        signal: abortController.signal,
        onEvent: handleLogEvent,
      })
      .then(() => {
        if (abortController.signal.aborted) {
          return
        }
        scheduleReconnect(t('page.systemLogs.streamEnded', 'Log stream ended.'))
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return
        }

        const message = formatStreamError(
          error,
          defaultStreamError
        )
        if (!message) {
          return
        }

        setStatus('error')
        setErrorMessage(message)
        if (shouldRetryStream(error)) {
          scheduleReconnect(message)
        }
      })

    return () => abortController.abort()
  }, [defaultStreamError, handleLogEvent, retryKey, scheduleReconnect, selectedModule, tail])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SquareTerminal size={18} className="text-muted-foreground" />
              <h3 className="font-semibold text-card-foreground">
                {t('page.systemLogs.title', 'System Logs')}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                'page.systemLogs.subtitle',
                'Tail live container stdout and stderr from the current deployment.'
              )}
            </p>
            <p className="text-xs text-muted-foreground">{activeModule.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor="system-log-tail-size">
              {t('page.systemLogs.tailLabel', 'Initial tail size')}
            </label>
            <select
              id="system-log-tail-size"
              aria-label={t('page.systemLogs.tailAria', 'Initial tail size')}
              value={tail}
              onChange={(event) => setTail(Number(event.target.value))}
              className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
            >
              {[100, 200, 500].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setLines([])}
              className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              {t('page.systemLogs.clear', 'Clear')}
            </button>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
            >
              <RefreshCcw size={12} />
              {t('page.systemLogs.reconnect', 'Reconnect')}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={t('page.systemLogs.moduleAria', 'System log modules')}>
          {LOG_MODULES.map((module) => {
            const isActive = module.key === selectedModule
            return (
              <button
                key={module.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedModule(module.key)}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {module.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                status === 'streaming'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : status === 'error'
                    ? 'bg-red-500/15 text-red-300'
                    : 'bg-amber-500/15 text-amber-200'
              }`}
            >
              {status === 'streaming'
                ? t('page.systemLogs.status.streaming', 'Streaming')
                : status === 'error'
                  ? t('page.systemLogs.status.error', 'Stream error')
                  : t('page.systemLogs.status.connecting', 'Connecting')}
            </span>
            <span className="text-zinc-400">{activeModule.label}</span>
            {containerName && <span className="text-zinc-500">{containerName}</span>}
          </div>

          <div className="flex items-center gap-2 text-zinc-400">
            <RotateCcw size={12} />
            <span>
              {t('page.systemLogs.lineCount', '{{count}} lines', { count: deferredLines.length })}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-200">
            {errorMessage}
          </div>
        )}

        <div
          ref={logViewportRef}
          className="h-[30rem] overflow-auto px-4 py-3 font-mono text-[12px] leading-5"
          aria-live="polite"
        >
          {deferredLines.length > 0 ? (
            <pre className="whitespace-pre-wrap break-words text-zinc-100">{deferredLines.join('\n')}</pre>
          ) : (
            <div className="text-sm text-zinc-400">
              {status === 'connecting'
                ? t('page.systemLogs.waiting', 'Opening log stream...')
                : t('page.systemLogs.empty', 'No log lines received yet for this module.')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
