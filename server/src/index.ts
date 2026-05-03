import http from 'http'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { loadConfig } from './config'
import { projectsRouter } from './api/projects'
import { setupWebSocket } from './ws/log-handler'
import { processManager } from './process/manager'

const app = express()
const config = loadConfig()
const PORT = config.appPort

app.use(cors({ origin: `http://localhost:5173` }))
app.use(express.json())

// API routes
app.use('/api/projects', projectsRouter())

// POST /api/scan — osobna ścieżka żeby nie kolidowała z :id
app.post('/api/scan', async (req, res) => {
  res.redirect(307, '/api/projects/scan')
})

// GET /api/health
app.get('/api/health', (req, res) => {
  const running = processManager.getAllStatuses().filter(p => p.status === 'running' || p.status === 'starting')
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    projectsRoot: config.projectsRoot,
    runningProcesses: running.length,
  })
})

// Serwuj build frontendu w trybie produkcyjnym
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist')
app.use(express.static(clientDist))
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

const server = http.createServer(app)
setupWebSocket(server)

server.listen(PORT, () => {
  console.log(`App Manager serwer działa na http://localhost:${PORT}`)
  console.log(`Skanowanie projektów w: ${config.projectsRoot}`)
})

process.on('SIGTERM', () => {
  console.log('Zamykanie serwera...')
  const statuses = processManager.getAllStatuses()
  for (const s of statuses) {
    if (s.status === 'running') processManager.stop(s.projectId)
  }
  server.close(() => process.exit(0))
})
