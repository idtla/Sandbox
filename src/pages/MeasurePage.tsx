import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { createEpisode, getApiKey, getDefaultRecordedBy, setDefaultRecordedBy } from '../api/client'
import { formatDuration, parseDatetimeLocal, toDatetimeLocalValue } from '../lib/time'
import type { SleepLocation } from '../types/episode'

type Phase = 'idle' | 'trying' | 'sleeping'

export function MeasurePage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [tryStartAt, setTryStartAt] = useState<number | null>(null)
  const [asleepAt, setAsleepAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [location, setLocation] = useState<SleepLocation>('cuna')
  const [recordedBy, setRecordedBy] = useState(() => getDefaultRecordedBy())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const [manualTry, setManualTry] = useState(() => toDatetimeLocalValue(Date.now() - 3600000))
  const [manualAsleep, setManualAsleep] = useState(() => toDatetimeLocalValue(Date.now() - 1800000))
  const [manualWake, setManualWake] = useState(() => toDatetimeLocalValue(Date.now()))
  const [manualLocation, setManualLocation] = useState<SleepLocation>('cuna')
  const [manualRecordedBy, setManualRecordedBy] = useState(() => getDefaultRecordedBy())

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

  const ringMainLabel = phase === 'idle' ? 'Listo' : phase === 'trying' ? 'Intento' : 'Sueño'
  const ringMainValue =
    phase === 'idle' ? '—' : phase === 'trying' ? formatDuration(tryMs) : formatDuration(sleepMs)
  const ringSub =
    phase === 'sleeping' && tryStartAt != null && asleepAt != null
      ? `Intento ${formatDuration(asleepAt - tryStartAt)}`
      : phase === 'trying'
        ? 'Hasta dormir'
        : ' '

  const persistRecordedBy = (v: string) => {
    setRecordedBy(v)
    setDefaultRecordedBy(v)
  }

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
    const rb = recordedBy.trim()
    const wake = Date.now()
    const currentTryStart = tryStartAt
    const currentAsleepAt = asleepAt
    const currentLocation = location
    const currentRecordedBy = rb.length ? rb : null
    // El estado del temporizador debe finalizar al pulsar "Despierta", aunque falle la API.
    setPhase('idle')
    setTryStartAt(null)
    setAsleepAt(null)
    setNow(wake)
    setSaving(true)
    setError(null)
    try {
      await createEpisode({
        try_start_at: currentTryStart,
        asleep_at: currentAsleepAt,
        wake_at: wake,
        location: currentLocation,
        source: 'timer',
        cancelled: false,
        recorded_by: currentRecordedBy,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [tryStartAt, asleepAt, location, recordedBy])

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
      const rb = manualRecordedBy.trim()
      await createEpisode({
        try_start_at: ts,
        asleep_at: asl,
        wake_at: wk,
        location: manualLocation,
        source: 'manual',
        cancelled: false,
        recorded_by: rb.length ? rb : null,
      })
      setDefaultRecordedBy(manualRecordedBy)
      setShowManual(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page measure">
      <header className="measure-header">
        <h1 className="measure-title">Medir</h1>
        <p className="measure-tagline">Una sola cosa a la vez</p>
      </header>

      {error ? (
        <div className="banner banner--error measure-banner" role="alert">
          {error}
        </div>
      ) : null}

      <section className="measure-panel" aria-labelledby="loc-label">
        <h2 id="loc-label" className="measure-panel__label">
          Dónde
        </h2>
        <div className="chips" role="group" aria-label="Ubicación">
          <button
            type="button"
            className={location === 'cuna' ? 'chip chip--on' : 'chip'}
            onClick={() => setLocation('cuna')}
          >
            Cuna
          </button>
          <button
            type="button"
            className={location === 'acunada' ? 'chip chip--on' : 'chip'}
            onClick={() => setLocation('acunada')}
          >
            Acunada
          </button>
        </div>
      </section>

      <section className="measure-timer-block" aria-labelledby="timer-label">
        <h2 id="timer-label" className="sr-only">
          Temporizador
        </h2>

        <div className="ring-wrap">
          <div className="ring-outer" aria-hidden>
            <div className="ring-inner">
              <span className="ring-kicker">{ringMainLabel}</span>
              <span className="ring-time">{ringMainValue}</span>
              <span className="ring-sub">{ringSub.trim() || '\u00a0'}</span>
            </div>
          </div>
        </div>

        <label className="measure-field">
          <span className="measure-field__label">Padre / cuidador</span>
          <input
            type="text"
            value={recordedBy}
            onChange={(e) => persistRecordedBy(e.target.value)}
            placeholder="Ej. Iñigo"
            maxLength={120}
            autoComplete="name"
          />
        </label>

        <div className="measure-actions">
          {phase === 'idle' ? (
            <button type="button" className="btn-pill btn-pill--primary" onClick={startTry}>
              Comiendo · intento dormir
            </button>
          ) : null}

          {phase === 'trying' ? (
            <>
              <button type="button" className="btn-pill btn-pill--primary" onClick={markAsleep}>
                Dormida
              </button>
              <button type="button" className="btn-pill btn-pill--quiet" onClick={cancelTry}>
                Cancelar intento
              </button>
            </>
          ) : null}

          {phase === 'sleeping' ? (
            <button type="button" className="btn-pill btn-pill--primary" onClick={markAwake} disabled={saving}>
              {saving ? 'Guardando…' : 'Despierta'}
            </button>
          ) : null}
        </div>
      </section>

      <div className="measure-manual-toggle">
        <button
          type="button"
          className="btn-pill btn-pill--outline"
          onClick={() => setShowManual((v) => !v)}
          aria-expanded={showManual}
        >
          {showManual ? 'Cerrar entrada manual' : 'Entrada manual'}
        </button>
      </div>

      {showManual ? (
        <section className="measure-panel measure-panel--manual">
          <form className="measure-form" onSubmit={submitManual}>
            <label className="measure-field">
              <span className="measure-field__label">Padre / cuidador</span>
              <input
                type="text"
                value={manualRecordedBy}
                onChange={(e) => setManualRecordedBy(e.target.value)}
                maxLength={120}
              />
            </label>
            <label className="measure-field">
              <span className="measure-field__label">Inicio del intento</span>
              <input
                type="datetime-local"
                value={manualTry}
                onChange={(e) => setManualTry(e.target.value)}
                required
              />
            </label>
            <label className="measure-field">
              <span className="measure-field__label">Se durmió</span>
              <input
                type="datetime-local"
                value={manualAsleep}
                onChange={(e) => setManualAsleep(e.target.value)}
                required
              />
            </label>
            <label className="measure-field">
              <span className="measure-field__label">Despertó</span>
              <input
                type="datetime-local"
                value={manualWake}
                onChange={(e) => setManualWake(e.target.value)}
                required
              />
            </label>
            <div className="chips" role="group" aria-label="Ubicación manual">
              <button
                type="button"
                className={manualLocation === 'cuna' ? 'chip chip--on' : 'chip'}
                onClick={() => setManualLocation('cuna')}
              >
                Cuna
              </button>
              <button
                type="button"
                className={manualLocation === 'acunada' ? 'chip chip--on' : 'chip'}
                onClick={() => setManualLocation('acunada')}
              >
                Acunada
              </button>
            </div>
            <button type="submit" className="btn-pill btn-pill--secondary" disabled={saving}>
              Guardar
            </button>
          </form>
        </section>
      ) : null}
    </div>
  )
}
