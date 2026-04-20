import { useEffect, useMemo, useState } from 'react'
import { Activity, Baby, BarChart2, Check, Clock, Home, MinusCircle, Moon, Play, PlusCircle, Sun } from 'lucide-react'
import { createEpisode, fetchEpisodes, getApiKey } from './api/client'
import type { SleepLocation, SleepEpisode } from './types/episode'

type AppState = 'idle' | 'trying' | 'sleeping'
type Tab = 'dashboard' | 'timer' | 'stats' | 'manual'
type Method = 'Acunada' | 'En cuna'

type HistorySession = {
  id: string
  caregiver: string
  method: Method
  timeToSleep: number
  duration: number
  date: string
  day: string
}

const targetWindowMins = 150
const targetDailySleepSeconds = 14 * 3600
const SPAIN_TIMEZONE = 'Europe/Madrid'

function getMadridYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SPAIN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatSpainDate(ts: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: SPAIN_TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(ts))
}

function formatSpainTime(ts: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: SPAIN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts))
}

function locationToMethod(location: SleepLocation): Method {
  return location === 'acunada' ? 'Acunada' : 'En cuna'
}

function methodToLocation(method: Method): SleepLocation {
  return method === 'Acunada' ? 'acunada' : 'cuna'
}

function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: SPAIN_TIMEZONE,
    weekday: 'short',
  })
    .format(date)
    .slice(0, 1)
    .toUpperCase()
}

function relativeDateLabel(ts: number): string {
  const eventDate = new Date(ts)
  const now = new Date()
  const eventYmd = getMadridYmd(eventDate)
  const todayYmd = getMadridYmd(now)
  if (eventYmd === todayYmd) return 'Hoy'
  const yesterday = new Date(now.getTime() - 86400000)
  if (eventYmd === getMadridYmd(yesterday)) return 'Ayer'
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: SPAIN_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
  }).format(eventDate)
}

