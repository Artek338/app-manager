import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json')

export interface ProjectConfig {
  id: string
  displayName: string
  path: string
  startCommand: string | null
  startCwd: string | null
  stopSignal: 'taskkill' | 'SIGTERM' | 'SIGKILL'
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

export interface AppConfig {
  version: 1
  projectsRoot: string
  appPort: number
  projects: Record<string, ProjectConfig>
  lastScan: string
}

const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  projectsRoot: 'C:\\Users\\artur\\Desktop\\Projekty',
  appPort: 3333,
  projects: {},
  lastScan: new Date().toISOString(),
}

export function loadConfig(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      saveConfig(DEFAULT_CONFIG)
      return DEFAULT_CONFIG
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(config: AppConfig): void {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export function getProjectConfig(id: string): ProjectConfig | null {
  const config = loadConfig()
  return config.projects[id] ?? null
}

export function upsertProjectConfig(id: string, patch: Partial<ProjectConfig>): ProjectConfig {
  const config = loadConfig()
  const existing = config.projects[id] ?? { id, displayName: id, path: '', startCommand: null, startCwd: null, stopSignal: 'taskkill', knownPorts: [], kanbanPath: null, pinned: false, tags: [], color: null, lastStarted: null, totalRuns: 0, hidden: false, overrideAutoDetect: false }
  config.projects[id] = { ...existing, ...patch, id }
  saveConfig(config)
  return config.projects[id]
}
