import fs from 'fs'
import path from 'path'

export type ProjectType =
  | 'node-vite'
  | 'node-express'
  | 'node-fullstack'
  | 'node-monorepo'
  | 'python-cli'
  | 'python-fastapi'
  | 'docker'
  | 'static'
  | 'unknown'

export interface DetectionResult {
  type: ProjectType
  startCommand: string | null
  startCwd: string
  expectedPorts: number[]
  kanbanPath: string | null
  claudeMdPath: string | null
}

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.obsidian', '__pycache__',
  'Stare', 'Dane', '.claude', 'venv', '.venv', 'env',
])

export function isProject(dirPath: string): boolean {
  const signals = ['package.json', 'pyproject.toml', 'requirements.txt', 'docker-compose.yml', 'CLAUDE.md']
  if (signals.some(f => fs.existsSync(path.join(dirPath, f)))) return true
  // Sprawdź kanban.md w podfolderach (max 2 poziomy)
  return findKanbanPath(dirPath) !== null
}

export function detectProject(dirPath: string): DetectionResult {
  const result: DetectionResult = {
    type: 'unknown',
    startCommand: null,
    startCwd: dirPath,
    expectedPorts: [],
    kanbanPath: findKanbanPath(dirPath),
    claudeMdPath: findClaudeMdPath(dirPath),
  }

  const hasDockerCompose = fs.existsSync(path.join(dirPath, 'docker-compose.yml'))
  const hasPyproject = fs.existsSync(path.join(dirPath, 'pyproject.toml'))
  const hasRequirements = fs.existsSync(path.join(dirPath, 'requirements.txt'))

  // Szukaj package.json w root lub podfolderach
  const pkgResult = findPackageJson(dirPath)

  if (pkgResult) {
    const { pkgPath, pkg } = pkgResult
    const pkgCwd = path.dirname(pkgPath)
    result.startCwd = pkgCwd

    const devDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    const scripts = pkg.scripts ?? {}
    const hasDevScript = 'dev' in scripts
    const hasStartScript = 'start' in scripts
    const devScript = scripts.dev ?? ''
    const hasConcurrently = devScript.includes('concurrently') || devScript.includes('&&')
    const hasWorkspaces = !!pkg.workspaces

    if (hasWorkspaces) {
      result.type = 'node-monorepo'
      result.startCommand = hasDevScript ? 'npm run dev' : null
    } else if (hasConcurrently) {
      result.type = 'node-fullstack'
      result.startCommand = 'npm run dev'
      result.expectedPorts = extractPortsFromScript(devScript)
    } else if (devDeps['astro']) {
      result.type = 'node-vite'
      result.startCommand = 'npm run dev'
      result.expectedPorts = [4321]
    } else if (devDeps['vite']) {
      result.type = 'node-vite'
      result.startCommand = 'npm run dev'
      result.expectedPorts = [5173]
    } else if (devDeps['express'] || devDeps['hono'] || devDeps['fastify']) {
      result.type = 'node-express'
      result.startCommand = hasDevScript ? 'npm run dev' : hasStartScript ? 'npm start' : null
      result.expectedPorts = [3000]
    } else {
      result.type = 'unknown'
      result.startCommand = hasDevScript ? 'npm run dev' : null
    }
  } else if (hasDockerCompose) {
    result.type = 'docker'
    result.startCommand = 'docker compose up'
  } else if (hasPyproject || hasRequirements) {
    result.type = 'python-cli'
    result.startCommand = null
  } else {
    result.type = 'static'
    result.startCommand = null
  }

  return result
}

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
  workspaces?: unknown
  packageManager?: string
}

function findPackageJson(dirPath: string): { pkgPath: string; pkg: PackageJson } | null {
  const rootPkg = path.join(dirPath, 'package.json')
  if (fs.existsSync(rootPkg)) {
    try {
      return { pkgPath: rootPkg, pkg: JSON.parse(fs.readFileSync(rootPkg, 'utf-8')) as PackageJson }
    } catch {}
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name)) continue
      const subPkg = path.join(dirPath, entry.name, 'package.json')
      if (fs.existsSync(subPkg)) {
        try {
          return { pkgPath: subPkg, pkg: JSON.parse(fs.readFileSync(subPkg, 'utf-8')) as PackageJson }
        } catch {}
      }
    }
  } catch {}

  return null
}

export function findKanbanPath(dirPath: string, depth = 0): string | null {
  if (depth > 3) return null
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && entry.name === 'kanban.md') {
        return path.join(dirPath, entry.name)
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name)) {
        const found = findKanbanPath(path.join(dirPath, entry.name), depth + 1)
        if (found) return found
      }
    }
  } catch {}
  return null
}

function findClaudeMdPath(dirPath: string): string | null {
  for (const name of ['CLAUDE.md', 'AGENTS.md']) {
    const full = path.join(dirPath, name)
    if (fs.existsSync(full)) return full
  }
  // Jeden poziom głębiej
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name)) continue
      for (const name of ['CLAUDE.md', 'AGENTS.md']) {
        const full = path.join(dirPath, entry.name, name)
        if (fs.existsSync(full)) return full
      }
    }
  } catch {}
  return null
}

function extractPortsFromScript(script: string): number[] {
  const matches = script.match(/\b(\d{4,5})\b/g) ?? []
  return matches.map(Number).filter(n => n > 1024 && n < 65535)
}