function toHistorySession(ep: SleepEpisode): HistorySession | null {
  if (ep.cancelled || ep.asleep_at == null || ep.wake_at == null) return null
  const tryStart = ep.try_start_at
  const asleepAt = ep.asleep_at
  const wakeAt = ep.wake_at
  const date = new Date(tryStart)
  return {
    id: ep.id,
    caregiver: ep.recorded_by?.trim() || 'Cuidador',
    method: locationToMethod(ep.location),
    timeToSleep: Math.max(0, Math.floor((asleepAt - tryStart) / 1000)),
    duration: Math.max(0, Math.floor((wakeAt - asleepAt) / 1000)),
    date: relativeDateLabel(tryStart),
    day: dayLabel(date),
  }
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const [caregiver, setCaregiver] = useState('Cuidador')
  const [method, setMethod] = useState<Method>('Acunada')

  const [tryStartTime, setTryStartTime] = useState<number | null>(null)
  const [sleepStartTime, setSleepStartTime] = useState<number | null>(null)
  const [timeToSleep, setTimeToSleep] = useState(0)
  const [currentElapsed, setCurrentElapsed] = useState(0)

  const [lastWakeTime, setLastWakeTime] = useState(Date.now() - 90 * 60 * 1000)
  const [now, setNow] = useState(Date.now())
  const [history, setHistory] = useState<HistorySession[]>([])
  const [error, setError] = useState<string | null>(null)

  const [manualTTS, setManualTTS] = useState(15)
  const [manualDuration, setManualDuration] = useState(120)
  const spainDate = useMemo(() => formatSpainDate(now), [now])
  const spainTime = useMemo(() => formatSpainTime(now), [now])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!getApiKey()) {
      setError('Configura la clave API en Ajustes para sincronizar los datos.')
      return
    }
    void (async () => {
      try {
        const episodes = await fetchEpisodes()
        const sessions = episodes
          .map(toHistorySession)
          .filter((v): v is HistorySession => v !== null)
          .sort((a, b) => Number(b.id) - Number(a.id))
        setHistory(sessions)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error cargando sesiones')
      }
    })()
  }, [])

  useEffect(() => {
    let interval: number | undefined
    if (appState === 'trying' && tryStartTime != null) {
      interval = window.setInterval(() => {
        setCurrentElapsed(Math.floor((Date.now() - tryStartTime) / 1000))
      }, 1000)
    } else if (appState === 'sleeping' && sleepStartTime != null) {
      interval = window.setInterval(() => {
        setCurrentElapsed(Math.floor((Date.now() - sleepStartTime) / 1000))
      }, 1000)
    } else {
      setCurrentElapsed(0)
    }
    return () => {
      if (interval) window.clearInterval(interval)
    }
  }, [appState, tryStartTime, sleepStartTime])

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatHoursMins = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  const handleStartTrying = () => {
    setError(null)
    if (!getApiKey()) {
      setError('No autorizado: revisa la clave en Ajustes')
      return
    }
    setTryStartTime(Date.now())
    setAppState('trying')
  }

  const handleFallAsleep = () => {
    if (tryStartTime == null) return
    setTimeToSleep(Math.floor((Date.now() - tryStartTime) / 1000))
    setSleepStartTime(Date.now())
    setAppState('sleeping')
  }

  const handleCancel = () => {
    setAppState('idle')
    setTryStartTime(null)
  }

  const handleWakeUp = async () => {
    if (tryStartTime == null || sleepStartTime == null) return
    const wakeAt = Date.now()
    const totalSleep = Math.floor((wakeAt - sleepStartTime) / 1000)
    const newSession: HistorySession = {
      id: String(wakeAt),
      caregiver,
      method,
      timeToSleep,
      duration: totalSleep,
      date: 'Ahora',
      day: dayLabel(new Date()),
    }
    setHistory((prev) => [newSession, ...prev])
    setAppState('idle')
    setTryStartTime(null)
    setSleepStartTime(null)
    setTimeToSleep(0)
    setLastWakeTime(wakeAt)
    try {
      await createEpisode({
        try_start_at: tryStartTime,
        asleep_at: sleepStartTime,
        wake_at: wakeAt,
        location: methodToLocation(method),
        source: 'timer',
        cancelled: false,
        recorded_by: caregiver.trim() || null,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando sesión')
    }
  }

  const handleSaveManual = async () => {
    const nowMs = Date.now()
    const durationSeconds = manualDuration * 60
    const ttsSeconds = manualTTS * 60
    const asleepAt = nowMs - durationSeconds * 1000
    const tryStartAt = asleepAt - ttsSeconds * 1000
    const newSession: HistorySession = {
      id: String(nowMs),
      caregiver,
      method,
      timeToSleep: ttsSeconds,
      duration: durationSeconds,
      date: 'Manual',
      day: dayLabel(new Date()),
    }
    setHistory((prev) => [newSession, ...prev])
    setActiveTab('dashboard')
    try {
      await createEpisode({
        try_start_at: tryStartAt,
        asleep_at: asleepAt,
        wake_at: nowMs,
        location: methodToLocation(method),
        source: 'manual',
        cancelled: false,
        recorded_by: caregiver.trim() || null,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando sesión')
    }
  }

  const todaySleepSeconds = useMemo(
    () =>
      history
        .filter((s) => s.date === 'Hoy' || s.date === 'Ahora')
        .reduce((acc, curr) => acc + curr.duration, 0) + (appState === 'sleeping' ? currentElapsed : 0),
    [history, appState, currentElapsed],
  )

  const lastNightSeconds = useMemo(
    () => history.filter((s) => s.date === 'Ayer').reduce((acc, curr) => acc + curr.duration, 0),
    [history],
  )

  const minsAwake = appState === 'idle' ? Math.floor((now - lastWakeTime) / 60000) : 0
  const minsRemaining = targetWindowMins - minsAwake
  const windowWarning = minsRemaining <= 30
  const todayTTSAvg =
    history.filter((s) => s.date === 'Hoy').reduce((acc, curr) => acc + curr.timeToSleep, 0) /
    (history.filter((s) => s.date === 'Hoy').length || 1)
  const ttsPenalty = Math.max(0, (todayTTSAvg - 15 * 60) / 60) * 1.5
  const durationScore = Math.min(100, (todaySleepSeconds / targetDailySleepSeconds) * 100)
  const sleepQuality = Math.max(0, Math.min(100, 85 + durationScore * 0.15 - ttsPenalty))

  const radius = 95
  const strokeWidth = 6
  const normalizedRadius = radius - strokeWidth * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (sleepQuality / 100) * circumference

  const avgByCaregiver = (name: string) =>
    Math.round(
      history
        .filter((s) => s.caregiver === name)
        .reduce((a, b) => a + b.timeToSleep, 0) /
        (history.filter((s) => s.caregiver === name).length || 1) /
        60,
    )

  const avgByMethod = (m: Method) =>
    Math.round(
      history
        .filter((s) => s.method === m)
        .reduce((a, b) => a + b.timeToSleep, 0) /
        (history.filter((s) => s.method === m).length || 1) /
        60,
    )

  const avgMamaTTS = avgByCaregiver('Mamá')
  const avgPapaTTS = avgByCaregiver('Papá')
  const avgCuidadorTTS = avgByCaregiver('Cuidador')
  const avgAcunadaTTS = avgByMethod('Acunada')
  const avgCunaTTS = avgByMethod('En cuna')

  const mockWeeklyData = [
    { day: 'L', duration: 12.5, tts: 25 },
    { day: 'M', duration: 13.2, tts: 18 },
    { day: 'X', duration: 11.8, tts: 35 },
    { day: 'J', duration: 14.1, tts: 15 },
    { day: 'V', duration: Number((todaySleepSeconds / 3600).toFixed(1)), tts: Math.round(todayTTSAvg / 60) },
    { day: 'S', duration: 0, tts: 0 },
    { day: 'D', duration: 0, tts: 0 },
  ]

  const SegmentedControl = ({
    options,
    selected,
    onChange,
  }: {
    options: string[]
    selected: string
    onChange: (value: string) => void
  }) => (
    <div className="flex w-full rounded-xl bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          disabled={appState !== 'idle'}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-300 ${
            selected === opt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          } ${appState !== 'idle' ? 'opacity-40' : ''}`}
        >
          {opt}
        </button>
      ))}
    </div>
  )

  const ProgressBar = ({
    label,
    value,
    max,
    colorClass,
  }: {
    label: string
    value: number
    max: number
    colorClass: string
  }) => (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500">{label}</span>
        <span className="font-semibold text-slate-800">{value}m</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-1000 ease-out`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  )

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md select-none flex-col overflow-hidden bg-[#F4F7FB] pb-24 font-sans text-slate-800 shadow-2xl">
      <div className="animate-blob absolute left-[-20%] top-[-10%] h-72 w-72 rounded-full bg-blue-100 opacity-50 mix-blend-multiply blur-3xl" />
      <div className="animate-blob animation-delay-2000 absolute right-[-10%] top-[20%] h-72 w-72 rounded-full bg-indigo-100 opacity-50 mix-blend-multiply blur-3xl" />

      {error ? (
        <div className="z-20 mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in z-10 flex min-h-[calc(100vh-6rem)] w-full flex-col space-y-5 p-6 pt-8 duration-500">
          <div className="mb-2 flex w-full items-center justify-between">
            <div className="flex flex-col">
              <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                <Activity size={12} className="text-blue-500" /> Resumen Diario
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-800">Hola, {caregiver}</h1>
              <span className="mt-1 text-xs text-slate-500">
                {spainDate} · {spainTime} (España)
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">
              <Baby className="text-blue-500" size={20} />
            </div>
          </div>

          <div className="relative flex w-full flex-col items-center rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="absolute top-6 flex w-full items-center justify-between px-6">
              <span className="text-sm font-medium text-slate-800">Calidad de Sueño</span>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-500">
                Óptima
              </span>
            </div>
            <div className="relative mt-4 flex w-full justify-center py-6">
              <svg height={radius * 2} width={radius * 2} className="-rotate-90 drop-shadow-md">
                <circle
                  stroke="#F1F5F9"
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  strokeLinecap="round"
                />
                <circle
                  stroke="#3B82F6"
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.5s ease-in-out' }}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  strokeLinecap="round"
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-4">
                <div className="flex items-baseline">
                  <span className="text-6xl font-bold tracking-tighter text-slate-800">{Math.round(sleepQuality)}</span>
                  <span className="ml-1 text-lg font-medium text-slate-400">%</span>
                </div>
                <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-blue-500">Score</span>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            <div className="relative flex h-[8.5rem] flex-col justify-between overflow-hidden rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="z-10 flex items-start justify-between">
                <span className="text-xs font-medium text-slate-500">Sueño Hoy</span>
                <div className="rounded-full bg-blue-50 p-2">
                  <Moon size={14} className="text-blue-500" />
                </div>
              </div>
              <div className="z-10 mt-2 flex flex-col">
                <span className="text-[1.75rem] font-semibold text-slate-800">{formatHoursMins(todaySleepSeconds)}</span>
                <span className="mt-1 flex items-center gap-1 text-[10px] font-medium text-emerald-500">↑ En progreso</span>
              </div>
              <div className="absolute -bottom-10 -right-10 h-24 w-24 rounded-full bg-blue-50" />
            </div>

            <div
              className={`flex h-[8.5rem] flex-col justify-between rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors ${
                appState !== 'idle' ? 'bg-blue-600 text-white' : windowWarning ? 'border border-rose-100 bg-rose-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className={`text-xs font-medium ${appState !== 'idle' ? 'text-blue-100' : 'text-slate-500'}`}>
                  Siguiente Sueño
                </span>
                <div
                  className={`rounded-full p-2 ${
                    appState !== 'idle' ? 'bg-blue-500/50' : windowWarning ? 'bg-rose-100' : 'bg-slate-50'
                  }`}
                >
                  <Clock
                    size={14}
                    className={appState !== 'idle' ? 'text-white' : windowWarning ? 'text-rose-500' : 'text-slate-500'}
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-col">
                {appState === 'sleeping' ? (
                  <span className="text-2xl font-semibold">Durmiendo</span>
                ) : appState === 'trying' ? (
                  <span className="text-2xl font-semibold">Intentando</span>
                ) : (
                  <>
                    <span className={`text-[1.65rem] font-semibold ${windowWarning ? 'text-rose-600' : 'text-slate-800'}`}>
                      {minsRemaining > 0 ? `${Math.floor(minsRemaining / 60)}h ${minsRemaining % 60}m` : 'Ahora'}
                    </span>
                    {minsRemaining > 0 ? (
                      <span className={`mt-1 text-[10px] font-medium ${windowWarning ? 'text-rose-400' : 'text-slate-400'}`}>
                        Despierta hace {Math.floor(minsAwake / 60)}h
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <div className="flex h-32 flex-col justify-between rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <span className="text-xs font-medium text-slate-500">Última Noche</span>
              <div className="flex items-end gap-2">
                <span className="text-[1.6rem] font-semibold text-slate-800">{formatHoursMins(lastNightSeconds)}</span>
              </div>
            </div>

            <div className="flex h-32 flex-col justify-between rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <span className="text-xs font-medium text-slate-500">Media en dormir</span>
              <div className="flex items-end gap-1">
                <span className="text-[1.6rem] font-semibold text-slate-800">{Math.round(todayTTSAvg / 60)}</span>
                <span className="mb-1 text-sm font-medium text-slate-400">min</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timer' && (
        <div className="animate-in fade-in z-10 flex min-h-[calc(100vh-6rem)] w-full flex-1 flex-col items-center justify-between p-6 duration-300">
          <div className="w-full space-y-6 pt-6">
            <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-800">Registro Activo</h1>
            <div className="space-y-4 rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <SegmentedControl
                options={['Mamá', 'Papá', 'Cuidador']}
                selected={caregiver}
                onChange={(v) => setCaregiver(v)}
              />
              <SegmentedControl
                options={['Acunada', 'En cuna']}
                selected={method}
                onChange={(v) => setMethod(v as Method)}
              />
            </div>
          </div>

          <div className="my-8 flex w-full flex-1 flex-col items-center justify-center">
            <div className="mb-6 flex h-8 items-center justify-center text-center">
              {appState === 'trying' ? (
                <span className="rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-700">
                  Intentando...
                </span>
              ) : null}
              {appState === 'sleeping' ? (
                <span className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-700">
                  <Moon size={14} /> Durmiendo
                </span>
              ) : null}
              {appState === 'idle' ? (
                <span className="flex items-center gap-2 rounded-full bg-slate-200 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                  <Sun size={14} /> Despierta
                </span>
              ) : null}
            </div>
            <div className="mb-6 w-full text-center font-light tabular-nums leading-none tracking-tighter text-slate-800 drop-shadow-sm sm:text-[7rem] text-[6rem]">
              {formatTime(currentElapsed)}
            </div>
            <div
              className={`flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition-opacity duration-700 ${
                appState === 'sleeping' ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <span>Tardó en dormir:</span>
              <span className="font-bold text-slate-800">{formatTime(timeToSleep)}</span>
            </div>
          </div>

          <div className="w-full space-y-4 pb-4">
            {appState === 'idle' ? (
              <button
                onClick={handleStartTrying}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-5 text-lg font-semibold tracking-wide text-white shadow-[0_10px_25px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98] hover:bg-blue-700"
              >
                <Play size={20} fill="currentColor" /> INICIAR INTENTO
              </button>
            ) : null}

            {appState === 'trying' ? (
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-5 text-sm font-semibold tracking-wide text-slate-600 shadow-sm transition-all active:scale-[0.98]"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleFallAsleep}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-5 text-lg font-semibold tracking-wide text-white shadow-[0_10px_25px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98]"
                >
                  <Check size={22} strokeWidth={3} /> SE DURMIÓ
                </button>
              </div>
            ) : null}

            {appState === 'sleeping' ? (
              <button
                onClick={() => void handleWakeUp()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-5 text-lg font-semibold tracking-wide text-white shadow-[0_10px_25px_rgba(245,158,11,0.3)] transition-all active:scale-[0.98]"
              >
                <Sun size={22} strokeWidth={2.5} /> DESPERTÓ
              </button>
            ) : null}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="animate-in fade-in z-10 flex min-h-[calc(100vh-6rem)] w-full flex-col space-y-6 p-6 pt-8 duration-300">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">Analíticas</h1>
            <p className="mt-1 text-xs text-slate-500">{spainDate} · {spainTime} (España)</p>
          </div>

          <div className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Ciclo Semanal</h3>
              <div className="flex gap-2">
                <div className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">Semana</div>
              </div>
            </div>
            <div className="mt-4 flex h-48 items-end justify-between gap-1 sm:gap-2">
              {mockWeeklyData.map((d, i) => {
                const isToday = d.day === 'V'
                const hasData = d.duration > 0
                const heightPct = hasData ? (d.duration / 16) * 100 : 0
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-3">
                    <div
                      className={`relative flex h-40 w-full max-w-[2.75rem] flex-col items-center justify-end rounded-full transition-all duration-500 ${
                        isToday
                          ? 'bg-gradient-to-b from-blue-400 to-blue-600 shadow-[0_8px_20px_rgba(37,99,235,0.3)]'
                          : hasData
                            ? 'bg-gradient-to-b from-slate-50 to-slate-100/50'
                            : 'bg-transparent'
                      }`}
                    >
                      {isToday && hasData ? (
                        <div className="absolute -top-3.5 z-20 whitespace-nowrap rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                          {Math.round(d.duration)} hrs
                        </div>
                      ) : null}

                      {hasData ? (
                        <div
                          className="absolute bottom-4 flex w-full flex-col items-center justify-between transition-all duration-1000 ease-out"
                          style={{ height: `${Math.max(15, heightPct)}%` }}
                        >
                          <div className={`z-10 h-2.5 w-2.5 shrink-0 rounded-full ${isToday ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-blue-600'}`} />
                          <div className={`z-0 -my-0.5 flex-1 w-[2px] ${isToday ? 'bg-white/50' : 'bg-slate-300'}`} />
                          <div className={`z-10 h-3.5 w-3.5 shrink-0 rounded-full border-[2.5px] ${isToday ? 'border-white bg-blue-600' : 'border-blue-600 bg-white'}`} />
                        </div>
                      ) : (
                        <div className="absolute bottom-4 flex w-full flex-col items-center">
                          <div className="h-3.5 w-3.5 shrink-0 rounded-full border-[2.5px] border-slate-200 bg-transparent" />
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{d.day}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex gap-4 border-t border-slate-100 pt-4 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                Total Dormido
              </span>
              <span className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full border-[2px] border-blue-600 bg-transparent" />
                Inicio de sueño
              </span>
            </div>
          </div>

          <div className="space-y-6 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="text-sm font-semibold text-slate-800">Desempeño en dormir (Media)</h3>
            <div className="space-y-5">
              <ProgressBar label="Mamá" value={avgMamaTTS} max={60} colorClass="bg-blue-500" />
              <ProgressBar label="Papá" value={avgPapaTTS} max={60} colorClass="bg-indigo-400" />
              <ProgressBar label="Cuidador" value={avgCuidadorTTS} max={60} colorClass="bg-slate-500" />
            </div>
            <div className="h-px w-full bg-slate-100" />
            <div className="space-y-5">
              <ProgressBar label="Acunada" value={avgAcunadaTTS} max={60} colorClass="bg-emerald-400" />
              <ProgressBar label="En cuna" value={avgCunaTTS} max={60} colorClass="bg-amber-400" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="animate-in fade-in z-10 flex min-h-[calc(100vh-6rem)] w-full flex-col space-y-6 p-6 pt-10 duration-300">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">Añadir Sesión</h1>

          <div className="space-y-6 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="space-y-2">
              <label className="pl-1 text-xs font-semibold text-slate-500">Cuidador</label>
              <SegmentedControl
                options={['Mamá', 'Papá', 'Cuidador']}
                selected={caregiver}
                onChange={(v) => setCaregiver(v)}
              />
            </div>
            <div className="space-y-2">
              <label className="pl-1 text-xs font-semibold text-slate-500">Método usado</label>
              <SegmentedControl
                options={['Acunada', 'En cuna']}
                selected={method}
                onChange={(v) => setMethod(v as Method)}
              />
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Tiempo en dormirse</span>
                <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-1.5">
                  <button
                    onClick={() => setManualTTS(Math.max(1, manualTTS - 5))}
                    className="rounded-xl bg-white p-2 text-blue-500 shadow-sm"
                  >
                    <MinusCircle size={20} strokeWidth={2} />
                  </button>
                  <span className="w-12 text-center text-xl font-bold text-slate-800">{manualTTS}</span>
                  <button onClick={() => setManualTTS(manualTTS + 5)} className="rounded-xl bg-white p-2 text-blue-500 shadow-sm">
                    <PlusCircle size={20} strokeWidth={2} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Tiempo durmiendo</span>
                <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-1.5">
                  <button
                    onClick={() => setManualDuration(Math.max(10, manualDuration - 10))}
                    className="rounded-xl bg-white p-2 text-blue-500 shadow-sm"
                  >
                    <MinusCircle size={20} strokeWidth={2} />
                  </button>
                  <span className="w-12 text-center text-xl font-bold text-slate-800">{manualDuration}</span>
                  <button
                    onClick={() => setManualDuration(manualDuration + 10)}
                    className="rounded-xl bg-white p-2 text-blue-500 shadow-sm"
                  >
                    <PlusCircle size={20} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => void handleSaveManual()}
            className="mt-auto w-full rounded-2xl bg-slate-800 py-5 text-lg font-semibold tracking-wide text-white shadow-lg transition-all active:scale-[0.98]"
          >
            GUARDAR REGISTRO
          </button>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex h-24 max-w-md items-start justify-around border-t border-slate-100 bg-white/80 px-4 pb-6 pt-4 backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-1 flex-col items-center gap-1.5 transition-colors ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={activeTab === 'dashboard' ? 'rounded-xl bg-blue-50 p-1.5' : 'p-1.5'}>
            <Home size={22} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold tracking-wide">Inicio</span>
        </button>
        <button
          onClick={() => setActiveTab('timer')}
          className={`flex flex-1 flex-col items-center gap-1.5 transition-colors ${activeTab === 'timer' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={activeTab === 'timer' ? 'rounded-xl bg-blue-50 p-1.5' : 'p-1.5'}>
            <Clock size={22} strokeWidth={activeTab === 'timer' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold tracking-wide">Reloj</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-1 flex-col items-center gap-1.5 transition-colors ${activeTab === 'stats' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={activeTab === 'stats' ? 'rounded-xl bg-blue-50 p-1.5' : 'p-1.5'}>
            <BarChart2 size={22} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold tracking-wide">Análisis</span>
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex flex-1 flex-col items-center gap-1.5 transition-colors ${activeTab === 'manual' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={activeTab === 'manual' ? 'rounded-xl bg-blue-50 p-1.5' : 'p-1.5'}>
            <PlusCircle size={22} strokeWidth={activeTab === 'manual' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold tracking-wide">Añadir</span>
        </button>
      </div>
    </div>
  )
}
