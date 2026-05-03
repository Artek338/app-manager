import { useState, useEffect, useCallback } from 'react'
import type { ProjectSummary } from '../types'
import { api } from '../api/client'

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      const data = await api.getProjects()
      setProjects(data.projects)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd połączenia')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 5000)
    return () => clearInterval(interval)
  }, [fetch])

  return { projects, loading, error, refresh: fetch }
}
