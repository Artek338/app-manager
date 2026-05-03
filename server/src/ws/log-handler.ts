import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { logStreamer, LogLine } from '../process/log-streamer'
import { processManager, ManagedProcess } from '../process/manager'

interface WSClientMessage {
  type: 'subscribe' | 'unsubscribe'
  projectId: string
}

function send(ws: WebSocket, data: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}

export function setupWebSocket(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    const subscriptions = new Set<string>()

    ws.on('message', (raw) => {
      try {
        const msg: WSClientMessage = JSON.parse(raw.toString())

        if (msg.type === 'subscribe' && msg.projectId) {
          subscriptions.add(msg.projectId)
          // Wyślij ostatnie 100 linii z bufora
          const recent = logStreamer.getRecent(msg.projectId, 100)
          if (recent.length > 0) {
            send(ws, { type: 'log_batch', projectId: msg.projectId, data: recent })
          }
          // Wyślij aktualny status procesu
          const status = processManager.getStatus(msg.projectId)
          if (status) {
            send(ws, { type: 'status', projectId: msg.projectId, data: status })
          }
        }

        if (msg.type === 'unsubscribe' && msg.projectId) {
          subscriptions.delete(msg.projectId)
        }
      } catch {}
    })

    const onLog = (line: LogLine) => {
      if (subscriptions.has(line.projectId)) {
        send(ws, { type: 'log', projectId: line.projectId, data: line })
      }
    }

    const onStatus = (update: { projectId: string; status: string; ports: number[] }) => {
      if (subscriptions.has(update.projectId)) {
        send(ws, { type: 'status', projectId: update.projectId, data: update })
      }
    }

    logStreamer.on('log', onLog)
    processManager.on('status', onStatus)

    const pingInterval = setInterval(() => {
      send(ws, { type: 'ping', data: null })
    }, 30_000)

    ws.on('close', () => {
      logStreamer.off('log', onLog)
      processManager.off('status', onStatus)
      clearInterval(pingInterval)
      subscriptions.clear()
    })
  })

  return wss
}
