import type { Session, TimerMode, TimerState } from '@/types'

// Timer durations in seconds
export const TIMER_DURATIONS = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
}

/**
 * Given a timer state, compute the current timeLeft accounting for elapsed time.
 * This is clock-based to avoid drift across clients.
 */
export function computeTimeLeft(state: TimerState): number {
  if (state.status === 'idle' || state.status === 'finished') {
    return state.timeLeft
  }

  if (state.status === 'paused') {
    return state.timeLeft
  }

  // status === 'running'
  if (state.startedAt === null) {
    return state.timeLeft
  }

  const now = Date.now()
  const elapsed = Math.floor((now - state.startedAt) / 1000)
  const computed = state.timeLeft - elapsed

  return Math.max(0, computed)
}

/**
 * Returns true if the timer has expired.
 */
export function isTimerExpired(state: TimerState): boolean {
  if (state.status === 'finished') return true
  if (state.status !== 'running') return false
  return computeTimeLeft(state) <= 0
}

/**
 * Create initial timer state for a given mode.
 */
export function createTimerState(mode: TimerMode, durations = TIMER_DURATIONS): TimerState {
  return {
    mode,
    status: 'idle',
    timeLeft: durations[mode],
    totalTime: durations[mode],
    startedAt: null,
    pausedAt: null,
  }
}

/**
 * Format seconds into MM:SS string.
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Convert a DB Session row into a local TimerState object.
 * The DB stores flat columns (mode, time_left, total_time, running) which we
 * reconstruct into the richer TimerState used by the client hooks.
 */
export function sessionToTimerState(session: Session): TimerState {
  const status: TimerState['status'] = session.running
    ? 'running'
    : session.time_left <= 0
      ? 'finished'
      : 'idle'

  return {
    mode: session.mode,
    status,
    timeLeft: session.time_left,
    totalTime: session.total_time > 0 ? session.total_time : TIMER_DURATIONS[session.mode],
    // When running we synthesise a startedAt so computeTimeLeft works correctly.
    // We do NOT store a real wall-clock startedAt in the DB (it only stores
    // time_left), so treat time_left as accurate at the moment we loaded the row
    // and set startedAt = now - 0 (i.e. count down from time_left right now).
    startedAt: status === 'running' ? Date.now() : null,
    pausedAt: null,
  }
}

/**
 * Compute progress (0 to 1) for the timer ring.
 */
export function computeProgress(state: TimerState): number {
  const total = state.totalTime
  const left = computeTimeLeft(state)
  return Math.max(0, Math.min(1, left / total))
}
