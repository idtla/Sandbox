import { Check, Moon, Play, Sun } from 'lucide-react'
import { SegmentedControlTimer } from '../components/SleepUi'
import { useSleepTracking } from '../context/sleepTracking'
import type { Method } from '../context/sleepTracking'

function methodFromSeg(v: string): Method {
  return v === 'Acunada' ? 'Acunada' : 'En cuna'
}

export function TimerPage() {
  const {
    appState,
    caregiver,
    setCaregiver,
    method,
    setMethod,
    timeToSleep,
    currentElapsed,
    formatTime,
    handleStartTrying,
    handleFallAsleep,
    handleCancel,
    handleWakeUp,
  } = useSleepTracking()

  return (
    <div className="animate-in fade-in z-10 flex min-h-[calc(100vh-6rem)] w-full flex-1 flex-col items-center justify-between p-6 duration-300">
      <div className="w-full space-y-6 pt-6">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-800">Registro Activo</h1>
        <div className="space-y-4 rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <SegmentedControlTimer
            options={['Mamá', 'Papá', 'Cuidador']}
            selected={caregiver}
            onChange={(v) => setCaregiver(v)}
            appState={appState}
          />
          <SegmentedControlTimer
            options={['Acunada', 'En cuna']}
            selected={method}
            onChange={(v) => setMethod(methodFromSeg(v))}
            appState={appState}
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
            type="button"
            onClick={handleStartTrying}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-5 text-lg font-semibold tracking-wide text-white shadow-[0_10px_25px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98] hover:bg-blue-700"
          >
            <Play size={20} fill="currentColor" /> INICIAR INTENTO
          </button>
        ) : null}

        {appState === 'trying' ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-5 text-sm font-semibold tracking-wide text-slate-600 shadow-sm transition-all active:scale-[0.98]"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleFallAsleep}
              className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-5 text-lg font-semibold tracking-wide text-white shadow-[0_10px_25px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98]"
            >
              <Check size={22} strokeWidth={3} /> SE DURMIÓ
            </button>
          </div>
        ) : null}

        {appState === 'sleeping' ? (
          <button
            type="button"
            onClick={() => void handleWakeUp()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-5 text-lg font-semibold tracking-wide text-white shadow-[0_10px_25px_rgba(245,158,11,0.3)] transition-all active:scale-[0.98]"
          >
            <Sun size={22} strokeWidth={2.5} /> DESPERTÓ
          </button>
        ) : null}
      </div>
    </div>
  )
}
