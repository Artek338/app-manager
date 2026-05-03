import { Router } from 'express'
import path from 'path'
import { loadConfig, saveConfig, upsertProjectConfig } from '../config'
import { scanProjects, ScannedProject } from '../scanner'
import { parseKanbanFile } from '../scanner/kanban-parser'
import { processManager } from '../process/manager'
import { logStreamer } from '../process/log-streamer'

let projectCache: ScannedProject[] = []
let lastScanTime = 0

async function getProjects(): Promise<ScannedProject[]> {
  const now = Date.now()
  if (now - lastScanTime > 30_000 || projectCache.length === 0) {
    const config = loadConfig()
    projectCache = await scanProjects(config.projectsRoot, config)
    lastScanTime = now

    // Zapisz nowe projekty do configu
    for (const p of projectCache) {
      if (!config.projects[p.id]) {
        config.projects[p.id] = p.config
      }
    }
    saveConfig({ ...config, lastScan: new Date().toISOString() })
  }
  return projectCache
}

export function projectsRouter(): Router {
  const router = Router()

  // GET /api/projects
  router.get('/', async (req, res) => {
    const projects = await getProjects()
    const result = projects
      .filter(p => !p.config.hidden)
      .map(p => {
        const proc = processManager.getStatus(p.id)
        return {
          id: p.id,
          displayName: p.config.displayName,
          path: p.projectPath,
          type: p.detection.type,
          status: p.metadata.status,
          processStatus: proc?.status ?? 'stopped',
          ports: proc?.ports ?? [],
          pinned: p.config.pinned,
          tags: p.config.tags,
          color: p.config.color,
          hasKanban: !!p.config.kanbanPath || !!p.detection.kanbanPath,
          stack: p.metadata.stack,
          description: p.metadata.description,
          name: p.metadata.name,
          lastStarted: p.config.lastStarted,
          startCommand: p.config.startCommand,
        }
      })
    res.json({ projects: result, scannedAt: new Date(lastScanTime).toISOString() })
  })

  // GET /api/projects/:id
  router.get('/:id', async (req, res) => {
    const projects = await getProjects()
    const project = projects.find(p => p.id === req.params.id)
    if (!project) return res.status(404).json({ error: 'Projekt nie znaleziony', code: 'NOT_FOUND' })

    const proc = processManager.getStatus(project.id)
    res.json({
      id: project.id,
      displayName: project.config.displayName,
      path: project.projectPath,
      type: project.detection.type,
      status: project.metadata.status,
      processStatus: proc?.status ?? 'stopped',
      ports: proc?.ports ?? [],
      stack: project.metadata.stack,
      description: project.metadata.description,
      name: project.metadata.name,
      startCommand: project.config.startCommand,
      startCwd: project.config.startCwd,
      kanbanPath: project.config.kanbanPath,
      pinned: project.config.pinned,
      tags: project.config.tags,
      color: project.config.color,
      lastStarted: project.config.lastStarted,
      totalRuns: project.config.totalRuns,
      logBufferSize: logStreamer.getRecent(project.id).length,
    })
  })

  // POST /api/projects/:id/start
  router.post('/:id/start', async (req, res) => {
    const projects = await getProjects()
    const project = projects.find(p => p.id === req.params.id)
    if (!project) return res.status(404).json({ error: 'Projekt nie znaleziony', code: 'NOT_FOUND' })

    const proc = processManager.getStatus(project.id)
    if (proc && (proc.status === 'running' || proc.status === 'starting')) {
      return res.status(409).json({ error: 'Projekt już uruchomiony', code: 'ALREADY_RUNNING' })
    }

    if (!project.config.startCommand) {
      return res.status(400).json({ error: 'Brak komendy startowej', code: 'NO_START_COMMAND' })
    }

    try {
      const result = await processManager.start(project.id, project.config)
      upsertProjectConfig(project.id, {
        lastStarted: new Date().toISOString(),
        totalRuns: (project.config.totalRuns ?? 0) + 1,
      })
      // Aktualizuj cache
      project.config.lastStarted = new Date().toISOString()
      res.json({ projectId: project.id, status: result.status, pid: result.pid })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Błąd uruchomienia'
      res.status(500).json({ error: message, code: 'START_ERROR' })
    }
  })

  // POST /api/projects/:id/stop
  router.post('/:id/stop', async (req, res) => {
    const projects = await getProjects()
    const project = projects.find(p => p.id === req.params.id)
    if (!project) return res.status(404).json({ error: 'Projekt nie znaleziony', code: 'NOT_FOUND' })

    const proc = processManager.getStatus(project.id)
    if (!proc || proc.status === 'stopped') {
      return res.status(409).json({ error: 'Projekt już zatrzymany', code: 'ALREADY_STOPPED' })
    }

    processManager.stop(project.id)
    res.json({ projectId: project.id, status: 'stopping' })
  })

  // GET /api/projects/:id/kanban
  router.get('/:id/kanban', async (req, res) => {
    const projects = await getProjects()
    const project = projects.find(p => p.id === req.params.id)
    if (!project) return res.status(404).json({ error: 'Projekt nie znaleziony', code: 'NOT_FOUND' })

    const kanbanRelPath = project.config.kanbanPath ?? project.detection.kanbanPath
    if (!kanbanRelPath) return res.json({ board: null, filePath: null, lastModified: null })

    const kanbanAbsPath = path.isAbsolute(kanbanRelPath)
      ? kanbanRelPath
      : path.join(project.projectPath, kanbanRelPath)

    const board = parseKanbanFile(kanbanAbsPath)
    const stat = board ? (() => { try { const fs = require('fs'); return fs.statSync(kanbanAbsPath) } catch { return null } })() : null

    res.json({
      board,
      filePath: kanbanAbsPath,
      lastModified: stat ? stat.mtime.toISOString() : null,
    })
  })

  // GET /api/projects/:id/logs
  router.get('/:id/logs', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500)
    const lines = logStreamer.getRecent(req.params.id, limit)
    res.json({ projectId: req.params.id, lines, hasMore: lines.length === limit })
  })

  // GET /api/projects/:id/config
  router.get('/:id/config', async (req, res) => {
    const projects = await getProjects()
    const project = projects.find(p => p.id === req.params.id)
    if (!project) return res.status(404).json({ error: 'Projekt nie znaleziony', code: 'NOT_FOUND' })
    res.json(project.config)
  })

  // PUT /api/projects/:id/config
  router.put('/:id/config', async (req, res) => {
    const projects = await getProjects()
    const project = projects.find(p => p.id === req.params.id)
    if (!project) return res.status(404).json({ error: 'Projekt nie znaleziony', code: 'NOT_FOUND' })

    const { id: _id, path: _path, ...patch } = req.body
    const updated = upsertProjectConfig(project.id, patch)
    // Unieważnij cache
    lastScanTime = 0
    res.json(updated)
  })

  // POST /api/scan
  router.post('/scan', async (req, res) => {
    lastScanTime = 0
    const projects = await getProjects()
    res.json({
      projectsFound: projects.length,
      scannedAt: new Date().toISOString(),
    })
  })

  return router
}
