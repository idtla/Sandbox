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
      <header className="analytics-hero">
        <p className="analytics-hero__eyebrow">Resumen</p>
        <h1 className="analytics-hero__title">Analíticas</h1>
        <button type="button" className="analytics-refresh" onClick={() => void load()}>
          Actualizar
        </button>
      </header>

      {error ? (
        <div className="analytics-alert analytics-alert--error" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="analytics-muted">Cargando…</p> : null}

      {!loading && byDay.length === 0 && !error ? (
        <p className="analytics-muted">Aún no hay episodios completados.</p>
      ) : null}

      <section className="analytics-days">
        {byDay.map((d) => (
          <article key={d.day} className="analytics-day-card">
            <time className="analytics-day-card__date" dateTime={d.day}>
              {d.day}
            </time>
            <ul className="analytics-stats">
              <li>
                <span className="analytics-stats__label">Sueño total</span>
                <span className="analytics-stats__value">{formatDuration(d.totalSleepMs)}</span>
              </li>
              <li>
                <span className="analytics-stats__label">Siestas</span>
                <span className="analytics-stats__value analytics-stats__value--accent">{d.naps}</span>
              </li>
              <li>
                <span className="analytics-stats__label">Media hasta dormir</span>
                <span className="analytics-stats__value">
                  {d.countTimeToSleep > 0
                    ? formatDuration(d.sumTimeToSleepMs / d.countTimeToSleep)
                    : '—'}
                </span>
              </li>
            </ul>
          </article>
        ))}
      </section>

      <section className="analytics-feed">
        <h2 className="analytics-feed__title">Episodios</h2>
        <ul className="analytics-feed-list">
          {items.map((ep) => (
            <li key={ep.id} className="analytics-feed-item">
              <div className="analytics-feed-item__body">
                <div className="analytics-feed-item__row">
                  <span className="analytics-feed-item__time">
                    {new Date(ep.try_start_at).toLocaleString('es-ES', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="analytics-tag">{ep.location}</span>
                  <span className="analytics-tag analytics-tag--soft">{ep.source}</span>
                </div>
                {ep.recorded_by ? (
                  <p className="analytics-feed-item__who">{ep.recorded_by}</p>
                ) : null}
                {ep.cancelled ? (
                  <p className="analytics-muted">Cancelado</p>
                ) : ep.asleep_at != null && ep.wake_at != null ? (
                  <p className="analytics-feed-item__metrics">
                    <span className="analytics-metric">
                      Intento <em>{formatDuration(ep.asleep_at - ep.try_start_at)}</em>
                    </span>
                    <span className="analytics-metric">
                      Sueño <em>{formatDuration(ep.wake_at - ep.asleep_at)}</em>
                    </span>
                  </p>
                ) : (
                  <p className="analytics-muted">Incompleto</p>
                )}
              </div>
              <button type="button" className="analytics-delete" onClick={() => void remove(ep.id)}>
                Borrar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
