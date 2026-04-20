import { Bed, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'

/**
 * Vista alineada con flujo pantallas/acceso — el envío real OTP vendrá después.
 */
export function AccessPage() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#f7f9fb] p-6 text-[#2c3437]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[60vw] max-h-96 w-[60vw] rounded-full bg-[#0053dc]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50vw] max-h-80 w-[50vw] rounded-full bg-[#006787]/5 blur-[100px]" />
      </div>

      <main className="flex w-full max-w-md flex-col gap-10">
        <header className="flex flex-col items-center gap-4 text-center">
          <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_8px_32px_rgba(0,83,220,0.08)]">
            <Bed className="h-10 w-10 text-blue-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-[2.5rem] font-extrabold leading-tight tracking-tight text-[#2c3437]">
            Lullaby Metrics
          </h1>
          <p className="max-w-[280px] text-lg text-[#596064]">Seguimiento del sueño con calma, para noches más tranquilas.</p>
        </header>

        <section className="relative z-10 flex flex-col gap-8 rounded-2xl bg-white p-8 shadow-[0_16px_48px_-12px_rgba(0,83,220,0.05)]">
          {step === 'email' ? (
            <>
              <div>
                <h2 className="text-2xl font-bold text-[#2c3437]">Bienvenido/a</h2>
                <p className="mt-1 text-sm text-[#596064]">
                  Introduce tu email para recibir un código de acceso (activación próxima).
                </p>
              </div>
              <form
                className="flex flex-col gap-6"
                onSubmit={(e) => {
                  e.preventDefault()
                  setStep('code')
                }}
              >
                <label className="flex flex-col gap-2">
                  <span className="ml-1 text-sm font-semibold text-[#2c3437]">Email</span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full rounded-xl border-0 bg-[#eaeff2] py-3 pl-11 pr-4 text-[#2c3437] outline-none ring-2 ring-transparent transition focus:ring-[#0053dc]/30"
                    />
                  </div>
                </label>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-br from-[#0053dc] to-[#3e76fe] py-4 text-sm font-bold tracking-wide text-white shadow-[0_8px_24px_rgba(0,83,220,0.25)]"
                >
                  Continuar
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-bold text-[#2c3437]">Código de acceso</h2>
                <p className="mt-1 text-sm text-[#596064]">
                  Aquí irá la verificación OTP. De momento es solo maquetación.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="h-12 w-10 rounded-lg border border-slate-200 text-center text-lg font-semibold"
                    disabled
                    placeholder="·"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-sm font-semibold text-[#0053dc]"
              >
                Cambiar email
              </button>
            </div>
          )}

          <p className="text-center text-sm text-[#596064]">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="font-semibold text-[#0053dc]">
              Crear cuenta
            </Link>
          </p>
        </section>

        <Link
          to="/"
          className="text-center text-sm font-medium text-[#596064] underline-offset-4 hover:underline"
        >
          Entrar sin cuenta (solo API local)
        </Link>
      </main>
    </div>
  )
}
