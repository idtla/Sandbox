import { BarChart2, Clock, Home, PlusCircle, Settings } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSleepTracking } from '../context/sleepTracking'

export function AppShell() {
  const { error, notice } = useSleepTracking()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-1.5 transition-colors ${
      isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
    }`

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md select-none flex-col overflow-hidden bg-[#F4F7FB] pb-24 font-sans text-slate-800 shadow-2xl">
      <div className="animate-blob pointer-events-none absolute left-[-20%] top-[-10%] h-72 w-72 rounded-full bg-blue-100 opacity-50 mix-blend-multiply blur-3xl" />
      <div className="animate-blob animation-delay-2000 pointer-events-none absolute right-[-10%] top-[20%] h-72 w-72 rounded-full bg-indigo-100 opacity-50 mix-blend-multiply blur-3xl" />

      {error ? (
        <div className="z-20 mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="z-20 mx-6 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
          {notice}
        </div>
      ) : null}

      <Outlet />

      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex h-24 max-w-md items-start justify-around border-t border-slate-100 bg-white/80 px-3 pb-6 pt-4 backdrop-blur-xl">
        <NavLink to="/" className={linkClass} end>
          {({ isActive }) => (
            <>
              <div className={isActive ? 'rounded-xl bg-blue-50 p-1.5' : 'p-1.5'}>
                <Home size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-bold tracking-wide">Inicio</span>
            </>
          )}
        </NavLink>
        <NavLink to="/medir" className={linkClass}>
          {({ isActive }) => (
            <>
              <div className={isActive ? 'rounded-xl bg-blue-50 p-1.5' : 'p-1.5'}>
                <Clock size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-bold tracking-wide">Medir</span>
            </>
          )}
        </NavLink>
        <NavLink to="/analiticas" className={linkClass}>
          {({ isActive }) => (
            <>
              <div className={isActive ? 'rounded-xl bg-blue-50 p-1.5' : 'p-1.5'}>
                <BarChart2 size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-bold tracking-wide">Análisis</span>
            </>
          )}
        </NavLink>
        <NavLink to="/ajustes" className={linkClass}>
          {({ isActive }) => (
            <>
              <div className={isActive ? 'rounded-xl bg-blue-50 p-1.5' : 'p-1.5'}>
                <Settings size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-bold tracking-wide">Ajustes</span>
            </>
          )}
        </NavLink>
      </div>

      <NavLink
        to="/registro-manual"
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-[0_8px_32px_rgba(37,99,235,0.35)] transition-transform hover:scale-105 active:scale-95"
        aria-label="Añadir sesión manual"
      >
        <PlusCircle size={28} strokeWidth={1.5} />
      </NavLink>
    </div>
  )
}
