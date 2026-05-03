import { useState, useEffect } from 'react'
import type { ProjectConfig } from '../../types'
import { api } from '../../api/client'

interface Props { projectId: string; onSaved?: () => void }

export function SettingsTab({ projectId, onSaved }: Props) {
  const [config, setConfig] = useState<ProjectConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.getConfig(projectId).then(setConfig).finally(() => setLoading(false))
  }, [projectId])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      await api.updateConfig(projectId, config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Błąd zapisu')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !config) return <div className="p-4 text-slate-500 text-sm">Ładowanie ustawień...</div>

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <Field label="Nazwa wyświetlana">
        <input
          type="text"
          value={config.displayName}
          onChange={e => setConfig({ ...config, displayName: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        />
      </Field>

      <Field label="Komenda startowa">
        <input
          type="text"
          value={config.startCommand ?? ''}
          placeholder="npm run dev"
          onChange={e => setConfig({ ...config, startCommand: e.target.value || null })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        />
      </Field>

      <Field label="CWD (podfolder)">
        <input
          type="text"
          value={config.startCwd ?? ''}
          placeholder="wrzutka (względem root projektu)"
          onChange={e => setConfig({ ...config, startCwd: e.target.value || null })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        />
      </Field>

      <Field label="Ścieżka do kanban.md">
        <input
          type="text"
          value={config.kanbanPath ?? ''}
          placeholder="docs/kanban.md"
          onChange={e => setConfig({ ...config, kanbanPath: e.target.value || null })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        />
      </Field>

      <Field label="Tagi (oddzielone przecinkami)">
        <input
          type="text"
          value={config.tags.join(', ')}
          placeholder="active, client, priority"
          onChange={e => setConfig({ ...config, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        />
      </Field>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.pinned}
            onChange={e => setConfig({ ...config, pinned: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-slate-300">Przypnij na górze</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.hidden}
            onChange={e => setConfig({ ...config, hidden: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-slate-300">Ukryj projekt</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.overrideAutoDetect}
            onChange={e => setConfig({ ...config, overrideAutoDetect: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-slate-300">Blokuj auto-detekcję</span>
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {saving ? 'Zapisuję...' : saved ? '✓ Zapisano' : 'Zapisz'}
        </button>
        <span className="text-xs text-slate-500">Uruchomień: {config.totalRuns}</span>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}
