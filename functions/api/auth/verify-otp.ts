import { json } from '../../lib/auth'
import type { PagesEnv } from '../../lib/auth'

type Ctx = EventContext<PagesEnv, any, Record<string, unknown>>

type ChallengeRow = {
  id: string
  email: string
  full_name: string | null
  otp_case: 'login' | 'register' | 'invite'
  invite_code: string | null
  code: string
  attempts: number
  expires_at: number
  consumed_at: number | null
}

export async function onRequestPost(context: Ctx) {
  const { request, env } = context
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'JSON invalido' }, 400)
  }

  const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!challengeId || !code) return json({ error: 'Faltan challengeId o code' }, 400)

  const challenge = await env.DB.prepare('SELECT * FROM otp_challenges WHERE id = ? LIMIT 1')
    .bind(challengeId)
    .first<ChallengeRow>()

  if (!challenge?.id) return json({ error: 'OTP no encontrado' }, 404)
  if (challenge.consumed_at) return json({ error: 'OTP ya usado' }, 409)
  if (challenge.expires_at < Date.now()) return json({ error: 'OTP caducado' }, 410)
  if (challenge.attempts >= 5) return json({ error: 'Demasiados intentos' }, 429)

  if (challenge.code !== code) {
    await env.DB.prepare('UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?')
      .bind(challenge.id)
      .run()
    return json({ error: 'Codigo OTP incorrecto' }, 401)
  }

  let user = await env.DB.prepare('SELECT id, email, full_name FROM app_users WHERE email = ? LIMIT 1')
    .bind(challenge.email)
    .first<{ id: string; email: string; full_name: string | null }>()

  if (!user?.id) {
    const userId = crypto.randomUUID()
    await env.DB.prepare(
      'INSERT INTO app_users (id, email, full_name, created_at) VALUES (?, ?, ?, ?)',
    )
      .bind(userId, challenge.email, challenge.full_name, Date.now())
      .run()
    user = { id: userId, email: challenge.email, full_name: challenge.full_name }
  }

  const ownerFamily = await env.DB.prepare(
    'SELECT family_id FROM family_members WHERE user_id = ? LIMIT 1',
  )
    .bind(user.id)
    .first<{ family_id: string }>()

  let familyId = ownerFamily?.family_id ?? null

  if (!familyId) {
    familyId = crypto.randomUUID()
    await env.DB.prepare('INSERT INTO families (id, created_by, created_at) VALUES (?, ?, ?)')
      .bind(familyId, user.id, Date.now())
      .run()
    await env.DB.prepare(
      'INSERT INTO family_members (family_id, user_id, role, status, created_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(familyId, user.id, 'owner', 'active', Date.now())
      .run()
  }

  if (challenge.otp_case === 'invite' && challenge.invite_code) {
    const invite = await env.DB.prepare(
      'SELECT id, family_id FROM family_invites WHERE invite_code = ? AND status = ? LIMIT 1',
    )
      .bind(challenge.invite_code, 'pending')
      .first<{ id: string; family_id: string }>()

    if (!invite?.id) return json({ error: 'Invitacion no disponible' }, 409)

    await env.DB.prepare(
      `INSERT OR REPLACE INTO family_members (family_id, user_id, role, status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(invite.family_id, user.id, 'caregiver', 'active', Date.now())
      .run()

    await env.DB.prepare('UPDATE family_invites SET status = ?, accepted_by = ? WHERE id = ?')
      .bind('accepted', user.id, invite.id)
      .run()
  }

  await env.DB.prepare('UPDATE otp_challenges SET consumed_at = ? WHERE id = ?')
    .bind(Date.now(), challenge.id)
    .run()

  const token = crypto.randomUUID()
  await env.DB.prepare(
    'INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  )
    .bind(token, user.id, Date.now(), Date.now() + 30 * 24 * 60 * 60 * 1000)
    .run()

  return json({
    token,
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
  })
}
