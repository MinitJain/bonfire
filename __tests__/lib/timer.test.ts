import { describe, it, expect } from 'vitest'
import {
  computeTimeLeft,
  isTimerExpired,
  formatTime,
  createTimerState,
  sessionToTimerState,
  computeProgress,
  TIMER_DURATIONS,
} from '@/lib/timer'
import type { TimerState } from '@/types'

// Helper to build a minimal TimerState
function state(overrides: Partial<TimerState>): TimerState {
  return {
    mode: 'focus',
    status: 'idle',
    timeLeft: 1500,
    totalTime: 1500,
    startedAt: null,
    pausedAt: null,
    ...overrides,
  }
}

// Helper to build a minimal Session row
function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-id',
    host_id: null,
    host_name: 'host',
    title: null,
    status: 'active',
    mode: 'focus',
    time_left: 900,
    total_time: 1500,
    running: false,
    pomos_done: 0,
    settings: null,
    jam_mode: false,
    session_mode: 'host',
    is_public: false,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ─── computeTimeLeft ──────────────────────────────────────────────────────────

describe('computeTimeLeft', () => {
  it('returns timeLeft as-is for idle', () => {
    expect(computeTimeLeft(state({ status: 'idle', timeLeft: 1500 }))).toBe(1500)
  })

  it('returns timeLeft as-is for paused', () => {
    expect(computeTimeLeft(state({ status: 'paused', timeLeft: 900 }))).toBe(900)
  })

  it('returns timeLeft as-is for finished', () => {
    expect(computeTimeLeft(state({ status: 'finished', timeLeft: 0 }))).toBe(0)
  })

  it('returns timeLeft when running but startedAt is null', () => {
    expect(computeTimeLeft(state({ status: 'running', startedAt: null }))).toBe(1500)
  })

  it('deducts elapsed seconds when running', () => {
    const startedAt = Date.now() - 10_000 // 10s ago
    expect(computeTimeLeft(state({ status: 'running', timeLeft: 1500, startedAt }))).toBe(1490)
  })

  it('clamps to 0 when elapsed exceeds timeLeft', () => {
    const startedAt = Date.now() - 2_000_000 // 2000s elapsed > 1500s timeLeft
    expect(computeTimeLeft(state({ status: 'running', timeLeft: 1500, startedAt }))).toBe(0)
  })
})

// ─── isTimerExpired ───────────────────────────────────────────────────────────

describe('isTimerExpired', () => {
  it('returns true for finished', () => {
    expect(isTimerExpired(state({ status: 'finished', timeLeft: 0 }))).toBe(true)
  })

  it('returns false for idle', () => {
    expect(isTimerExpired(state({ status: 'idle' }))).toBe(false)
  })

  it('returns false for paused with time remaining', () => {
    expect(isTimerExpired(state({ status: 'paused', timeLeft: 900 }))).toBe(false)
  })

  it('returns true for running with all time elapsed', () => {
    const startedAt = Date.now() - 2_000_000 // 2000s elapsed > 1500s timeLeft
    expect(isTimerExpired(state({ status: 'running', timeLeft: 1500, startedAt }))).toBe(true)
  })

  it('returns false for running with time remaining', () => {
    const startedAt = Date.now() - 5_000 // 5s elapsed of 1500s
    expect(isTimerExpired(state({ status: 'running', timeLeft: 1500, startedAt }))).toBe(false)
  })
})

// ─── formatTime ───────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats 0 as 00:00', () => expect(formatTime(0)).toBe('00:00'))
  it('formats 65 as 01:05', () => expect(formatTime(65)).toBe('01:05'))
  it('formats 1500 as 25:00', () => expect(formatTime(1500)).toBe('25:00'))
  it('formats 3599 as 59:59', () => expect(formatTime(3599)).toBe('59:59'))
  it('clamps negative values to 00:00', () => expect(formatTime(-10)).toBe('00:00'))
})

// ─── createTimerState ─────────────────────────────────────────────────────────

describe('createTimerState', () => {
  it('creates idle focus state with default duration', () => {
    const s = createTimerState('focus')
    expect(s.status).toBe('idle')
    expect(s.mode).toBe('focus')
    expect(s.timeLeft).toBe(TIMER_DURATIONS.focus)
    expect(s.totalTime).toBe(TIMER_DURATIONS.focus)
    expect(s.startedAt).toBeNull()
    expect(s.pausedAt).toBeNull()
  })

  it('uses custom durations', () => {
    const s = createTimerState('short', { focus: 1500, short: 180, long: 900 })
    expect(s.timeLeft).toBe(180)
    expect(s.totalTime).toBe(180)
  })

  it('creates correct state for each mode', () => {
    expect(createTimerState('short').timeLeft).toBe(TIMER_DURATIONS.short)
    expect(createTimerState('long').timeLeft).toBe(TIMER_DURATIONS.long)
  })
})

// ─── sessionToTimerState ──────────────────────────────────────────────────────

describe('sessionToTimerState', () => {
  it('maps running=false + time_left>0 to idle', () => {
    const s = sessionToTimerState(session({ running: false, time_left: 900 }) as never)
    expect(s.status).toBe('idle')
    expect(s.startedAt).toBeNull()
  })

  it('maps running=true to running with startedAt set', () => {
    const s = sessionToTimerState(session({ running: true }) as never)
    expect(s.status).toBe('running')
    expect(s.startedAt).not.toBeNull()
  })

  it('maps time_left=0 + running=false to finished', () => {
    const s = sessionToTimerState(session({ time_left: 0, running: false }) as never)
    expect(s.status).toBe('finished')
  })

  it('falls back to default duration when total_time is 0', () => {
    const s = sessionToTimerState(session({ total_time: 0, mode: 'focus' }) as never)
    expect(s.totalTime).toBe(TIMER_DURATIONS.focus)
  })

  it('preserves timeLeft and mode', () => {
    const s = sessionToTimerState(session({ time_left: 750, mode: 'short' }) as never)
    expect(s.timeLeft).toBe(750)
    expect(s.mode).toBe('short')
  })
})

// ─── computeProgress ─────────────────────────────────────────────────────────

describe('computeProgress', () => {
  it('returns 1 when fully remaining', () => {
    expect(computeProgress(state({ timeLeft: 1500, totalTime: 1500 }))).toBe(1)
  })

  it('returns 0 when finished', () => {
    expect(computeProgress(state({ status: 'finished', timeLeft: 0, totalTime: 1500 }))).toBe(0)
  })

  it('returns 0.5 at halfway', () => {
    expect(computeProgress(state({ timeLeft: 750, totalTime: 1500 }))).toBeCloseTo(0.5)
  })

  it('returns 1 when totalTime is 0 (guard)', () => {
    expect(computeProgress(state({ timeLeft: 0, totalTime: 0 }))).toBe(1)
  })

  it('clamps to [0, 1]', () => {
    // timeLeft > totalTime should not exceed 1
    expect(computeProgress(state({ timeLeft: 2000, totalTime: 1500 }))).toBe(1)
  })
})
