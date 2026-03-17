import { useCallback, useEffect, useRef, useState } from 'react'

interface WSMessage {
  type: string
  channel?: string
  data?: unknown
  error?: string
}

interface UseWebSocketOptions {
  channel: string
  enabled?: boolean
  onMessage?: (msg: WSMessage) => void
}

const WS_URL = (import.meta.env.VITE_WS_URL as string) ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/v1/ws`

export function useWebSocket({ channel, enabled = true, onMessage }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const retriesRef = useRef(0)
  const maxRetries = 10
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>()
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!enabled) return
    try {
      const ws = new WebSocket(`${WS_URL}/${channel}`)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        retriesRef.current = 0
        // Heartbeat every 30s
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)
      }

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data)
          if (msg.type !== 'pong') {
            onMessageRef.current?.(msg)
          }
        } catch { /* ignore non-JSON */ }
      }

      ws.onclose = () => {
        setConnected(false)
        if (heartbeatRef.current) clearInterval(heartbeatRef.current)
        // Exponential backoff reconnect
        if (retriesRef.current < maxRetries && enabled) {
          const delay = Math.min(1000 * 2 ** retriesRef.current, 60000)
          retriesRef.current++
          timerRef.current = setTimeout(connect, delay)
        }
      }

      ws.onerror = () => { ws.close() }
    } catch { /* connection failed, onclose will handle retry */ }
  }, [channel, enabled])

  useEffect(() => {
    connect()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on unmount
        wsRef.current.close()
      }
    }
  }, [connect])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const subscribe = useCallback((newChannel: string) => {
    send({ type: 'subscribe', channel: newChannel })
  }, [send])

  const unsubscribe = useCallback((oldChannel: string) => {
    send({ type: 'unsubscribe', channel: oldChannel })
  }, [send])

  return { connected, send, subscribe, unsubscribe }
}
