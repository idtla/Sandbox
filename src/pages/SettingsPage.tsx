import { Link } from 'react-router-dom'
import { useSleepTracking } from '../context/sleepTracking'

export function SettingsPage() {
  const {
    apiKeyInput,
    setApiKeyInput,
    handleSaveApiKey,
    parentName,
    setParentName,
    saveParentName,
    exportBackup,
    importBackup,
    clearAllEpisodes,
  } = useSleepTracking()

  return (
    <div className="animate-in fade-in z-10 flex min-h-[calc(100vh-6rem)] w-full flex-col space-y-6 p-6 pt-8 duration-300">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800">Ajustes</h1>
        <p className="mt-1 text-xs text-slate-500">Configuración local y familia</p>
      </div>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-wide text-slate-500">Clave API</span>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Pega aquí API_SECRET"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none ring-blue-300 focus:ring-2"
          />
        </label>
        <button
          type="button"
          onClick={handleSaveApiKey}
          className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-semibold tracking-wide text-white shadow-[0_10px_25px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98]"
        >
          GUARDAR CLAVE
        </button>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-wide text-slate-500">Padre / cuidador por defecto</span>
          <input
            type="text"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            placeholder="Se usa en formularios de registro"
            maxLength={120}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none ring-blue-300 focus:ring-2"
          />
        </label>
        <button
          type="button"
          onClick={saveParentName}
          className="w-full rounded-2xl border border-slate-200 bg-white py-4 text-sm font-semibold text-slate-800 transition-all active:scale-[0.98]"
        >
          Guardar nombre
        </button>
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h2 className="text-sm font-semibold text-slate-800">Cuenta y familia</h2>
        <p className="text-xs text-slate-500">
          El acceso con código OTP llegará en una próxima versión. Mientras tanto puedes usar la app con la clave API.
        </p>
        <Link
          to="/acceso"
          className="block rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-blue-600 hover:bg-slate-100"
        >
          Pantalla de acceso (vista previa)
        </Link>
        <Link
          to="/familia"
          className="block rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-100"
        >
          Gestión familiar
        </Link>
        <Link
          to="/registro"
          className="block rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Crear cuenta (vista previa)
        </Link>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h2 className="text-sm font-semibold text-slate-800">Copia de seguridad</h2>
        <p className="text-xs text-slate-500">Exporta o importa JSON con la misma clave API.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void exportBackup()}
            className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800"
          >
            Exportar JSON
          </button>
          <label className="flex flex-1 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800">
            Importar JSON
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importBackup(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-rose-100 bg-rose-50/50 p-6">
        <h2 className="text-sm font-semibold text-rose-900">Zona sensible</h2>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('¿Borrar todos los episodios en el servidor? No se puede deshacer.')) void clearAllEpisodes()
          }}
          className="w-full rounded-2xl bg-rose-600 py-4 text-sm font-semibold text-white"
        >
          Borrar todos los episodios
        </button>
      </section>
    </div>
  )
}
