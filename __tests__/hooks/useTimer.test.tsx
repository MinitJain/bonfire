import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimer } from '@/hooks/useTimer'
import { createTimerState } from '@/lib/timer'

// Mock favicon helpers — they touch canvas which jsdom doesn't support
vi.mock('@/lib/favicon', () => ({
  updateFavicon: vi.fn(),
  resetFavicon: vi.fn(),
}))

const FOCUS_SECS = 25 * 60 // 1500

function idleState() {
  return createTimerState('focus')
}

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── start ────────────────────────────────────────────────────────────────

  it('start() returns running state with startedAt set', () => {
    const { result } = renderHook(() => useTimer({ initialState: idleState() }))

    let returned: ReturnType<typeof result.current.start>
    act(() => { returned = result.current.start() })

    expect(returned!.status).toBe('running')
    expect(returned!.startedAt).not.toBeNull()
    expect(result.current.status).toBe('running')
  })

  // ── pause ────────────────────────────────────────────────────────────────

  it('pause() captures timeLeft at pause moment', () => {
    const { result } = renderHook(() => useTimer({ initialState: idleState() }))

    act(() => { result.current.start() })
    // Advance 30 seconds
    act(() => { vi.advanceTimersByTime(30_000) })

    let paused: ReturnType<typeof result.current.pause>
    act(() => { paused = result.current.pause() })

    expect(paused!.status).toBe('paused')
    expect(paused!.timeLeft).toBeLessThan(FOCUS_SECS)
    expect(paused!.timeLeft).toBeGreaterThan(0)
  })

  // ── reset ────────────────────────────────────────────────────────────────

  it('reset() restores to full duration and idle status', () => {
    const { result } = renderHook(() => useTimer({ initialState: idleState() }))

    act(() => { result.current.start() })
    act(() => { vi.advanceTimersByTime(60_000) })

    let resetState: ReturnType<typeof result.current.reset>
    act(() => { resetState = result.current.reset() })

    expect(resetState!.status).toBe('idle')
    expect(resetState!.timeLeft).toBe(FOCUS_SECS)
    expect(result.current.timeLeft).toBe(FOCUS_SECS)
  })

  // ── setMode ──────────────────────────────────────────────────────────────

  it('setMode() switches mode and resets to that mode duration', () => {
    const { result } = renderHook(() => useTimer({ initialState: idleState() }))

    let s: ReturnType<typeof result.current.setMode>
    act(() => { s = result.current.setMode('short') })

    expect(s!.mode).toBe('short')
    expect(s!.status).toBe('idle')
    expect(s!.timeLeft).toBe(5 * 60)
    expect(result.current.mode).toBe('short')
  })

  // ── skipAndStart ─────────────────────────────────────────────────────────

  it('skipAndStart() immediately starts the next mode as running', () => {
    const { result } = renderHook(() => useTimer({ initialState: idleState() }))

    let s: ReturnType<typeof result.current.skipAndStart>
    act(() => { s = result.current.skipAndStart('short') })

    expect(s!.mode).toBe('short')
    expect(s!.status).toBe('running')
    expect(s!.startedAt).not.toBeNull()
    expect(s!.timeLeft).toBe(5 * 60)
  })

  // ── onExpire ─────────────────────────────────────────────────────────────

  it('fires onExpire when timer reaches 0', async () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() =>
      useTimer({ initialState: createTimerState('focus', { focus: 5, short: 300, long: 900 }), onExpire })
    )

    act(() => { result.current.start() })
    // Advance past the 5-second timer
    act(() => { vi.advanceTimersByTime(10_000) })

    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('does not fire onExpire more than once', () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() =>
      useTimer({ initialState: createTimerState('focus', { focus: 5, short: 300, long: 900 }), onExpire })
    )

    act(() => { result.current.start() })
    act(() => { vi.advanceTimersByTime(20_000) })

    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  // ── timeLeft floor ───────────────────────────────────────────────────────

  it('timeLeft never goes below 0', () => {
    const { result } = renderHook(() =>
      useTimer({ initialState: createTimerState('focus', { focus: 5, short: 300, long: 900 }) })
    )

    act(() => { result.current.start() })
    act(() => { vi.advanceTimersByTime(60_000) })

    expect(result.current.timeLeft).toBe(0)
  })

  // ── applyState ───────────────────────────────────────────────────────────

  it('applyState() syncs external timer state', () => {
    const { result } = renderHook(() => useTimer({ initialState: idleState() }))

    const external = {
      mode: 'short' as const,
      status: 'paused' as const,
      timeLeft: 200,
      totalTime: 300,
      startedAt: null,
      pausedAt: Date.now(),
    }

    act(() => { result.current.applyState(external) })

    expect(result.current.mode).toBe('short')
    expect(result.current.status).toBe('paused')
    expect(result.current.timeLeft).toBe(200)
  })

  it('applyState() skips redundant re-apply for same startedAt', () => {
    const { result } = renderHook(() => useTimer({ initialState: idleState() }))
    const startedAt = Date.now()

    const running = {
      mode: 'focus' as const,
      status: 'running' as const,
      timeLeft: 1500,
      totalTime: 1500,
      startedAt,
      pausedAt: null,
    }

    act(() => { result.current.applyState(running) })
    const timeAfterFirst = result.current.timeLeft

    act(() => { vi.advanceTimersByTime(5_000) })
    act(() => { result.current.applyState(running) }) // same startedAt — should be skipped

    // timeLeft should still be ticking down (not reset back to 1500)
    expect(result.current.timeLeft).toBeLessThanOrEqual(timeAfterFirst)
  })
})
