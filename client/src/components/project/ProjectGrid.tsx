import type { ProjectSummary } from '../../types'
import { ProjectCard } from './ProjectCard'

interface Props {
  projects: ProjectSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRefresh: () => void
}

export function ProjectGrid({ projects, selectedId, onSelect, onRefresh }: Props) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <p className="text-lg mb-2">Brak projektów</p>
        <p className="text-sm">Sprawdź ścieżkę w konfiguracji serwera</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          isSelected={project.id === selectedId}
          onClick={() => onSelect(project.id)}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}
