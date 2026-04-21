import { ArrowLeft, Baby } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchFamilyData, inviteCaregiver, type FamilyInvite, type FamilyMember } from '../api/client'

export function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [invites, setInvites] = useState<FamilyInvite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [message, setMessage] = useState('')

  async function loadFamily() {
    try {
      const data = await fetchFamilyData()
      setMembers(data.members)
      setInvites(data.invites)
      setMessage('')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo cargar la familia')
    }
  }

  useEffect(() => {
    void loadFamily()
  }, [])

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
          <p className="text-sm leading-relaxed text-slate-600">Invita cuidadores y gestiona accesos sin cambiar el diseño.</p>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">Miembros actuales</h3>
          {members.map((member) => (
            <div key={member.user_id} className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Baby size={28} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{member.full_name || member.email}</p>
                  <p className="text-xs text-slate-500">{member.role === 'owner' ? 'Cuidador principal' : 'Cuidador'}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-600">
                  {member.status}
                </span>
              </div>
            </div>
          ))}
          <form
            className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                const data = await inviteCaregiver({ email: inviteEmail })
                setInviteEmail('')
                await loadFamily()
                setMessage(`Invitacion enviada. Codigo: ${data.inviteCode}`)
              } catch (err) {
                setMessage(err instanceof Error ? err.message : 'No se pudo invitar')
              }
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Invitar por email</span>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="cuidador@email.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none ring-blue-300 focus:ring-2"
                required
              />
            </label>
            <button type="submit" className="mt-3 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white">
              + Invitar
            </button>
          </form>
          {invites.length > 0 ? (
            <div className="space-y-2 rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h4 className="text-sm font-semibold text-slate-800">Invitaciones pendientes</h4>
              {invites.map((invite) => (
                <p key={invite.id} className="text-xs text-slate-600">
                  {invite.invite_email} - codigo <span className="font-bold text-blue-600">{invite.invite_code}</span>
                </p>
              ))}
            </div>
          ) : null}
          {message ? <p className="text-xs text-slate-500">{message}</p> : null}
        </section>
      </main>
    </div>
  )
}
