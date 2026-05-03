import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const PORT_PATTERNS = [
  /Local:\s+https?:\/\/[^:]+:(\d{4,5})/i,
  /listening on.*?:(\d{4,5})/i,
  /server.*?running.*?:(\d{4,5})/i,
  /started.*?on.*?:(\d{4,5})/i,
  /localhost:(\d{4,5})/i,
  /0\.0\.0\.0:(\d{4,5})/i,
  /127\.0\.0\.1:(\d{4,5})/i,
  /https?:\/\/[^:]+:(\d{4,5})/i,
  /port\s+(\d{4,5})/i,
  /:\s*(\d{4,5})\s*$/,
]

export function extractPortFromLog(line: string): number | null {
  for (const pattern of PORT_PATTERNS) {
    const match = line.match(pattern)
    if (match) {
      const port = parseInt(match[1])
      if (port > 1024 && port < 65535) return port
    }
  }
  return null
}

export async function detectPortsViaNetstat(pid: number): Promise<number[]> {
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq ${pid} } | Select-Object -ExpandProperty LocalPort"`,
      { timeout: 5000 }
    )
    return stdout.trim().split('\n')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 1024 && n < 65535)
  } catch {
    return []
  }
}
