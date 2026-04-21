import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createEpisode,
  deleteAllEpisodes,
  deleteEpisode,
  fetchEpisodes,
  getDefaultRecordedBy,
  setDefaultRecordedBy,
} from '../api/client'
import type { SleepEpisode, SleepLocation } from '../types/episode'

export type AppState = 'idle' | 'trying' | 'sleeping'
export type Method = 'Acunada' | 'En cuna'

export type HistorySession = {
  id: string
  caregiver: string
  method: Method
  timeToSleep: number
  duration: number
  date: string
  day: string
}

const SPAIN_TIMEZONE = 'Europe/Madrid'
const targetWindowMins = 150
const targetDailySleepSeconds = 14 * 3600

function getMadridYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SPAIN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
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

type SleepTrackingValue = {
  appState: AppState
  caregiver: string
  setCaregiver: (v: string) => void
  method: Method
  setMethod: (v: Method) => void
  tryStartTime: number | null
  sleepStartTime: number | null
  timeToSleep: number
  currentElapsed: number
  lastWakeTime: number
  setLastWakeTime: (n: number) => void
  now: number
  history: HistorySession[]
  episodes: SleepEpisode[]
  reloadEpisodes: () => Promise<void>
  removeEpisode: (id: string) => Promise<void>
  error: string | null
  setError: (e: string | null) => void
  notice: string | null
  setNotice: (n: string | null) => void
  manualTTS: number
  setManualTTS: (n: number) => void
  manualDuration: number
  setManualDuration: (n: number) => void
  spainDate: string
  spainTime: string
  formatTime: (totalSeconds: number) => string
  formatHoursMins: (totalSeconds: number) => string
  handleStartTrying: () => void
  handleFallAsleep: () => void
  handleCancel: () => void
  handleWakeUp: () => Promise<void>
  handleSaveManual: () => Promise<boolean>
  todaySleepSeconds: number
  lastNightSeconds: number
  minsAwake: number
  minsRemaining: number
  windowWarning: boolean
  todayTTSAvg: number
  sleepQuality: number
  mockWeeklyData: { day: string; duration: number; tts: number }[]
  avgMamaTTS: number
  avgPapaTTS: number
  avgCuidadorTTS: number
  avgAcunadaTTS: number
  avgCunaTTS: number
  exportBackup: () => Promise<void>
  importBackup: (file: File) => Promise<void>
  clearAllEpisodes: () => Promise<void>
  parentName: string
  setParentName: (v: string) => void
  saveParentName: () => void
}

const Ctx = createContext<SleepTrackingValue | null>(null)

export function useSleepTracking(): SleepTrackingValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSleepTracking debe usarse dentro de SleepTrackingProvider')
  return v
}

export function formatSpainDate(ts: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: SPAIN_TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(ts))
}

export function formatSpainTime(ts: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: SPAIN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts))
}

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatHoursMins(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function SleepTrackingProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>('idle')
  const [caregiver, setCaregiver] = useState('Cuidador')
  const [method, setMethod] = useState<Method>('Acunada')
  const [tryStartTime, setTryStartTime] = useState<number | null>(null)
  const [sleepStartTime, setSleepStartTime] = useState<number | null>(null)
  const [timeToSleep, setTimeToSleep] = useState(0)
  const [currentElapsed, setCurrentElapsed] = useState(0)
  const [lastWakeTime, setLastWakeTime] = useState(Date.now() - 90 * 60 * 1000)
  const [now, setNow] = useState(Date.now())
  const [history, setHistory] = useState<HistorySession[]>([])
  const [episodes, setEpisodes] = useState<SleepEpisode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [manualTTS, setManualTTS] = useState(15)
  const [manualDuration, setManualDuration] = useState(120)
  const [parentName, setParentName] = useState(() => getDefaultRecordedBy())

  const spainDate = useMemo(() => formatSpainDate(now), [now])
  const spainTime = useMemo(() => formatSpainTime(now), [now])

  const reloadEpisodes = useCallback(async () => {
    try {
      const eps = await fetchEpisodes()
      setEpisodes(eps)
      const sessions = eps
        .map(toHistorySession)
        .filter((v): v is HistorySession => v !== null)
        .sort((a, b) => Number(b.id) - Number(a.id))
      setHistory(sessions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando sesiones')
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    void reloadEpisodes()
  }, [reloadEpisodes])

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

  const handleStartTrying = () => {
    setNotice(null)
    setError(null)
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
      await reloadEpisodes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando sesión')
    }
  }

  const handleSaveManual = async (): Promise<boolean> => {
    const nowMs = Date.now()
    const durationSeconds = manualDuration * 60
    const ttsSeconds = manualTTS * 60
    const asleepAt = nowMs - durationSeconds * 1000
    const tryStartAt = asleepAt - ttsSeconds * 1000
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
      await reloadEpisodes()
      setNotice('Sesión manual guardada.')
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando sesión')
      return false
    }
  }

  const saveParentName = () => {
    setDefaultRecordedBy(parentName)
    setNotice('Nombre por defecto guardado en este dispositivo.')
    setError(null)
  }

  const exportBackup = async () => {
    setError(null)
    setNotice(null)
    try {
      const list = await fetchEpisodes()
      const blob = new Blob([JSON.stringify({ episodes: list }, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sueno-bebe-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setNotice('Exportación descargada.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar')
    }
  }

  const importBackupFromFile = async (file: File) => {
    const text = await file.text()
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
    await reloadEpisodes()
    setNotice(`Importados ${list.length} episodios.`)
  }

  const clearAllEpisodesOnServer = async () => {
    await deleteAllEpisodes()
    await reloadEpisodes()
    setNotice('Todos los episodios han sido borrados.')
  }

  const removeEpisode = async (id: string) => {
    await deleteEpisode(id)
    await reloadEpisodes()
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
    {
      day: 'V',
      duration: Number((todaySleepSeconds / 3600).toFixed(1)),
      tts: Math.round(todayTTSAvg / 60),
    },
    { day: 'S', duration: 0, tts: 0 },
    { day: 'D', duration: 0, tts: 0 },
  ]

  const value: SleepTrackingValue = {
    appState,
    caregiver,
    setCaregiver,
    method,
    setMethod,
    tryStartTime,
    sleepStartTime,
    timeToSleep,
    currentElapsed,
    lastWakeTime,
    setLastWakeTime,
    now,
    history,
    episodes,
    reloadEpisodes,
    removeEpisode,
    error,
    setError,
    notice,
    setNotice,
    manualTTS,
    setManualTTS,
    manualDuration,
    setManualDuration,
    spainDate,
    spainTime,
    formatTime,
    formatHoursMins,
    handleStartTrying,
    handleFallAsleep,
    handleCancel,
    handleWakeUp,
    handleSaveManual,
    todaySleepSeconds,
    lastNightSeconds,
    minsAwake,
    minsRemaining,
    windowWarning,
    todayTTSAvg,
    sleepQuality,
    mockWeeklyData,
    avgMamaTTS,
    avgPapaTTS,
    avgCuidadorTTS,
    avgAcunadaTTS,
    avgCunaTTS,
    exportBackup,
    importBackup: async (file: File) => {
      setError(null)
      setNotice(null)
      try {
        await importBackupFromFile(file)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al importar')
      }
    },
    clearAllEpisodes: async () => {
      setError(null)
      setNotice(null)
      try {
        await clearAllEpisodesOnServer()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al borrar')
      }
    },
    parentName,
    setParentName,
    saveParentName,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
