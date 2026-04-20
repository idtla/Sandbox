import { Activity, Baby, Clock, Moon } from 'lucide-react'
import { useSleepTracking } from '../context/sleepTracking'

export function DashboardPage() {
  const {
    caregiver,
    sleepQuality,
    todaySleepSeconds,
    lastNightSeconds,
    todayTTSAvg,
    appState,
    minsAwake,
    minsRemaining,
    windowWarning,
    spainDate,
    spainTime,
    formatHoursMins,
  } = useSleepTracking()

  const radius = 95
  const strokeWidth = 6
  const normalizedRadius = radius - strokeWidth * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (sleepQuality / 100) * circumference

  return (
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
  )
}
