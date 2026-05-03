export type ProjectType =
  | 'node-vite' | 'node-express' | 'node-fullstack' | 'node-monorepo'
  | 'python-cli' | 'python-fastapi' | 'docker' | 'static' | 'unknown'

export type ProcessStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'error'
export type ProjectStatus = 'active' | 'inactive' | 'archived' | 'unknown'

export interface TechStack {
  frontend: string | null
  backend: string | null
  database: string | null
  language: string
  packageManager: string
}

export interface ProjectSummary {
  id: string
  displayName: string
  path: string
  type: ProjectType
  status: ProjectStatus
  processStatus: ProcessStatus
  ports: number[]
  pinned: boolean
  tags: string[]
  color: string | null
  hasKanban: boolean
  stack: TechStack
  description: string | null
  name: string | null
  lastStarted: string | null
  startCommand: string | null
}

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

export interface LogLine {
  timestamp: string
  projectId: string
  source: 'stdout' | 'stderr'
  text: string
  level: 'info' | 'warn' | 'error' | 'debug'
}

export interface ProjectConfig {
  id: string
  displayName: string
  path: string
  startCommand: string | null
  startCwd: string | null
  stopSignal: string
  knownPorts: number[]
  kanbanPath: string | null
  pinned: boolean
  tags: string[]
  color: string | null
  lastStarted: string | null
  totalRuns: number
  hidden: boolean
  overrideAutoDetect: boolean
}
