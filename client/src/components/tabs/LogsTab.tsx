import { useEffect, useRef } from 'react'
import { useLogs } from '../../hooks/useLogs'
import type { LogLine } from '../../types'

interface Props {
  projectId: string
  processStatus: string
}

const LEVEL_COLOR: Record<LogLine['level'], string> = {
  error: 'text-red-400',
  warn: 'text-yellow-400',
  info: 'text-slate-300',
  debug: 'text-slate-500',
}

export function LogsTab({ projectId, processStatus }: Props) {
  const lines = useLogs(projectId)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  const prevLenRef = useRef(0)
  useEffect(() => {
    if (!autoScrollRef.current || !bottomRef.current) return
    const behavior = lines.length - prevLenRef.current > 5 ? 'instant' : 'smooth'
    bottomRef.current.scrollIntoView({ behavior: behavior as ScrollBehavior })
    prevLenRef.current = lines.length
  }, [lines])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    autoScrollRef.current = atBottom
  }

  if (processStatus === 'stopped' && lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500">
        <p className="text-4xl mb-3">⏸</p>
        <p className="text-sm">Projekt zatrzymany</p>
        <p className="text-xs text-slate-600 mt-1">Uruchom projekt żeby zobaczyć logi</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 flex-shrink-0">
        <span className="text-xs text-slate-500 font-mono">{lines.length} linii</span>
        <div className="flex items-center gap-2">
          {processStatus === 'running' && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              live
            </span>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
      >
        {lines.length === 0 ? (
          <p className="text-slate-600">Czekam na logi...</p>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="flex gap-2 hover:bg-slate-800/30 px-1 rounded">
              <span className="text-slate-700 flex-shrink-0 select-none">
                {new Date(line.timestamp).toLocaleTimeString('pl-PL', { hour12: false })}
              </span>
              <span className={`break-all ${LEVEL_COLOR[line.level]}`}>{line.text}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
