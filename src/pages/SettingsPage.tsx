import { useEffect, useState } from 'react'
import {
  createEpisode,
  deleteAllEpisodes,
  fetchEpisodes,
  getApiKey,
  setApiKey as persistApiKey,
} from '../api/client'
import type { SleepEpisode } from '../types/episode'

export function SettingsPage() {
  const [key, setKey] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setKey(getApiKey() ?? '')
  }, [])

  const saveKey = () => {
    persistApiKey(key.trim())
    setMsg('Clave guardada en este dispositivo.')
    setErr(null)
  }

  const exportJson = async () => {
    setErr(null)
    setMsg(null)
    try {
      const episodes = await fetchEpisodes()
      const blob = new Blob([JSON.stringify({ episodes }, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sueno-bebe-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMsg('Exportación descargada.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al exportar')
    }
  }

  const importJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = async () => {
      setErr(null)
      setMsg(null)
      try {
        const text = String(reader.result)
        const data = JSON.parse(text) as { episodes?: SleepEpisode[] }
        const list = data.episodes
        if (!Array.isArray(list)) throw new Error('Formato inválido: falta episodes[]')
        for (const ep of list) {
          await createEpisode({
            id: ep.id,
            created_at: ep.created_at,
            try_start_at: ep.try_start_at,
            asleep_at: ep.asleep_at,
            wake_at: ep.wake_at,
            location: ep.location,
            source: ep.source,
            cancelled: Boolean(ep.cancelled),
          })
        }
        setMsg(`Importados ${list.length} episodios (INSERT OR REPLACE).`)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error al importar')
      }
    }
    reader.readAsText(file)
  }

  const clearAll = async () => {
    if (!window.confirm('¿Borrar todos los episodios en el servidor? No se puede deshacer.')) return
    setErr(null)
    setMsg(null)
    try {
      await deleteAllEpisodes()
      setMsg('Todos los episodios han sido borrados.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al borrar')
    }
  }

  return (
    <div className="page settings">
      <header className="page-header">
        <h1>Ajustes</h1>
        <p className="page-sub">Clave API (mismo valor que API_SECRET en Cloudflare)</p>
      </header>

      {msg ? (
        <div className="banner banner--ok" role="status">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="banner banner--error" role="alert">
          {err}
        </div>
      ) : null}

      <section className="card">
        <label className="field">
          <span>Clave API</span>
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Pega el secreto"
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={saveKey}>
          Guardar clave
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">Copia de seguridad</h2>
        <p className="muted">
          Exporta un JSON con todos los episodios o importa uno generado antes (usa la misma clave API).
        </p>
        <div className="actions actions--row">
          <button type="button" className="btn btn-secondary" onClick={() => void exportJson()}>
            Exportar JSON
          </button>
          <label className="btn btn-secondary file-btn">
            Importar JSON
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importJson(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Peligro</h2>
        <button type="button" className="btn btn-danger" onClick={() => void clearAll()}>
          Borrar todos los episodios
        </button>
      </section>
    </div>
  )
}
