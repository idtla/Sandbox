import { json } from '../../lib/auth'
import type { PagesEnv } from '../../lib/auth'

type Ctx = EventContext<PagesEnv, any, Record<string, unknown>>

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function randomDigits(length: number): string {
  const min = Math.pow(10, length - 1)
  const max = Math.pow(10, length) - 1
  return String(Math.floor(min + Math.random() * (max - min + 1)))
}

export async function onRequestPost(context: Ctx) {
  const { request, env } = context
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'JSON invalido' }, 400)
  }

  const email = normalizeEmail(body.email)
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : null
  const otpCase = typeof body.otpCase === 'string' ? body.otpCase : 'login'
  const inviteCode = normalizeCode(body.inviteCode)

  if (!email || !email.includes('@')) return json({ error: 'Email invalido' }, 400)
  if (!['login', 'register', 'invite'].includes(otpCase)) return json({ error: 'Caso OTP no valido' }, 400)
  if (otpCase === 'invite' && !inviteCode) return json({ error: 'Falta codigo de invitacion' }, 400)

  const user = await env.DB.prepare(
    'SELECT id FROM app_users WHERE email = ? LIMIT 1',
  )
    .bind(email)
    .first<{ id: string }>()

  if (otpCase === 'register' && user?.id) return json({ error: 'Ese email ya esta registrado' }, 409)
  if (otpCase === 'login' && !user?.id) return json({ error: 'No existe cuenta con ese email' }, 404)

  if (otpCase === 'invite') {
    const invite = await env.DB.prepare(
      'SELECT id FROM family_invites WHERE invite_code = ? AND status = ? LIMIT 1',
    )
      .bind(inviteCode, 'pending')
      .first<{ id: string }>()
    if (!invite?.id) return json({ error: 'Codigo de invitacion no valido o caducado' }, 404)
  }

  const challengeId = crypto.randomUUID()
  const code = env.OTP_DEBUG_CODE?.trim() || randomDigits(6)
  const now = Date.now()
  const expiresAt = now + 10 * 60 * 1000

  await env.DB.prepare(
    `INSERT INTO otp_challenges (id, email, full_name, otp_case, invite_code, code, attempts, created_at, expires_at, consumed_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)`,
  )
    .bind(challengeId, email, fullName, otpCase, inviteCode || null, code, now, expiresAt)
    .run()

  // Mientras no conectemos proveedor de email, lo devolvemos en cabecera para test manual.
  return new Response(
    JSON.stringify({
      challengeId,
      otpDigits: 6,
      devHint: 'Revisa la cabecera X-Debug-Otp en desarrollo.',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Debug-Otp': code,
      },
    },
  )
}
