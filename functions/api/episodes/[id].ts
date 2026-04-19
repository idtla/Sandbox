import { authorize, json, unauthorized } from '../../lib/auth'
import type { PagesEnv } from '../../lib/auth'

type Ctx = EventContext<PagesEnv, 'id', { id: string }>

export async function onRequestDelete(context: Ctx) {
  const { request, env, params } = context
  if (!authorize(request, env)) return unauthorized()
  const id = params.id
  if (!id) return json({ error: 'Falta id' }, 400)
  await env.DB.prepare('DELETE FROM sleep_episodes WHERE id = ?').bind(id).run()
  return json({ ok: true })
}
