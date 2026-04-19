import { authorize, json, unauthorized } from '../lib/auth'
import type { PagesEnv } from '../lib/auth'

type Ctx = EventContext<PagesEnv, any, Record<string, unknown>>

type EpisodeRow = {
  id: string
  created_at: number
  try_start_at: number
  asleep_at: number | null
  wake_at: number | null
  location: string
  source: string
  cancelled: number
}

export async function onRequest(context: Ctx) {
  const { request, env } = context
  if (!authorize(request, env)) return unauthorized()

  if (request.method === 'GET') {
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    let query = 'SELECT * FROM sleep_episodes WHERE 1=1'
    const params: (string | number)[] = []
    if (from) {
      query += ' AND try_start_at >= ?'
      params.push(Number(from))
    }
    if (to) {
      query += ' AND try_start_at <= ?'
      params.push(Number(to))
    }
    query += ' ORDER BY try_start_at DESC'
    const stmt = env.DB.prepare(query)
    const bound = params.length ? stmt.bind(...params) : stmt
    const { results } = await bound.all<EpisodeRow>()
    return json({ episodes: results ?? [] })
  }

  if (request.method === 'POST') {
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return json({ error: 'JSON inválido' }, 400)
    }

    const try_start_at = Number(body.try_start_at)
    const asleep_at =
      body.asleep_at === null || body.asleep_at === undefined
        ? null
        : Number(body.asleep_at)
    const wake_at =
      body.wake_at === null || body.wake_at === undefined ? null : Number(body.wake_at)
    const location = body.location
    const source = body.source
    const cancelled = Boolean(body.cancelled)
    const id =
      typeof body.id === 'string' && body.id.length > 0 ? body.id : crypto.randomUUID()
    const created_at =
      typeof body.created_at === 'number' && Number.isFinite(body.created_at)
        ? body.created_at
        : Date.now()

    if (!Number.isFinite(try_start_at)) {
      return json({ error: 'try_start_at inválido' }, 400)
    }
    if (location !== 'cuna' && location !== 'acunada') {
      return json({ error: 'location debe ser cuna o acunada' }, 400)
    }
    if (source !== 'timer' && source !== 'manual') {
      return json({ error: 'source debe ser timer o manual' }, 400)
    }

    if (!cancelled) {
      if (
        asleep_at === null ||
        wake_at === null ||
        !Number.isFinite(asleep_at) ||
        !Number.isFinite(wake_at)
      ) {
        return json({ error: 'asleep_at y wake_at son obligatorios si no está cancelado' }, 400)
      }
      if (wake_at <= asleep_at) {
        return json({ error: 'wake_at debe ser posterior a asleep_at' }, 400)
      }
    }

    const cancelledInt = cancelled ? 1 : 0

    await env.DB.prepare(
      `INSERT OR REPLACE INTO sleep_episodes (id, created_at, try_start_at, asleep_at, wake_at, location, source, cancelled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        created_at,
        try_start_at,
        cancelled ? null : asleep_at,
        cancelled ? null : wake_at,
        location,
        source,
        cancelledInt,
      )
      .run()

    return json({
      episode: {
        id,
        created_at,
        try_start_at,
        asleep_at: cancelled ? null : asleep_at,
        wake_at: cancelled ? null : wake_at,
        location,
        source,
        cancelled: cancelledInt,
      },
    })
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM sleep_episodes').run()
    return json({ ok: true })
  }

  return new Response('Method Not Allowed', { status: 405 })
}

