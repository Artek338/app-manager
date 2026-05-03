import fs from 'fs'
import path from 'path'

export interface TechStack {
  frontend: string | null
  backend: string | null
  database: string | null
  language: 'typescript' | 'python' | 'javascript' | 'mixed' | 'unknown'
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'unknown'
}

export interface ProjectMetadata {
  name: string | null
  description: string | null
  stack: TechStack
  status: 'active' | 'inactive' | 'archived' | 'unknown'
}

const BOILERPLATE_PHRASES = [
  'czytaj ten plik', 'read this file', 'zawsze przed', 'always before',
  'instrukcje dla', 'jeśli czegoś nie wiesz', 'nigdy nie używaj',
  'spawn subagent', 'subagent', 'na początku każdej sesji',
  'przed odpowiedzią', 'po każdej sesji', 'nie pytaj użytkownika',
  'pick the cheapest model', 'if a subagent',
  'this file provides guidance', 'when working with code in this',
  'provides context for', 'provides guidance to',
]

export function extractProjectMetadata(projectPath: string): ProjectMetadata {
  const stack = detectStack(projectPath)
  const name = extractName(projectPath)
  const description = extractDescription(projectPath)
  const status = detectStatus(projectPath)

  return { name, description, stack, status }
}

function detectStack(projectPath: string): TechStack {
  const stack: TechStack = {
    frontend: null, backend: null, database: null,
    language: 'unknown', packageManager: 'unknown',
  }

  // Szukaj package.json w root lub podfolderach (max 2 poziomy)
  const pkgPaths = [
    path.join(projectPath, 'package.json'),
    ...findFilesUpTo(projectPath, 'package.json', 2),
  ]

  for (const pkgPath of pkgPaths) {
    if (!fs.existsSync(pkgPath)) continue
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }

      if (stack.language === 'unknown') stack.language = 'typescript'
      if (pkg.packageManager?.startsWith('pnpm')) stack.packageManager = 'pnpm'
      else if (pkg.packageManager?.startsWith('yarn')) stack.packageManager = 'yarn'
      else stack.packageManager = 'npm'

      if (deps['astro']) stack.frontend = 'Astro SSR'
      else if (deps['react'] && deps['vite']) stack.frontend = 'React + Vite'
      else if (deps['react']) stack.frontend = 'React'
      else if (deps['vue']) stack.frontend = 'Vue'

      if (deps['hono']) stack.backend = 'Hono.js'
      else if (deps['express']) stack.backend = 'Express'
      else if (deps['fastify']) stack.backend = 'Fastify'

      if (deps['drizzle-orm']) stack.database = 'PostgreSQL (Drizzle)'
      else if (deps['@prisma/client']) stack.database = 'PostgreSQL (Prisma)'
      else if (deps['firebase'] || deps['firebase-admin']) stack.database = 'Firebase'
      else if (deps['pg'] || deps['postgres']) stack.database = 'PostgreSQL'
      break
    } catch {}
  }

  // Szukaj pyproject.toml
  const pyPath = path.join(projectPath, 'pyproject.toml')
  if (fs.existsSync(pyPath)) {
    stack.language = stack.language === 'unknown' ? 'python' : 'mixed'
    stack.packageManager = 'poetry'
    const content = fs.readFileSync(pyPath, 'utf-8')
    if (content.includes('fastapi')) stack.backend = 'FastAPI'
    else if (content.includes('pydantic')) stack.backend = 'Python CLI'
    else if (content.includes('anthropic') || content.includes('langchain')) stack.backend = 'Python AI CLI'
  }

  const reqPath = path.join(projectPath, 'requirements.txt')
  if (fs.existsSync(reqPath) && stack.language === 'unknown') {
    stack.language = 'python'
    stack.packageManager = 'pip'
  }

  // Sprawdź tabelę stacku w CLAUDE.md
  const claudeMd = readFirstExisting(projectPath, ['CLAUDE.md'])
  if (claudeMd) {
    const tableStack = parseStackTable(claudeMd)
    if (tableStack.frontend) stack.frontend = tableStack.frontend
    if (tableStack.backend) stack.backend = tableStack.backend
    if (tableStack.database) stack.database = tableStack.database
  }

  return stack
}

