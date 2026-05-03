import type { ProjectSummary } from '../../types'

interface Props { project: ProjectSummary }

export function OverviewTab({ project }: Props) {
  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      {/* Opis */}
      {project.description && (
        <div>
          <p className="text-sm text-slate-300 leading-relaxed">{project.description}</p>
        </div>
      )}

      {/* Stack */}
      <div>
        <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Stack</h4>
        <div className="space-y-1.5">
          {project.stack.frontend && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 w-20">Frontend</span>
              <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded">{project.stack.frontend}</span>
            </div>
          )}
          {project.stack.backend && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 w-20">Backend</span>
              <span className="text-xs bg-teal-900/50 text-teal-300 px-2 py-0.5 rounded">{project.stack.backend}</span>
            </div>
          )}
          {project.stack.database && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 w-20">Baza danych</span>
              <span className="text-xs bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded">{project.stack.database}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 w-20">Język</span>
            <span className="text-xs text-slate-400">{project.stack.language}</span>
          </div>
        </div>
      </div>

      {/* Porty / linki */}
      {project.ports.length > 0 && (
        <div>
          <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Uruchomione porty</h4>
          <div className="flex flex-wrap gap-2">
            {project.ports.map(port => (
              <a
                key={port}
                href={`http://localhost:${port}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm bg-green-900/30 text-green-400 border border-green-700/30 px-3 py-1.5 rounded-lg hover:bg-green-800/40 transition-colors"
              >
                localhost:{port} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Metadane */}
      <div>
        <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Info</h4>
        <div className="space-y-1 text-xs">
          <div className="flex gap-2">
            <span className="text-slate-600 w-28">Typ projektu</span>
            <span className="text-slate-400">{project.type}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-600 w-28">Status</span>
            <span className="text-slate-400">{project.status}</span>
          </div>
          {project.lastStarted && (
            <div className="flex gap-2">
              <span className="text-slate-600 w-28">Ostatnio uruchomiony</span>
              <span className="text-slate-400">{new Date(project.lastStarted).toLocaleString('pl-PL')}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-slate-600 w-28">Ścieżka</span>
            <span className="text-slate-500 font-mono text-xs break-all">{project.path}</span>
          </div>
          {project.startCommand && (
            <div className="flex gap-2">
              <span className="text-slate-600 w-28">Komenda start</span>
              <code className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{project.startCommand}</code>
            </div>
          )}
        </div>
      </div>

      {/* Tagi */}
      {project.tags.length > 0 && (
        <div>
          <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Tagi</h4>
          <div className="flex flex-wrap gap-1">
            {project.tags.map(tag => (
              <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
