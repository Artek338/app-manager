import { useState } from 'react'
import type { ProjectSummary } from '../../types'
import { api } from '../../api/client'
import { KanbanTab } from '../tabs/KanbanTab'
import { LogsTab } from '../tabs/LogsTab'
import { OverviewTab } from '../tabs/OverviewTab'
import { SettingsTab } from '../tabs/SettingsTab'

type Tab = 'kanban' | 'overview' | 'logs' | 'settings'

interface Props {
  project: ProjectSummary
  onClose: () => void
  onRefresh: () => void
}

export function ProjectPanel({ project, onClose, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('kanban')
  const [actionLoading, setActionLoading] = useState(false)

  const isRunning = project.processStatus === 'running' || project.processStatus === 'starting'
  const isBusy = project.processStatus === 'starting' || project.processStatus === 'stopping'
  const isRunnable = !!project.startCommand

  const handleToggle = async () => {
    setActionLoading(true)
    try {
      if (isRunning) await api.stopProject(project.id)
      else await api.startProject(project.id)
      setTimeout(onRefresh, 500)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setActionLoading(false)
    }
  }

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'kanban', label: '📋 Kanban', show: project.hasKanban },
    { id: 'overview', label: '🔍 Przegląd', show: true },
    { id: 'logs', label: `⬛ Logi${project.processStatus === 'running' ? ' ●' : ''}`, show: true },
    { id: 'settings', label: '⚙ Ustawienia', show: true },
  ]

  const visibleTabs = tabs.filter(t => t.show)
  const currentTab = visibleTabs.find(t => t.id === activeTab) ? activeTab : visibleTabs[0]?.id ?? 'overview'

  return (
    <div className="w-[420px] flex-shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 truncate">{project.displayName}</h2>
            {(project.name && project.name !== project.displayName) && (
              <p className="text-xs text-slate-500 truncate">{project.name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none ml-2 flex-shrink-0">✕</button>
        </div>

        {/* Akcje */}
        <div className="flex items-center gap-2">
          {isRunnable && (
            <button
              onClick={handleToggle}
              disabled={isBusy || actionLoading}
              className={`
                text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex-shrink-0
                ${isBusy || actionLoading ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400' :
                  isRunning
                    ? 'bg-red-900/50 text-red-300 hover:bg-red-800/60 border border-red-700/30'
                    : 'bg-green-900/50 text-green-300 hover:bg-green-800/60 border border-green-700/30'
                }
              `}
            >
              {isBusy || actionLoading ? '...' : isRunning ? '⏹ Stop' : '▶ Start'}
            </button>
          )}

          {isRunning && project.ports.map(port => (
            <a
              key={port}
              href={`http://localhost:${port}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-green-900/30 text-green-400 border border-green-700/30 px-2 py-1.5 rounded-lg hover:bg-green-800/40"
            >
              :{port} ↗
            </a>
          ))}

          <span className={`
            ml-auto text-xs px-2 py-0.5 rounded-full
            ${project.processStatus === 'running' ? 'bg-green-900/40 text-green-400' :
              project.processStatus === 'error' ? 'bg-red-900/40 text-red-400' :
              project.processStatus === 'starting' || project.processStatus === 'stopping' ? 'bg-yellow-900/40 text-yellow-400' :
              'bg-slate-800 text-slate-500'
            }
          `}>
            {project.processStatus}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 flex-shrink-0 overflow-x-auto">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              text-xs px-3 py-2.5 whitespace-nowrap transition-colors border-b-2
              ${currentTab === tab.id
                ? 'text-indigo-300 border-indigo-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'kanban' && <KanbanTab projectId={project.id} />}
        {currentTab === 'overview' && <OverviewTab project={project} />}
        {currentTab === 'logs' && <LogsTab projectId={project.id} processStatus={project.processStatus} />}
        {currentTab === 'settings' && <SettingsTab projectId={project.id} onSaved={onRefresh} />}
      </div>
    </div>
  )
}
