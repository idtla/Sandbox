import { ArrowLeft, Baby } from 'lucide-react'
import { Link } from 'react-router-dom'

export function FamilyPage() {
  return (
    <div className="min-h-[calc(100vh-6rem)] bg-[#F4F7FB] pb-28 pt-4">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/60 bg-[#F4F7FB]/90 px-6 py-4 backdrop-blur-md">
        <Link
          to="/ajustes"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-blue-600">Familia</h1>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Baby size={20} />
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-8 px-6 pt-6">
        <section className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Círculo de cuidados</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Aquí podrás invitar a quien comparta el seguimiento del sueño. La gestión de miembros con permisos llegará con el
            login por OTP.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">Miembros actuales</h3>
          <div className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Baby size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">Tú (principal)</p>
                <p className="text-xs text-slate-500">Este dispositivo usa la clave API en Ajustes</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-600">
                Activo
              </span>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-2xl border border-dashed border-slate-300 bg-white/50 py-4 text-sm font-semibold text-slate-400"
          >
            + Invitar (próximamente)
          </button>
        </section>
      </main>
    </div>
  )
}
