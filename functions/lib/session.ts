import { json } from './auth'
import type { PagesEnv } from './auth'

function bearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization')?.trim() ?? ''
  if (!auth.startsWith('Bearer ')) return null
  return auth.slice(7).trim() || null
}

export async function requireSession(
  request: Request,
  env: PagesEnv,
): Promise<{ userId: string } | Response> {
  const token = bearerToken(request)
  if (!token) return json({ error: 'Sesion no valida' }, 401)

  const now = Date.now()
  const row = await env.DB.prepare(
    `SELECT user_id as userId
     FROM auth_sessions
     WHERE token = ? AND expires_at > ?`,
  )
    .bind(token, now)
    .first<{ userId: string }>()

  if (!row?.userId) return json({ error: 'Sesion expirada' }, 401)
  return { userId: row.userId }
}
