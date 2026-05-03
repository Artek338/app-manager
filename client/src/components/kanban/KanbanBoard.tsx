import type { KanbanBoard as KanbanBoardType } from '../../types'

interface Props {
  board: KanbanBoardType
  lastModified: string | null
}

const COLUMN_COLORS: Record<string, string> = {
  '🔴': 'border-red-500/40 bg-red-950/10',
  '🟠': 'border-orange-500/40 bg-orange-950/10',
  '🟡': 'border-yellow-500/40 bg-yellow-950/10',
  '🟢': 'border-green-500/40 bg-green-950/10',
  '✅': 'border-slate-600/40 bg-slate-900/20',
  '🔵': 'border-blue-500/40 bg-blue-950/10',
}

function getColumnStyle(emoji: string | null): string {
  if (!emoji) return 'border-slate-700/40 bg-slate-900/20'
  for (const [key, val] of Object.entries(COLUMN_COLORS)) {
    if (emoji.includes(key)) return val
  }
  return 'border-slate-700/40 bg-slate-900/20'
}

export function KanbanBoard({ board, lastModified }: Props) {
  const donePct = board.totalTasks > 0 ? Math.round((board.doneTasks / board.totalTasks) * 100) : 0

  return (
    <div className="h-full flex flex-col">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-800 flex-shrink-0">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{board.doneTasks}/{board.totalTasks} zadań</span>
            <span>{donePct}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${donePct}%` }}
            />
          </div>
        </div>
        {lastModified && (
          <span className="text-xs text-slate-600">
            {new Date(lastModified).toLocaleDateString('pl-PL')}
          </span>
        )}
      </div>

      {/* Kolumny */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {board.columns.map((col, i) => {
          const pending = col.tasks.filter(t => !t.done)
          if (pending.length === 0 && col.tasks.filter(t => t.done).length > 0 && col.emoji === '✅') {
            // Kolumna "Gotowe" - pokaż tylko skróconą formę
            return (
              <div key={i} className={`rounded-lg border px-4 py-2 ${getColumnStyle(col.emoji)}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-400">{col.title}</span>
                  <span className="text-xs text-slate-600">({col.tasks.length} ukończonych)</span>
                </div>
              </div>
            )
          }

          return (
            <div key={i} className={`rounded-lg border ${getColumnStyle(col.emoji)}`}>
              <div className="px-3 py-2 border-b border-slate-700/30 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">{col.title}</span>
                <span className="text-xs text-slate-500">
                  {col.tasks.filter(t => !t.done).length} / {col.tasks.length}
                </span>
              </div>
              <div className="p-2 space-y-1">
                {col.tasks.filter(t => !t.done).slice(0, 15).map((task, j) => (
                  <div key={j} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-slate-800/40 group">
                    <div className="w-3.5 h-3.5 rounded border border-slate-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 leading-relaxed">{task.text}</p>
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.tags.map((tag, k) => (
                            <span key={k} className="text-xs text-slate-500">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {col.tasks.filter(t => !t.done).length > 15 && (
                  <p className="text-xs text-slate-600 px-2 py-1">
                    +{col.tasks.filter(t => !t.done).length - 15} więcej...
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