function parseStackTable(content: string): Partial<TechStack> {
  const result: Partial<TechStack> = {}
  const tableMatch = content.match(/\|\s*Warstwa\s*\|\s*Technologia\s*\|([\s\S]+?)(?:\n\n|\n##|$)/)
  if (!tableMatch) return result

  const rows = tableMatch[1].split('\n').filter(l => l.includes('|') && !l.includes('---'))
  for (const row of rows) {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean)
    if (cells.length < 2) continue
    const [layer, tech] = cells
    const l = layer.toLowerCase()
    if (l.includes('frontend') || l.includes('front')) result.frontend = tech
    else if (l.includes('backend') || l.includes('api') || l.includes('back')) result.backend = tech
    else if (l.includes('db') || l.includes('baza') || l.includes('database')) result.database = tech
  }
  return result
}

function extractName(projectPath: string): string | null {
  const claudeMd = readFirstExisting(projectPath, ['CLAUDE.md', 'AGENTS.md'])
  if (claudeMd) {
    const match = claudeMd.match(/^# CLAUDE\.md\s*[—\-–]\s*(.+)$/m)
    if (match) return match[1].trim()
    const h1 = claudeMd.match(/^# (.+)$/m)
    if (h1 && !isBoilerplate(h1[1])) return h1[1].replace(/^CLAUDE\.md\s*/i, '').trim()
  }
  return null
}

const OVERVIEW_HEADINGS = ['przegląd', 'overview', 'opis projektu', 'about', 'co to jest', 'projekt']

function extractDescription(projectPath: string): string | null {
  for (const file of ['CLAUDE.md', 'AGENTS.md', 'README.md']) {
    const content = readFirstExisting(projectPath, [file])
    if (!content) continue

    // Próba 1: tekst między H1 a pierwszym H2
    const desc = findDescBetweenH1AndH2(content)
    if (desc) return desc

    // Próba 2: tekst po sekcji "Przegląd" / "Overview" / "Opis"
    const overview = findDescInOverviewSection(content)
    if (overview) return overview
  }
  return null
}

function findDescBetweenH1AndH2(content: string): string | null {
  const lines = content.split('\n')
  let foundH1 = false
  for (const line of lines) {
    if (line.startsWith('# ')) { foundH1 = true; continue }
    if (!foundH1) continue
    if (line.startsWith('## ')) break
    if (!line.trim() || line.startsWith('|') || line.startsWith('>') || line.startsWith('-')) continue
    if (/^\d+\./.test(line)) continue
    if (isBoilerplate(line)) continue
    const clean = line.replace(/\*\*/g, '').replace(/`/g, '').trim()
    const sentence = clean.split(/[.!?]/)[0].trim()
    if (sentence.length > 20) return sentence
  }
  return null
}

function findDescInOverviewSection(content: string): string | null {
  const lines = content.split('\n')
  let inOverview = false
  for (const line of lines) {
    if (line.startsWith('## ')) {
      const heading = line.replace(/^##\s*/, '').toLowerCase()
      inOverview = OVERVIEW_HEADINGS.some(h => heading.includes(h))
      continue
    }
    if (!inOverview) continue
    if (line.startsWith('#')) { inOverview = false; continue }
    if (!line.trim() || line.startsWith('|') || line.startsWith('>') || line.startsWith('-')) continue
    if (/^\d+\./.test(line)) continue
    if (isBoilerplate(line)) continue
    const clean = line.replace(/\*\*/g, '').replace(/`/g, '').trim()
    const sentence = clean.split(/[.!?]/)[0].trim()
    if (sentence.length > 20) return sentence
  }
  return null
}

function detectStatus(projectPath: string): 'active' | 'inactive' | 'archived' | 'unknown' {
  const candidates = ['package.json', 'pyproject.toml', 'CLAUDE.md', 'requirements.txt']
  for (const file of candidates) {
    const fullPath = path.join(projectPath, file)
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath)
      const ageDays = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24)
      if (ageDays < 7) return 'active'
      if (ageDays < 90) return 'inactive'
      return 'archived'
    }
  }
  return 'unknown'
}

function readFirstExisting(projectPath: string, filenames: string[]): string | null {
  for (const name of filenames) {
    const full = path.join(projectPath, name)
    if (fs.existsSync(full)) {
      try { return fs.readFileSync(full, 'utf-8') } catch {}
    }
  }
  return null
}

function isBoilerplate(text: string): boolean {
  const lower = text.toLowerCase()
  return BOILERPLATE_PHRASES.some(p => lower.includes(p))
}

function findFilesUpTo(dir: string, filename: string, maxDepth: number): string[] {
  const results: string[] = []
  if (maxDepth <= 0) return results
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (['node_modules', '.git', 'dist', 'build', '.obsidian'].includes(entry.name)) continue
      const subPath = path.join(dir, entry.name, filename)
      if (fs.existsSync(subPath)) results.push(subPath)
      results.push(...findFilesUpTo(path.join(dir, entry.name), filename, maxDepth - 1))
    }
  } catch {}
  return results
}
