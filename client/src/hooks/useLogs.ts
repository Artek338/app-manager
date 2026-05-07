import { useState, useEffect, useRef } from 'react'
import type { LogLine } from '../types'

export function useLogs(projectId: string | null) {
  const [lines, setLines] = useState<LogLine[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!projectId) { setLines([]); return }

    const ws = new WebSocket(`ws://${window.location.host}/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', projectId }))
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'log' && msg.projectId === projectId) {
          setLines(prev => [...prev.slice(-499), msg.data])
        }
        if (msg.type === 'log_batch' && msg.projectId === projectId) {
          setLines(msg.data)
        }
      } catch {}
    }

    ws.onclose = () => {
      // Próba reconnect po 3s
      setTimeout(() => {
        if (wsRef.current === ws) wsRef.current = null
      }, 3000)
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe', projectId }))
      }
      ws.close()
      wsRef.current = null
    }
  }, [projectId])

  return lines
}
