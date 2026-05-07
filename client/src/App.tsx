import { useState } from 'react'
import { useProjects } from './hooks/useProjects'
import { Sidebar } from './components/layout/Sidebar'
import { ProjectGrid } from './components/project/ProjectGrid'
import { ProjectPanel } from './components/project/ProjectPanel'
import './index.css'

export default function App() {
  const { projects, loading, error, refresh } = useProjects()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const selectedProject = projects.find(p => p.id === selectedId) ?? null

  const handleSelect = (id: string) => {
    setSelectedId(prev => prev === id ? null : id)
    setSidebarOpen(false)
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
      {/* Backdrop dla sidebar na mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        projects={projects}
        selectedId={selectedId}
        onSelect={handleSelect}
        onRefresh={refresh}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Otwórz menu"
            >
              ☰
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-200">Wszystkie projekty</h2>
              <p className="text-xs text-slate-500">{projects.length} projektów</p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="flex-shrink-0 text-xs text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
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
