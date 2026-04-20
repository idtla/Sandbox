export type SleepLocation = 'cuna' | 'acunada'
export type SleepSource = 'timer' | 'manual'

export interface SleepEpisode {
  id: string
  created_at: number
  try_start_at: number
  asleep_at: number | null
  wake_at: number | null
  location: SleepLocation
  source: SleepSource
  cancelled: number
  /** Padre, madre u otro cuidador que registró el episodio */
  recorded_by?: string | null
}

export interface CreateEpisodePayload {
  id?: string
  created_at?: number
  try_start_at: number
  asleep_at: number | null
  wake_at: number | null
  location: SleepLocation
  source: SleepSource
  cancelled?: boolean
  recorded_by?: string | null
}
