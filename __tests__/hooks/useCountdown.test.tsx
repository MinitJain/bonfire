import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountdown } from '@/hooks/useCountdown'
import type { BonfireState } from '@/types'

const base: BonfireState = {
  id: 'abc12345', join_code: 'ABCDEF', status: 'active', created_at: '',
  phase: 'focus', running: true, started_at: 0, time_left: 60,
  focus_duration: 60, short_duration: 300, long_duration: 900, rounds_before_long: 4,
  session_mode: 'focus', initiator_id: null, initiator_name: 'Quiet Fox', name: null,
  current_round: 1, completed_pomodoros: 0, last_active_at: '',
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => vi.useRealTimers())

describe('useCountdown', () => {
  it('counts down from the server anchor', () => {
    const { result } = renderHook(() => useCountdown({ ...base, started_at: 1_000_000 - 20_000 }, () => {}))
    expect(result.current).toBe(40)
  })

  it('asks the server again if the phase is still at zero', () => {
    const onExpire = vi.fn()
    renderHook(() => useCountdown({ ...base, started_at: 1_000_000 - 61_000 }, onExpire))
    act(() => { vi.advanceTimersByTime(500) })
    expect(onExpire).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(onExpire).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(1500) })
    expect(onExpire).toHaveBeenCalledTimes(2)
  })

  it('stops asking once the server moves on', () => {
    const onExpire = vi.fn()
    const { rerender } = renderHook(({ s }) => useCountdown(s, onExpire), {
      initialProps: { s: { ...base, started_at: 1_000_000 - 61_000 } as BonfireState },
    })
    act(() => { vi.advanceTimersByTime(500) })
    rerender({ s: { ...base, phase: 'short', running: false, started_at: null, time_left: 300 } })
    act(() => { vi.advanceTimersByTime(5000) })
    expect(onExpire).toHaveBeenCalledTimes(1)
  })
})
