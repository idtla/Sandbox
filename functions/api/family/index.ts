import { json } from '../../lib/auth'
import type { PagesEnv } from '../../lib/auth'
import { requireSession } from '../../lib/session'

type Ctx = EventContext<PagesEnv, any, Record<string, unknown>>

export async function onRequestGet(context: Ctx) {
  const session = await requireSession(context.request, context.env)
  if (session instanceof Response) return session

  const base = await context.env.DB.prepare(
    'SELECT family_id FROM family_members WHERE user_id = ? LIMIT 1',
  )
    .bind(session.userId)
    .first<{ family_id: string }>()

  if (!base?.family_id) return json({ members: [], invites: [] })

  const members = await context.env.DB.prepare(
    `SELECT fm.user_id, u.email, u.full_name, fm.role, fm.status
     FROM family_members fm
     JOIN app_users u ON u.id = fm.user_id
     WHERE fm.family_id = ?
     ORDER BY fm.role ASC, u.created_at ASC`,
  )
    .bind(base.family_id)
    .all()

  const invites = await context.env.DB.prepare(
    `SELECT id, invite_code, invite_email, role, status
     FROM family_invites
     WHERE family_id = ? AND status = ?
     ORDER BY created_at DESC`,
  )
    .bind(base.family_id, 'pending')
    .all()

  return json({
    members: members.results ?? [],
    invites: invites.results ?? [],
  })
}
