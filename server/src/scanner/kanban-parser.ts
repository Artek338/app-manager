import fs from 'fs'

export interface KanbanTask {
  text: string
  done: boolean
  tags: string[]
  assignee: string | null
  raw: string
}

export interface KanbanColumn {
  title: string
  emoji: string | null
  tasks: KanbanTask[]
}

export interface KanbanBoard {
  format: 'obsidian' | 'plain'
  columns: KanbanColumn[]
  totalTasks: number
  doneTasks: number
  parsedAt: string
}

export function parseKanban(content: string): KanbanBoard {
  const isObsidian = content.startsWith('---') && content.includes('kanban-plugin: board')
  const format: 'obsidian' | 'plain' = isObsidian ? 'obsidian' : 'plain'

  let body = content
  if (isObsidian) {
    // Pomiń frontmatter (między pierwszymi --- a kolejnymi ---)
    const fmEnd = content.indexOf('---', 3)
    if (fmEnd !== -1) body = content.slice(fmEnd + 3)
    // Pomiń trailing kanban:settings block
    const settingsIdx = body.indexOf('%% kanban:settings')
    if (settingsIdx !== -1) body = body.slice(0, settingsIdx)
  }

  const lines = body.split('\n')
  const columns: KanbanColumn[] = []
  let currentCol: KanbanColumn | null = null

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/)
    if (h2Match) {
      currentCol = { title: h2Match[1].trim(), emoji: extractEmoji(h2Match[1].trim()), tasks: [] }
      columns.push(currentCol)
      continue
    }

    if (!currentCol) continue

    // Tylko zadania na poziomie 0 (nie wcięte) — ignoruj zagnieżdżone notatki
    const taskMatch = line.match(/^- \[([ xX])\] (.+)$/)
    if (taskMatch) {
      const done = taskMatch[1].toLowerCase() === 'x'
      const raw = taskMatch[2]
      currentCol.tasks.push(parseTask(raw, done))
    }
  }

  const totalTasks = columns.reduce((s, c) => s + c.tasks.length, 0)
  const doneTasks = columns.reduce((s, c) => s + c.tasks.filter(t => t.done).length, 0)

  return { format, columns, totalTasks, doneTasks, parsedAt: new Date().toISOString() }
}

export function parseKanbanFile(filePath: string): KanbanBoard | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return parseKanban(content)
  } catch {
    return null
  }
}

function parseTask(raw: string, done: boolean): KanbanTask {
  const tags = (raw.match(/#[\w-]+/g) ?? [])
  const assigneeMatch = raw.match(/@([\w]+)/)
  const assignee = assigneeMatch ? assigneeMatch[1] : null
  // Usuń bold markers i tagi z wyświetlanego tekstu
  const text = raw
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/#[\w-]+/g, '')
    .replace(/@[\w]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return { text, done, tags, assignee, raw }
}

function extractEmoji(title: string): string | null {
  const match = title.match(/^(\p{Emoji}+)/u)
  return match ? match[1] : null
}
