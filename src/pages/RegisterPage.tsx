import { Bed } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { requestOtp, verifyOtp } from '../api/client'

export function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [step, setStep] = useState<'register' | 'otp'>('register')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f7f9fb] p-6">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-10%] top-[-10%] h-[50%] w-[50%] rounded-full bg-[#d3e4fe]/80 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[60%] w-[60%] rounded-full bg-[#7bd1fa]/40 blur-[120px]" />
      </div>

      <main className="z-10 flex w-full max-w-md flex-col gap-10">
        <header className="flex flex-col gap-4 text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_8px_32px_rgba(0,0,0,0.02)]">
            <Bed className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#2c3437] md:text-[3.5rem]">
            Crear cuenta
          </h1>
          <p className="px-4 text-lg font-medium leading-relaxed text-[#596064]">Registro con OTP y acceso por casos.</p>
        </header>

        {step === 'register' ? (
          <form
            className="flex flex-col gap-6 rounded-2xl bg-white p-8 shadow-[0_16px_48px_-12px_rgba(0,83,220,0.05)]"
            onSubmit={async (e) => {
              e.preventDefault()
              setLoading(true)
              setMessage('')
              try {
                const data = await requestOtp({ email, fullName, otpCase: 'register' })
                setChallengeId(data.challengeId)
                setStep('otp')
                setMessage('Te hemos enviado un OTP de 6 digitos.')
              } catch (err) {
                setMessage(err instanceof Error ? err.message : 'No se pudo iniciar el registro')
              } finally {
                setLoading(false)
              }
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#2c3437]">Nombre</span>
              <input
                type="text"
                className="rounded-xl bg-[#eaeff2] px-4 py-3 text-[#2c3437] outline-none ring-2 ring-transparent focus:ring-[#0053dc]/30"
                placeholder="Tu nombre"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#2c3437]">Email</span>
              <input
                type="email"
                className="rounded-xl bg-[#eaeff2] px-4 py-3 text-[#2c3437] outline-none ring-2 ring-transparent focus:ring-[#0053dc]/30"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-br from-[#0053dc] to-[#3e76fe] py-4 text-sm font-bold text-white"
            >
              {loading ? 'Enviando OTP...' : 'Registrarse'}
            </button>
          </form>
        ) : (
          <form
            className="flex flex-col gap-6 rounded-2xl bg-white p-8 shadow-[0_16px_48px_-12px_rgba(0,83,220,0.05)]"
            onSubmit={async (e) => {
              e.preventDefault()
              setLoading(true)
              setMessage('')
              try {
                await verifyOtp({ challengeId, code })
                setMessage('Registro completado y sesion iniciada.')
              } catch (err) {
                setMessage(err instanceof Error ? err.message : 'No se pudo verificar el OTP')
              } finally {
                setLoading(false)
              }
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#2c3437]">Codigo OTP</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="rounded-xl bg-[#eaeff2] px-4 py-3 text-center text-xl font-bold tracking-[0.3em] text-[#0053dc] outline-none ring-2 ring-transparent focus:ring-[#0053dc]/30"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-br from-[#0053dc] to-[#3e76fe] py-4 text-sm font-bold text-white"
            >
              {loading ? 'Verificando...' : 'Verificar y entrar'}
            </button>
            <button type="button" onClick={() => setStep('register')} className="text-sm font-semibold text-[#0053dc]">
              Volver
            </button>
          </form>
        )}

        {message ? <p className="text-center text-sm text-[#596064]">{message}</p> : null}

        <p className="text-center text-sm text-[#596064]">
          ¿Ya tienes cuenta?{' '}
          <Link to="/acceso" className="font-semibold text-[#0053dc]">
            Acceder
          </Link>
        </p>
        <Link to="/" className="text-center text-sm text-[#596064] underline-offset-4 hover:underline">
          Volver a la app
        </Link>
      </main>
    </div>
  )
}
