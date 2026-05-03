import { useState } from 'react'
import { useProjects } from './hooks/useProjects'
import { Sidebar } from './components/layout/Sidebar'
import { ProjectGrid } from './components/project/ProjectGrid'
import { ProjectPanel } from './components/project/ProjectPanel'
import './index.css'

export default function App() {
  const { projects, loading, error, refresh } = useProjects()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedProject = projects.find(p => p.id === selectedId) ?? null

  const handleSelect = (id: string) => {
    setSelectedId(prev => prev === id ? null : id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙</div>
          <p>Łączenie z App Manager...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-red-400">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠</div>
          <p className="font-semibold mb-2">Błąd połączenia z serwerem</p>
          <p className="text-sm text-slate-500">{error}</p>
          <p className="text-xs text-slate-600 mt-3">
            Upewnij się że serwer działa na porcie 3333
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar
        projects={projects}
        selectedId={selectedId}
        onSelect={handleSelect}
        onRefresh={refresh}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Wszystkie projekty</h2>
            <p className="text-xs text-slate-500">{projects.length} projektów</p>
          </div>
          <button
            onClick={refresh}
            className="text-xs text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            ↻ Odśwież
          </button>
        </div>

        <ProjectGrid
          projects={projects}
          selectedId={selectedId}
          onSelect={handleSelect}
          onRefresh={refresh}
        />
      </main>

      {selectedProject && (
        <ProjectPanel
          project={selectedProject}
          onClose={() => setSelectedId(null)}
          onRefresh={refresh}
        />
      )}
    </div>
  )
}
