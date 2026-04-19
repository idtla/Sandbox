import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteEpisode, fetchEpisodes, getApiKey } from '../api/client'
import { dayKeyLocal, formatDuration } from '../lib/time'
import type { SleepEpisode } from '../types/episode'

type DayAgg = {
  day: string
  totalSleepMs: number
  naps: number
  sumTimeToSleepMs: number
  countTimeToSleep: number
}

function aggregateByDay(episodes: SleepEpisode[]): DayAgg[] {
  const map = new Map<string, DayAgg>()
  for (const ep of episodes) {
    if (ep.cancelled || ep.asleep_at == null || ep.wake_at == null) continue
    const day = dayKeyLocal(ep.try_start_at)
    const sleepDur = ep.wake_at - ep.asleep_at
    const tts = ep.asleep_at - ep.try_start_at
    if (!map.has(day)) {
      map.set(day, {
        day,
        totalSleepMs: 0,
        naps: 0,
        sumTimeToSleepMs: 0,
        countTimeToSleep: 0,
      })
    }
    const agg = map.get(day)!
    agg.totalSleepMs += sleepDur
    agg.naps += 1
    if (tts >= 0) {
      agg.sumTimeToSleepMs += tts
      agg.countTimeToSleep += 1
    }
  }
  return [...map.values()].sort((a, b) => (a.day < b.day ? 1 : -1))
}

export function AnalyticsPage() {
  const [items, setItems] = useState<SleepEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!getApiKey()) {
      setError('Configura la clave API en Ajustes.')
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const eps = await fetchEpisodes()
      setItems(eps)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const byDay = useMemo(() => aggregateByDay(items), [items])

  const remove = async (id: string) => {
    if (!window.confirm('¿Borrar este episodio?')) return
    try {
      await deleteEpisode(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al borrar')
    }
  }

  return (
    <div className="page analytics">
      <header className="page-header">
        <h1>Analíticas</h1>
        <p className="page-sub">Resumen por día y lista reciente</p>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => void load()}>
          Actualizar
        </button>
      </header>

      {error ? (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="muted">Cargando…</p> : null}

      {!loading && byDay.length === 0 && !error ? (
        <p className="muted">Aún no hay episodios completados.</p>
      ) : null}

      <section className="stack">
        {byDay.map((d) => (
          <article key={d.day} className="card card--compact">
            <h2 className="card-title">{d.day}</h2>
            <ul className="stats">
              <li>
                <span className="stats-label">Sueño total</span>
                <span className="stats-value">{formatDuration(d.totalSleepMs)}</span>
              </li>
              <li>
                <span className="stats-label">Siestas</span>
                <span className="stats-value">{d.naps}</span>
              </li>
              <li>
                <span className="stats-label">Media hasta dormir</span>
                <span className="stats-value">
                  {d.countTimeToSleep > 0
                    ? formatDuration(d.sumTimeToSleepMs / d.countTimeToSleep)
                    : '—'}
                </span>
              </li>
            </ul>
          </article>
        ))}
      </section>

      <section className="card">
        <h2 className="card-title">Episodios</h2>
        <ul className="episode-list">
          {items.map((ep) => (
            <li key={ep.id} className="episode-item">
              <div className="episode-main">
                <div className="episode-line">
                  <strong>{new Date(ep.try_start_at).toLocaleString()}</strong>
                  <span className="pill pill--muted">{ep.location}</span>
                  <span className="pill">{ep.source}</span>
                </div>
                {ep.cancelled ? (
                  <div className="muted">Cancelado</div>
                ) : ep.asleep_at != null && ep.wake_at != null ? (
                  <div className="episode-metrics">
                    <span>Intento: {formatDuration(ep.asleep_at - ep.try_start_at)}</span>
                    <span> · Sueño: {formatDuration(ep.wake_at - ep.asleep_at)}</span>
                  </div>
                ) : (
                  <div className="muted">Incompleto</div>
                )}
              </div>
              <button type="button" className="btn btn-danger btn-small" onClick={() => void remove(ep.id)}>
                Borrar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
