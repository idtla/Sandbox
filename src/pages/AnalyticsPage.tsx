import { useCallback, useState } from 'react'
import { ProgressBar } from '../components/SleepUi'
import { useSleepTracking } from '../context/sleepTracking'
import { formatDuration } from '../lib/time'
import type { SleepEpisode } from '../types/episode'

export function AnalyticsPage() {
  const {
    spainDate,
    spainTime,
    mockWeeklyData,
    avgMamaTTS,
    avgPapaTTS,
    avgCuidadorTTS,
    avgAcunadaTTS,
    avgCunaTTS,
    episodes,
    reloadEpisodes,
    removeEpisode,
    setError,
  } = useSleepTracking()

  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await reloadEpisodes()
    } finally {
      setLoading(false)
    }
  }, [reloadEpisodes])

  const onRemove = async (id: string) => {
    if (!window.confirm('¿Borrar este episodio?')) return
    try {
      await removeEpisode(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al borrar')
    }
  }

  return (
    <div className="animate-in fade-in z-10 flex min-h-[calc(100vh-6rem)] w-full flex-col space-y-6 p-6 pt-8 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">Analíticas</h1>
          <p className="mt-1 text-xs text-slate-500">
            {spainDate} · {spainTime} (España)
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          {loading ? '…' : 'Actualizar'}
        </button>
      </div>

      <div className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Ciclo Semanal</h3>
          <div className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">Semana</div>
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
                      <div
                        className={`z-10 h-2.5 w-2.5 shrink-0 rounded-full ${isToday ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-blue-600'}`}
                      />
                      <div className={`z-0 -my-0.5 flex-1 w-[2px] ${isToday ? 'bg-white/50' : 'bg-slate-300'}`} />
                      <div
                        className={`z-10 h-3.5 w-3.5 shrink-0 rounded-full border-[2.5px] ${isToday ? 'border-white bg-blue-600' : 'border-blue-600 bg-white'}`}
                      />
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

      <section className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Episodios recientes</h2>
        {episodes.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay episodios completados.</p>
        ) : (
          <ul className="space-y-3">
            {episodes.map((ep: SleepEpisode) => (
              <li
                key={ep.id}
                className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>
                      {new Date(ep.try_start_at).toLocaleString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">{ep.location}</span>
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-slate-600">{ep.source}</span>
                  </div>
                  {ep.recorded_by ? <p className="mt-1 text-sm text-slate-700">{ep.recorded_by}</p> : null}
                  {!ep.cancelled && ep.asleep_at != null && ep.wake_at != null ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Intento <em className="not-italic text-slate-800">{formatDuration(ep.asleep_at - ep.try_start_at)}</em>
                      {' · '}
                      Sueño <em className="not-italic text-slate-800">{formatDuration(ep.wake_at - ep.asleep_at)}</em>
                    </p>
                  ) : ep.cancelled ? (
                    <p className="mt-1 text-xs text-amber-700">Cancelado</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">Incompleto</p>
                  )}
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  onClick={() => void onRemove(ep.id)}
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
