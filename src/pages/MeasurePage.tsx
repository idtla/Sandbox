import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { createEpisode, getApiKey } from '../api/client'
import { formatDuration, parseDatetimeLocal, toDatetimeLocalValue } from '../lib/time'
import type { SleepLocation } from '../types/episode'

type Phase = 'idle' | 'trying' | 'sleeping'

export function MeasurePage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [tryStartAt, setTryStartAt] = useState<number | null>(null)
  const [asleepAt, setAsleepAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [location, setLocation] = useState<SleepLocation>('cuna')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [manualTry, setManualTry] = useState(() => toDatetimeLocalValue(Date.now() - 3600000))
  const [manualAsleep, setManualAsleep] = useState(() => toDatetimeLocalValue(Date.now() - 1800000))
  const [manualWake, setManualWake] = useState(() => toDatetimeLocalValue(Date.now()))
  const [manualLocation, setManualLocation] = useState<SleepLocation>('cuna')

  useEffect(() => {
    if (phase === 'idle') return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [phase])

  const tryMs = useMemo(() => {
    if (tryStartAt == null) return 0
    const end = phase === 'sleeping' && asleepAt != null ? asleepAt : now
    return Math.max(0, end - tryStartAt)
  }, [tryStartAt, asleepAt, phase, now])

  const sleepMs = useMemo(() => {
    if (asleepAt == null) return 0
    return Math.max(0, now - asleepAt)
  }, [asleepAt, now])

  const startTry = useCallback(() => {
    setError(null)
    if (!getApiKey()) {
      setError('Configura la clave API en Ajustes antes de medir.')
      return
    }
    const t = Date.now()
    setTryStartAt(t)
    setAsleepAt(null)
    setPhase('trying')
    setNow(t)
  }, [])

  const markAsleep = useCallback(() => {
    if (tryStartAt == null) return
    const t = Date.now()
    setAsleepAt(t)
    setPhase('sleeping')
    setNow(t)
  }, [tryStartAt])

  const cancelTry = useCallback(() => {
    setPhase('idle')
    setTryStartAt(null)
    setAsleepAt(null)
  }, [])

  const markAwake = useCallback(async () => {
    if (tryStartAt == null || asleepAt == null) return
    if (!getApiKey()) {
      setError('Configura la clave API en Ajustes.')
      return
    }
    const wake = Date.now()
    setSaving(true)
    setError(null)
    try {
      await createEpisode({
        try_start_at: tryStartAt,
        asleep_at: asleepAt,
        wake_at: wake,
        location,
        source: 'timer',
        cancelled: false,
      })
      setPhase('idle')
      setTryStartAt(null)
      setAsleepAt(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [tryStartAt, asleepAt, location])

  const submitManual = async (e: FormEvent) => {
    e.preventDefault()
    if (!getApiKey()) {
      setError('Configura la clave API en Ajustes.')
      return
    }
    const ts = parseDatetimeLocal(manualTry)
    const asl = parseDatetimeLocal(manualAsleep)
    const wk = parseDatetimeLocal(manualWake)
    if (!(ts < asl && asl < wk)) {
      setError('Los tiempos deben ser: inicio < dormida < despierta.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createEpisode({
        try_start_at: ts,
        asleep_at: asl,
        wake_at: wk,
        location: manualLocation,
        source: 'manual',
        cancelled: false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page measure">
      <header className="page-header">
        <h1>Medir</h1>
        <p className="page-sub">Cronómetros y registro manual</p>
      </header>

      {error ? (
        <div className="banner banner--error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="card" aria-labelledby="loc-label">
        <h2 id="loc-label" className="card-title">
          ¿Dónde está?
        </h2>
        <div className="segmented" role="group" aria-label="Ubicación">
          <button
            type="button"
            className={location === 'cuna' ? 'segmented__btn is-on' : 'segmented__btn'}
            onClick={() => setLocation('cuna')}
          >
            Cuna
          </button>
          <button
            type="button"
            className={location === 'acunada' ? 'segmented__btn is-on' : 'segmented__btn'}
            onClick={() => setLocation('acunada')}
          >
            Acunada
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="timer-label">
        <h2 id="timer-label" className="card-title">
          Temporizador
        </h2>

        <div className="timers">
          <div className="timer-block">
            <span className="timer-label">Intento hasta dormir</span>
            <span className="timer-value">{formatDuration(tryMs)}</span>
          </div>
          <div className="timer-block">
            <span className="timer-label">Dormida</span>
            <span className="timer-value">{phase === 'sleeping' ? formatDuration(sleepMs) : '—'}</span>
          </div>
        </div>

        <div className="actions actions--stack">
          {phase === 'idle' ? (
            <button type="button" className="btn btn-primary" onClick={startTry}>
              Comiendo / intento dormir
            </button>
          ) : null}

          {phase === 'trying' ? (
            <>
              <button type="button" className="btn btn-primary" onClick={markAsleep}>
                Dormida
              </button>
              <button type="button" className="btn btn-ghost" onClick={cancelTry}>
                Cancelar intento
              </button>
            </>
          ) : null}

          {phase === 'sleeping' ? (
            <button type="button" className="btn btn-primary" onClick={markAwake} disabled={saving}>
              {saving ? 'Guardando…' : 'Despierta'}
            </button>
          ) : null}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Entrada manual</h2>
        <form className="form" onSubmit={submitManual}>
          <label className="field">
            <span>Inicio del intento</span>
            <input
              type="datetime-local"
              value={manualTry}
              onChange={(e) => setManualTry(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Se durmió</span>
            <input
              type="datetime-local"
              value={manualAsleep}
              onChange={(e) => setManualAsleep(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Despertó</span>
            <input
              type="datetime-local"
              value={manualWake}
              onChange={(e) => setManualWake(e.target.value)}
              required
            />
          </label>
          <div className="segmented" role="group" aria-label="Ubicación manual">
            <button
              type="button"
              className={manualLocation === 'cuna' ? 'segmented__btn is-on' : 'segmented__btn'}
              onClick={() => setManualLocation('cuna')}
            >
              Cuna
            </button>
            <button
              type="button"
              className={manualLocation === 'acunada' ? 'segmented__btn is-on' : 'segmented__btn'}
              onClick={() => setManualLocation('acunada')}
            >
              Acunada
            </button>
          </div>
          <button type="submit" className="btn btn-secondary" disabled={saving}>
            Guardar manual
          </button>
        </form>
      </section>
    </div>
  )
}
