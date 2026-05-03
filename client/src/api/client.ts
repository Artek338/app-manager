import type { ProjectSummary, KanbanBoard, LogLine, ProjectConfig } from '../types'

const BASE = '/api'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  getProjects: () => apiFetch<{ projects: ProjectSummary[]; scannedAt: string }>('/projects'),

  startProject: (id: string) =>
    apiFetch<{ projectId: string; status: string; pid: number | null }>(`/projects/${id}/start`, { method: 'POST', body: '{}' }),

  stopProject: (id: string) =>
    apiFetch<{ projectId: string; status: string }>(`/projects/${id}/stop`, { method: 'POST', body: '{}' }),

  getKanban: (id: string) =>
    apiFetch<{ board: KanbanBoard | null; filePath: string | null; lastModified: string | null }>(`/projects/${id}/kanban`),

  getLogs: (id: string, limit = 100) =>
    apiFetch<{ projectId: string; lines: LogLine[]; hasMore: boolean }>(`/projects/${id}/logs?limit=${limit}`),

  getConfig: (id: string) => apiFetch<ProjectConfig>(`/projects/${id}/config`),

  updateConfig: (id: string, patch: Partial<ProjectConfig>) =>
    apiFetch<ProjectConfig>(`/projects/${id}/config`, { method: 'PUT', body: JSON.stringify(patch) }),

  scan: () => apiFetch<{ projectsFound: number; scannedAt: string }>('/projects/scan', { method: 'POST', body: '{}' }),

  health: () => apiFetch<{ status: string; uptime: number; runningProcesses: number }>('/health'),
}
