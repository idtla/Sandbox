import { MinusCircle, PlusCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SegmentedControl } from '../components/SleepUi'
import { useSleepTracking } from '../context/sleepTracking'
import type { Method } from '../context/sleepTracking'

function methodFromSeg(v: string): Method {
  return v === 'Acunada' ? 'Acunada' : 'En cuna'
}

export function ManualEntryPage() {
  const navigate = useNavigate()
  const {
    caregiver,
    setCaregiver,
    method,
    setMethod,
    manualTTS,
    setManualTTS,
    manualDuration,
    setManualDuration,
    handleSaveManual,
  } = useSleepTracking()

  const onSave = async () => {
    const ok = await handleSaveManual()
    if (ok) navigate('/')
  }

  return (
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
            onChange={(v) => setMethod(methodFromSeg(v))}
          />
        </div>
        <div className="border-t border-slate-100 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Tiempo en dormirse</span>
            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-1.5">
              <button
                type="button"
                onClick={() => setManualTTS(Math.max(1, manualTTS - 5))}
                className="rounded-xl bg-white p-2 text-blue-500 shadow-sm"
              >
                <MinusCircle size={20} strokeWidth={2} />
              </button>
              <span className="w-12 text-center text-xl font-bold text-slate-800">{manualTTS}</span>
              <button
                type="button"
                onClick={() => setManualTTS(manualTTS + 5)}
                className="rounded-xl bg-white p-2 text-blue-500 shadow-sm"
              >
                <PlusCircle size={20} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Tiempo durmiendo</span>
            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-1.5">
              <button
                type="button"
                onClick={() => setManualDuration(Math.max(10, manualDuration - 10))}
                className="rounded-xl bg-white p-2 text-blue-500 shadow-sm"
              >
                <MinusCircle size={20} strokeWidth={2} />
              </button>
              <span className="w-12 text-center text-xl font-bold text-slate-800">{manualDuration}</span>
              <button
                type="button"
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
        type="button"
        onClick={() => void onSave()}
        className="mt-auto w-full rounded-2xl bg-slate-800 py-5 text-lg font-semibold tracking-wide text-white shadow-lg transition-all active:scale-[0.98]"
      >
        GUARDAR REGISTRO
      </button>
    </div>
  )
}
