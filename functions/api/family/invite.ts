import { json } from '../../lib/auth'
import type { PagesEnv } from '../../lib/auth'
import { requireSession } from '../../lib/session'

type Ctx = EventContext<PagesEnv, any, Record<string, unknown>>

function inviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 })
    .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
    .join('')
}

export async function onRequestPost(context: Ctx) {
  const { request, env } = context
  const session = await requireSession(request, env)
  if (session instanceof Response) return session

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'JSON invalido' }, 400)
  }

  const inviteEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!inviteEmail || !inviteEmail.includes('@')) return json({ error: 'Email invalido' }, 400)

  const base = await env.DB.prepare(
    'SELECT family_id FROM family_members WHERE user_id = ? AND role = ? LIMIT 1',
  )
    .bind(session.userId, 'owner')
    .first<{ family_id: string }>()
  if (!base?.family_id) return json({ error: 'Solo el propietario puede invitar' }, 403)

  const code = inviteCode()
  await env.DB.prepare(
    `INSERT INTO family_invites (id, family_id, invited_by, invite_email, invite_code, role, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(crypto.randomUUID(), base.family_id, session.userId, inviteEmail, code, 'caregiver', 'pending', Date.now())
    .run()

  return json({ inviteCode: code })
}
