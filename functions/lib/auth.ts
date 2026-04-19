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

export function authorize(request: Request, env: PagesEnv): boolean {
  const secret = env.API_SECRET
  if (!secret) return false
  const auth = request.headers.get('Authorization')
  const apiKey = request.headers.get('X-API-Key')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7) === secret
  }
  if (apiKey) return apiKey === secret
  return false
}
