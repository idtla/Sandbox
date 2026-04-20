import type { CreateEpisodePayload, SleepEpisode } from '../types/episode'

const STORAGE_KEY = 'bebe_sueno_api_key'
const RECORDED_BY_DEFAULT_KEY = 'bebe_sueno_recorded_by_default'

export function getDefaultRecordedBy(): string {
  try {
    return localStorage.getItem(RECORDED_BY_DEFAULT_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function setDefaultRecordedBy(value: string): void {
  try {
    localStorage.setItem(RECORDED_BY_DEFAULT_KEY, value.trim())
  } catch {
    /* ignore */
  }
}

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim())
}

function authHeaders(): HeadersInit {
  const key = getApiKey()
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (key) h.Authorization = `Bearer ${key}`
  return h
}

async function handle<T>(r: Response): Promise<T> {
  const text = await r.text()
  if (r.status === 401) {
    throw new Error('No autorizado: revisa la clave en Ajustes')
  }
  if (!r.ok) {
    let msg = text || r.statusText
    try {
      const j = JSON.parse(text) as { error?: string }
      if (j.error) msg = j.error
    } catch {
      /* respuesta no JSON */
    }
    throw new Error(msg)
  }
  if (!text) return {} as T
  return JSON.parse(text) as T
}

export async function fetchEpisodes(params?: {
  from?: number
  to?: number
}): Promise<SleepEpisode[]> {
  const q = new URLSearchParams()
  if (params?.from != null) q.set('from', String(params.from))
  if (params?.to != null) q.set('to', String(params.to))
  const qs = q.toString()
  const url = qs ? `/api/episodes?${qs}` : '/api/episodes'
  const r = await fetch(url, { headers: authHeaders() })
  const data = await handle<{ episodes: SleepEpisode[] }>(r)
  return data.episodes
}

export async function createEpisode(
  payload: CreateEpisodePayload,
): Promise<SleepEpisode> {
  const r = await fetch('/api/episodes', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await handle<{ episode: SleepEpisode }>(r)
  return data.episode
}

export async function deleteEpisode(id: string): Promise<void> {
  const r = await fetch(`/api/episodes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await handle<{ ok: boolean }>(r)
}

export async function deleteAllEpisodes(): Promise<void> {
  const r = await fetch('/api/episodes', {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await handle<{ ok: boolean }>(r)
}
