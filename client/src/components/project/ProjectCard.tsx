import type { ProjectSummary, ProcessStatus } from '../../types'
import { api } from '../../api/client'

interface Props {
  project: ProjectSummary
  isSelected: boolean
  onClick: () => void
  onRefresh: () => void
}

const STATUS_DOT: Record<ProcessStatus, string> = {
  running: 'bg-green-500',
  starting: 'bg-yellow-400 animate-pulse',
  stopping: 'bg-yellow-400 animate-pulse',
  stopped: 'bg-slate-600',
  error: 'bg-red-500',
}

const TYPE_BADGE: Record<string, string> = {
  'node-vite': 'Node+Vite',
  'node-express': 'Node+Express',
  'node-fullstack': 'Fullstack',
  'node-monorepo': 'Monorepo',
  'python-cli': 'Python',
  'python-fastapi': 'FastAPI',
  'docker': 'Docker',
  'static': 'Docs',
  'unknown': '?',
}

const PROJECT_STATUS_COLOR: Record<string, string> = {
  active: 'border-green-500/30',
  inactive: 'border-slate-600/30',
  archived: 'border-slate-700/20',
  unknown: 'border-slate-700/20',
}

export function ProjectCard({ project, isSelected, onClick, onRefresh }: Props) {
  const isRunnable = project.startCommand !== null
  const isRunning = project.processStatus === 'running' || project.processStatus === 'starting'
  const isBusy = project.processStatus === 'starting' || project.processStatus === 'stopping'

  const progress = project.hasKanban ? null : null

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (isRunning) await api.stopProject(project.id)
      else await api.startProject(project.id)
      setTimeout(onRefresh, 500)
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenBrowser = (e: React.MouseEvent, port: number) => {
    e.stopPropagation()
    window.open(`http://localhost:${port}`, '_blank')
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-xl border p-4 transition-all duration-200
        bg-slate-900/80 hover:bg-slate-800/80
        ${isSelected ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : PROJECT_STATUS_COLOR[project.status]}
        ${project.pinned ? 'order-first' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[project.processStatus]}`} />
          <h3 className="font-semibold text-slate-100 text-sm truncate">{project.displayName}</h3>
          {project.pinned && <span className="text-xs text-amber-400">★</span>}
        </div>
        <span className="text-xs text-slate-500 flex-shrink-0 bg-slate-800 px-2 py-0.5 rounded">
          {TYPE_BADGE[project.type] ?? project.type}
        </span>
      </div>

      {/* Stack */}
      <div className="flex flex-wrap gap-1 mb-3">
        {project.stack.frontend && (
          <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded">
            {project.stack.frontend}
          </span>
        )}
        {project.stack.backend && (
          <span className="text-xs bg-teal-900/50 text-teal-300 px-2 py-0.5 rounded">
            {project.stack.backend}
          </span>
        )}
        {project.stack.database && (
          <span className="text-xs bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded">
            {project.stack.database}
          </span>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{project.description}</p>
      )}

      {/* Ports */}
      {isRunning && project.ports.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {project.ports.map(port => (
            <button
              key={port}
              onClick={(e) => handleOpenBrowser(e, port)}
              className="text-xs bg-green-900/40 text-green-400 border border-green-700/30 px-2 py-0.5 rounded hover:bg-green-800/50 transition-colors"
            >
              :{port} ↗
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {project.hasKanban && (
            <span className="text-xs text-slate-500">📋 Kanban</span>
          )}
        </div>
        {isRunnable && (
          <button
            onClick={handleToggle}
            disabled={isBusy}
            className={`
              text-xs px-3 py-1 rounded-lg font-medium transition-all
              ${isBusy ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400' :
                isRunning
                  ? 'bg-red-900/50 text-red-300 hover:bg-red-800/60 border border-red-700/30'
                  : 'bg-green-900/50 text-green-300 hover:bg-green-800/60 border border-green-700/30'
              }
            `}
          >
            {isBusy ? '...' : isRunning ? '⏹ Stop' : '▶ Start'}
          </button>
        )}
      </div>
    </div>
  )
}
