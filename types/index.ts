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
  text: string
}
