import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import { EventEmitter } from 'events'
import { ProjectConfig } from '../config'
import { logStreamer } from './log-streamer'
import { extractPortFromLog, detectPortsViaNetstat } from './port-detector'

export type ProcessStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'error'

export interface ManagedProcess {
  projectId: string
  pid: number | null
  status: ProcessStatus
  startedAt: string | null
  ports: number[]
  exitCode: number | null
}

interface InternalProcess extends ManagedProcess {
  child: ChildProcess | null
  netstatTimer: ReturnType<typeof setTimeout> | null
}

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, InternalProcess>()

  async start(projectId: string, config: ProjectConfig): Promise<ManagedProcess> {
    const existing = this.processes.get(projectId)
    if (existing && (existing.status === 'running' || existing.status === 'starting')) {
      return this.toPublic(existing)
    }

    const startCommand = config.startCommand
    if (!startCommand) throw new Error('Brak komendy startowej dla projektu')

    const cwd = config.startCwd
      ? path.join(config.path, config.startCwd)
      : config.path

    logStreamer.clear(projectId)

    const [cmd, ...args] = startCommand.split(' ')
    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      windowsHide: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    })

    const proc: InternalProcess = {
      projectId,
      pid: child.pid ?? null,
      status: 'starting',
      startedAt: new Date().toISOString(),
      ports: [...(config.knownPorts ?? [])],
      exitCode: null,
      child,
      netstatTimer: null,
    }
    this.processes.set(projectId, proc)
    this.emitStatus(proc)

    child.stdout?.setEncoding('utf-8')
    child.stderr?.setEncoding('utf-8')

    child.stdout?.on('data', (data: string) => {
      for (const line of data.split('\n').filter(Boolean)) {
        logStreamer.append(projectId, line, 'stdout')
        const port = extractPortFromLog(line)
        if (port && !proc.ports.includes(port)) {
          proc.ports.push(port)
          if (proc.status === 'starting') {
            proc.status = 'running'
            this.emitStatus(proc)
          }
        }
        if (proc.status === 'starting') {
          proc.status = 'running'
          this.emitStatus(proc)
        }
      }
    })

    child.stderr?.on('data', (data: string) => {
      for (const line of data.split('\n').filter(Boolean)) {
        logStreamer.append(projectId, line, 'stderr')
        const port = extractPortFromLog(line)
        if (port && !proc.ports.includes(port)) {
          proc.ports.push(port)
        }
      }
    })

    child.on('error', (err) => {
      logStreamer.append(projectId, `Błąd uruchomienia: ${err.message}`, 'stderr')
      proc.status = 'error'
      proc.child = null
      this.emitStatus(proc)
    })

    child.on('close', (code) => {
      proc.status = code === 0 ? 'stopped' : 'error'
      proc.exitCode = code
      proc.child = null
      proc.ports = []
      if (proc.netstatTimer) clearTimeout(proc.netstatTimer)
      logStreamer.append(projectId, `Proces zakończony (kod: ${code})`, 'stdout')
      this.emitStatus(proc)
    })

    // Fallback: netstat po 3 sekundach
    proc.netstatTimer = setTimeout(async () => {
      if (proc.pid && proc.ports.length === 0) {
        const ports = await detectPortsViaNetstat(proc.pid)
        if (ports.length > 0) {
          proc.ports = ports
          proc.status = 'running'
          this.emitStatus(proc)
        }
      }
    }, 3000)

    return this.toPublic(proc)
  }

  stop(projectId: string): void {
    const proc = this.processes.get(projectId)
    if (!proc || !proc.child) return

    proc.status = 'stopping'
    this.emitStatus(proc)

    if (proc.pid) {
      try {
        execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' })
      } catch {
        proc.child.kill('SIGTERM')
      }
    }
  }

  getStatus(projectId: string): ManagedProcess | null {
    const proc = this.processes.get(projectId)
    return proc ? this.toPublic(proc) : null
  }

  getAllStatuses(): ManagedProcess[] {
    return Array.from(this.processes.values()).map(p => this.toPublic(p))
  }

  private toPublic(proc: InternalProcess): ManagedProcess {
    return {
      projectId: proc.projectId,
      pid: proc.pid,
      status: proc.status,
      startedAt: proc.startedAt,
      ports: proc.ports,
      exitCode: proc.exitCode,
    }
  }

  private emitStatus(proc: InternalProcess): void {
    this.emit('status', { projectId: proc.projectId, status: proc.status, ports: proc.ports })
  }
}

export const processManager = new ProcessManager()
