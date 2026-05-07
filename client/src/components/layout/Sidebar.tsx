import type { ProjectSummary, ProcessStatus } from '../../types'
import { api } from '../../api/client'

interface Props {
  projects: ProjectSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRefresh: () => void
  isOpen: boolean
  onClose: () => void
}

const DOT: Record<ProcessStatus, string> = {
  running: 'bg-green-500',
  starting: 'bg-yellow-400 animate-pulse',
  stopping: 'bg-yellow-400',
  stopped: 'bg-slate-600',
  error: 'bg-red-500',
}

export function Sidebar({ projects, selectedId, onSelect, onRefresh, isOpen, onClose }: Props) {
  const running = projects.filter(p => p.processStatus === 'running' || p.processStatus === 'starting')

  const handleScan = async () => {
    await api.scan()
    onRefresh()
  }

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-72 flex flex-col
      bg-slate-950 border-r border-slate-800 h-screen
      transition-transform duration-300 ease-in-out
      md:sticky md:top-0 md:inset-auto md:z-auto md:w-52 md:flex-shrink-0 md:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-100">App Manager</h1>
          <p className="text-xs text-slate-500 mt-0.5">{projects.length} projektów</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Zamknij menu"
        >
          ✕
        </button>
      </div>

      {/* Lista projektów */}
      <div className="flex-1 overflow-y-auto py-2">
        <p className="text-xs text-slate-600 px-4 py-1 uppercase tracking-wider">Projekty</p>
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`
              w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors
              ${p.id === selectedId
                ? 'bg-indigo-900/40 text-indigo-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }
            `}
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[p.processStatus]}`} />
            <span className="truncate">{p.displayName}</span>
          </button>
        ))}
      </div>

      {/* Sekcja: Uruchomione */}
      {running.length > 0 && (
        <div className="border-t border-slate-800 py-2">
          <p className="text-xs text-slate-600 px-4 py-1 uppercase tracking-wider">Uruchomione</p>
          {running.map(p => (
            <div key={p.id} className="px-4 py-1">
              <p className="text-xs text-green-400 truncate">{p.displayName}</p>
              {p.ports.map(port => (
                <a
                  key={port}
                  href={`http://localhost:${port}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-300 block"
                  onClick={e => e.stopPropagation()}
                >
                  :{port}
                </a>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Scan button */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleScan}
          className="w-full text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 py-1.5 rounded transition-colors"
        >
          ↻ Skanuj projekty
        </button>
      </div>
    </aside>
  )
}
