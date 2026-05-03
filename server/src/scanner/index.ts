import fs from 'fs'
import path from 'path'
import { AppConfig, ProjectConfig } from '../config'
import { detectProject, isProject, DetectionResult } from './detector'
import { extractProjectMetadata, ProjectMetadata } from './claude-parser'

export interface ScannedProject {
  id: string
  displayName: string
  projectPath: string
  detection: DetectionResult
  metadata: ProjectMetadata
  config: ProjectConfig
}

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.obsidian', '__pycache__',
  'Stare', 'Dane', '.claude', 'venv', '.venv', 'env', 'app-manager',
])

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function scanProjects(rootDir: string, existingConfig: AppConfig): Promise<ScannedProject[]> {
  const results: ScannedProject[] = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true })
  } catch {
    return []
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (EXCLUDED_DIRS.has(entry.name)) continue

    const projectPath = path.join(rootDir, entry.name)

    if (!isProject(projectPath)) continue

    const id = slugify(entry.name)
    const detection = detectProject(projectPath)
    const metadata = extractProjectMetadata(projectPath)

    const savedConfig = existingConfig.projects[id]
    const config: ProjectConfig = savedConfig ?? buildDefaultConfig(id, entry.name, projectPath, detection)

    // Jeśli nie ma override — aktualizuj auto-wykryte dane
    if (!config.overrideAutoDetect) {
      config.startCommand = config.startCommand ?? detection.startCommand
      config.startCwd = config.startCwd ?? (detection.startCwd !== projectPath ? path.relative(projectPath, detection.startCwd) : null)
      config.kanbanPath = config.kanbanPath ?? (detection.kanbanPath ? path.relative(projectPath, detection.kanbanPath) : null)
    }

    results.push({ id, displayName: config.displayName, projectPath, detection, metadata, config })
  }

  // Disambiguuj duplikaty displayName
  const nameCount = new Map<string, number>()
  for (const p of results) nameCount.set(p.displayName, (nameCount.get(p.displayName) ?? 0) + 1)
  for (const p of results) {
    if ((nameCount.get(p.displayName) ?? 0) > 1) {
      const folder = path.basename(p.projectPath)
      p.displayName = `${p.displayName} (${folder})`
      p.config.displayName = p.displayName
    }
  }

  return results.sort((a, b) => {
    if (a.config.pinned && !b.config.pinned) return -1
    if (!a.config.pinned && b.config.pinned) return 1
    return a.displayName.localeCompare(b.displayName)
  })
}

function buildDefaultConfig(id: string, folderName: string, projectPath: string, detection: DetectionResult): ProjectConfig {
  return {
    id,
    displayName: formatDisplayName(folderName),
    path: projectPath,
    startCommand: detection.startCommand,
    startCwd: detection.startCwd !== projectPath ? path.relative(projectPath, detection.startCwd) : null,
    stopSignal: 'taskkill',
    knownPorts: detection.expectedPorts,
    kanbanPath: detection.kanbanPath ? path.relative(projectPath, detection.kanbanPath) : null,
    pinned: false,
    tags: [],
    color: null,
    lastStarted: null,
    totalRuns: 0,
    hidden: false,
    overrideAutoDetect: false,
  }
}

function formatDisplayName(folderName: string): string {
  return folderName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
