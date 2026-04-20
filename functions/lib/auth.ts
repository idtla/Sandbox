export interface PagesEnv {
  DB: D1Database
  API_SECRET: string
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export function unauthorized(): Response {
  return json({ error: 'No autorizado' }, 401)
}

function normalizeSecret(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function authorize(request: Request, env: PagesEnv): boolean {
  const secret = normalizeSecret(env.API_SECRET)
  if (!secret) return false
  const auth = normalizeSecret(request.headers.get('Authorization'))
  const apiKey = normalizeSecret(request.headers.get('X-API-Key'))
  if (auth.startsWith('Bearer ')) {
    return normalizeSecret(auth.slice(7)) === secret
  }
  if (apiKey) return apiKey === secret
  return false
}
