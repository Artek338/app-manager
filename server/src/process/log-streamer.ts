import { EventEmitter } from 'events'

export interface LogLine {
  timestamp: string
  projectId: string
  source: 'stdout' | 'stderr'
  text: string
  level: 'info' | 'warn' | 'error' | 'debug'
}

class CircularBuffer<T> {
  private buf: T[] = []
  constructor(private maxSize: number) {}

  push(item: T): void {
    if (this.buf.length >= this.maxSize) this.buf.shift()
    this.buf.push(item)
  }

  getAll(): T[] { return [...this.buf] }
  getLast(n: number): T[] { return this.buf.slice(-n) }
  clear(): void { this.buf = [] }
}

function detectLevel(text: string, source: 'stdout' | 'stderr'): LogLine['level'] {
  if (source === 'stderr') return 'error'
  const lower = text.toLowerCase()
  if (lower.includes('error') || lower.includes('err ') || lower.includes('fatal')) return 'error'
  if (lower.includes('warn') || lower.includes('warning')) return 'warn'
  if (lower.includes('debug') || lower.includes('verbose')) return 'debug'
  return 'info'
}

export class LogStreamer extends EventEmitter {
  private buffers = new Map<string, CircularBuffer<LogLine>>()

  private getBuffer(projectId: string): CircularBuffer<LogLine> {
    if (!this.buffers.has(projectId)) {
      this.buffers.set(projectId, new CircularBuffer(500))
    }
    return this.buffers.get(projectId)!
  }

  append(projectId: string, text: string, source: 'stdout' | 'stderr'): void {
    const line: LogLine = {
      timestamp: new Date().toISOString(),
      projectId,
      source,
      text: stripAnsi(text),
      level: detectLevel(text, source),
    }
    this.getBuffer(projectId).push(line)
    this.emit('log', line)
  }

  getRecent(projectId: string, limit = 100): LogLine[] {
    return this.getBuffer(projectId).getLast(limit)
  }

  clear(projectId: string): void {
    this.getBuffer(projectId).clear()
  }
}

// Usuwa kody ANSI kolorów z tekstu terminala
function stripAnsi(text: string): string {
  return text.replace(/\x1B\[[0-9;]*[mGKH]/g, '').replace(/\r/g, '')
}

export const logStreamer = new LogStreamer()
