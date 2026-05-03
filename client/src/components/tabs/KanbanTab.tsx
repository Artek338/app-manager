import { useState, useEffect } from 'react'
import type { KanbanBoard as KanbanBoardType } from '../../types'
import { api } from '../../api/client'
import { KanbanBoard } from '../kanban/KanbanBoard'

interface Props { projectId: string }

export function KanbanTab({ projectId }: Props) {
  const [board, setBoard] = useState<KanbanBoardType | null>(null)
  const [lastModified, setLastModified] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api.getKanban(projectId)
      .then(data => {
        setBoard(data.board)
        setLastModified(data.lastModified)
        setError(null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <div className="flex items-center justify-center h-32 text-slate-500 text-sm">Ładowanie kanbanu...</div>
  if (error) return <div className="p-4 text-red-400 text-sm">Błąd: {error}</div>
  if (!board) return (
    <div className="flex flex-col items-center justify-center h-48 text-slate-500">
      <p className="text-4xl mb-3">📋</p>
      <p className="text-sm">Brak pliku kanban.md dla tego projektu</p>
      <p className="text-xs text-slate-600 mt-1">Utwórz kanban.md w Obsidianie</p>
    </div>
  )

  return <KanbanBoard board={board} lastModified={lastModified} />
}
