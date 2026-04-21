import type { CreateEpisodePayload, SleepEpisode } from '../types/episode'

const RECORDED_BY_DEFAULT_KEY = 'bebe_sueno_recorded_by_default'
const SESSION_TOKEN_KEY = 'bebe_sueno_session_token'

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

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, token.trim())
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY)
}

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

function sessionHeaders(): HeadersInit {
  const token = getSessionToken()
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function handle<T>(r: Response): Promise<T> {
  const text = await r.text()
  if (r.status === 401) {
    throw new Error('No autorizado: revisa tu acceso en Cloudflare Zero Trust')
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

export type OtpCase = 'login' | 'register' | 'invite'

export async function requestOtp(payload: {
  email: string
  fullName?: string
  otpCase: OtpCase
  inviteCode?: string
}): Promise<{ challengeId: string; otpDigits: number }> {
  const r = await fetch('/api/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handle<{ challengeId: string; otpDigits: number }>(r)
}

export async function verifyOtp(payload: {
  challengeId: string
  code: string
}): Promise<{ token: string; userId: string; email: string; fullName: string | null }> {
  const r = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await handle<{ token: string; userId: string; email: string; fullName: string | null }>(r)
  setSessionToken(data.token)
  return data
}

export type FamilyMember = {
  user_id: string
  email: string
  full_name: string | null
  role: 'owner' | 'caregiver'
  status: 'active' | 'pending'
}

export type FamilyInvite = {
  id: string
  invite_code: string
  invite_email: string
  role: 'caregiver'
  status: 'pending' | 'accepted'
}

export async function fetchFamilyData(): Promise<{ members: FamilyMember[]; invites: FamilyInvite[] }> {
  const r = await fetch('/api/family', { headers: sessionHeaders() })
  return handle<{ members: FamilyMember[]; invites: FamilyInvite[] }>(r)
}

export async function inviteCaregiver(payload: { email: string }): Promise<{ inviteCode: string }> {
  const r = await fetch('/api/family/invite', {
    method: 'POST',
    headers: sessionHeaders(),
    body: JSON.stringify(payload),
  })
  return handle<{ inviteCode: string }>(r)
}
