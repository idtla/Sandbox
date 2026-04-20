import { useEffect, useState } from 'react'
import {
  createEpisode,
  deleteAllEpisodes,
  fetchEpisodes,
  getApiKey,
  getDefaultRecordedBy,
  setApiKey as persistApiKey,
  setDefaultRecordedBy,
} from '../api/client'
import type { SleepEpisode } from '../types/episode'

export function SettingsPage() {
  const [key, setKey] = useState('')
  const [parent, setParent] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setKey(getApiKey() ?? '')
    setParent(getDefaultRecordedBy())
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
            recorded_by: ep.recorded_by ?? null,
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

  const saveParent = () => {
    setDefaultRecordedBy(parent)
    setMsg('Nombre por defecto guardado en este dispositivo.')
    setErr(null)
  }

  return (
    <div className="page settings">
      <header className="measure-header">
        <h1 className="measure-title">Ajustes</h1>
        <p className="measure-tagline">Clave API y preferencias</p>
      </header>

      {msg ? (
        <div className="banner banner--ok measure-banner" role="status">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="banner banner--error measure-banner" role="alert">
          {err}
        </div>
      ) : null}

      <section className="measure-panel">
        <label className="measure-field">
          <span className="measure-field__label">Clave API</span>
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Mismo valor que API_SECRET en Cloudflare"
          />
        </label>
        <button type="button" className="btn-pill btn-pill--primary" onClick={saveKey}>
          Guardar clave
        </button>
      </section>

      <section className="measure-panel">
        <label className="measure-field">
          <span className="measure-field__label">Padre / cuidador por defecto</span>
          <input
            type="text"
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            placeholder="Se rellena en Medir automáticamente"
            maxLength={120}
          />
        </label>
        <button type="button" className="btn-pill btn-pill--secondary" onClick={saveParent}>
          Guardar nombre
        </button>
      </section>

      <section className="measure-panel">
        <h2 className="measure-panel__label">Copia de seguridad</h2>
        <p className="measure-hint">
          Exporta o importa JSON (misma clave API). Incluye quién registró si estaba guardado.
        </p>
        <div className="measure-actions measure-actions--row">
          <button type="button" className="btn-pill btn-pill--outline" onClick={() => void exportJson()}>
            Exportar JSON
          </button>
          <label className="btn-pill btn-pill--outline file-btn">
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

      <section className="measure-panel measure-panel--danger">
        <h2 className="measure-panel__label">Zona sensible</h2>
        <button type="button" className="btn-pill btn-pill--danger" onClick={() => void clearAll()}>
          Borrar todos los episodios
        </button>
      </section>
    </div>
  )
}
