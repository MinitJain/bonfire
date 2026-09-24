export type TimerMode = 'focus' | 'short' | 'long'
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished'
export type SessionStatus = 'waiting' | 'active' | 'ended'

export interface TimerState {
  mode: TimerMode
  status: TimerStatus
  timeLeft: number // seconds
  totalTime: number // seconds
  startedAt: number | null // unix ms
  pausedAt: number | null // unix ms
  focusCount?: number // included in broadcasts so watchers stay in sync
}

export interface TimerSettings {
  focus: number   // minutes
  short: number   // minutes
  long: number    // minutes
  rounds: number
  allowGuestShare?: boolean
  autoStartBreaks?: boolean
  autoStartPomodoros?: boolean
}

/**
 * Maps to the actual `sessions` table schema:
 * id, host_id, host_name, title, status, mode, time_left, total_time,
 * running, pomos_done, settings, updated_at, created_at
 */
export interface Session {
  id: string
  host_id: string | null
  host_name: string
  title: string | null
  status: SessionStatus
  mode: TimerMode
  time_left: number
  total_time: number
  running: boolean
  pomos_done: number | null
  settings: TimerSettings | null
  jam_mode: boolean
  session_mode: 'host' | 'jam' | 'solo'
  is_public: boolean
  updated_at: string
  created_at: string
}

export interface Participant {
  user_id: string
  username: string | null
  avatar_url: string | null
  joined_at: string
  is_host: boolean
}

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  total_pomodoros: number
  total_focus_minutes: number
  current_streak: number
  longest_streak: number
  last_active_date: string | null  // YYYY-MM-DD, set to client's local date on each pomodoro
  created_at: string
}

export interface PomodoroLog {
  id: string
  user_id: string
  session_id: string | null
  duration_minutes: number
  completed_at: string
}

export interface BroadcastTimerPayload {
  type: 'timer_update'
  timer_state: TimerState
}

export interface BroadcastParticipantPayload {
  type: 'participant_join' | 'participant_leave'
  participant: Participant
}

export type BroadcastPayload = BroadcastTimerPayload | BroadcastParticipantPayload

export interface ActivityItem {
  id: string
  text: string
}

export interface BroadcastActivityPayload {
  type: 'activity'
  text: string
}

export interface SettingsChangeRequest {
  requester_id: string
  requester_name: string | null
  focus: number
  short: number
  long: number
  rounds: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
}

export interface SettingsChangeResponse {
  requester_id: string
  accepted: boolean
  /** Present when accepted=true so watchers can apply the new settings locally */
  settings?: {
    focus: number
    short: number
    long: number
    rounds: number
    autoStartBreaks: boolean
    autoStartPomodoros: boolean
  }
}

// ─── Bonfire v2 Types ─────────────────────────────────────────

export type BonfireStatus = 'active' | 'ended'
export type BonfirePhase = 'focus' | 'short' | 'long'
export type BonfireMode = 'focus' | 'jam'

/**
 * Authoritative bonfire state as clients see it.
 * initiator_token is deliberately absent: it is never client-visible.
 */
export interface BonfireState {
  id: string
  join_code: string
  status: BonfireStatus
  created_at: string
  phase: BonfirePhase
  running: boolean
  started_at: number | null
  time_left: number
  focus_duration: number
  short_duration: number
  long_duration: number
  rounds_before_long: number
  session_mode: BonfireMode
  initiator_id: string | null
  initiator_name: string
  /** Optional creator-set Bonfire name, max 40 characters */
  name: string | null
  current_round: number
  completed_pomodoros: number
  last_active_at: string
}

/** create_bonfire result: the only place the creator receives the token */
export interface CreatedBonfire extends BonfireState {
  initiator_token: string
}

/** Seat index around the fire: 0 top, 1 upper-left, 2 upper-right, 3 lower-left, 4 lower-right, 5 bottom */
export type SeatIndex = 0 | 1 | 2 | 3 | 4 | 5

/** Presence state for a participant in a bonfire */
export interface BonfireParticipant {
  key: string
  username: string | null
  joined_at: string
  is_initiator: boolean
  seat: SeatIndex | null
}
