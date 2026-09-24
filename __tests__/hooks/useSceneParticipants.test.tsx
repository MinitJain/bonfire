import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSceneParticipants, LEAVE_ANIMATION_MS } from '@/hooks/useSceneParticipants'
import type { BonfireParticipant, SeatIndex } from '@/types'

function p(key: string, seat: SeatIndex): BonfireParticipant {
  return { key, username: key, joined_at: `2026-01-01T00:00:0${seat}.000Z`, is_initiator: false, seat }
}

describe('useSceneParticipants', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keeps a departing participant, flagged leaving, until the exit animation ends', () => {
    const a = p('a', 3)
    const b = p('b', 4)
    const { result, rerender } = renderHook(({ list }) => useSceneParticipants(list), {
      initialProps: { list: [a, b] },
    })
    expect(result.current.map(e => e.participant.key).sort()).toEqual(['a', 'b'])

    rerender({ list: [a] })
    const leaving = result.current.find(e => e.participant.key === 'b')
    expect(leaving?.leaving).toBe(true)
    expect(leaving?.seat).toBe(4)

    act(() => { vi.advanceTimersByTime(LEAVE_ANIMATION_MS + 10) })
    expect(result.current.map(e => e.participant.key)).toEqual(['a'])
  })

  it('someone who returns mid-exit is simply present again', () => {
    const a = p('a', 3)
    const { result, rerender } = renderHook(({ list }) => useSceneParticipants(list), {
      initialProps: { list: [a] },
    })
    rerender({ list: [] })
    expect(result.current[0]?.leaving).toBe(true)
    rerender({ list: [a] })
    expect(result.current).toHaveLength(1)
    expect(result.current[0].leaving).toBe(false)
    act(() => { vi.advanceTimersByTime(LEAVE_ANIMATION_MS + 10) })
    expect(result.current).toHaveLength(1)
  })

  it('a newcomer taking a departing seat replaces the ghost', () => {
    const { result, rerender } = renderHook(({ list }) => useSceneParticipants(list), {
      initialProps: { list: [p('a', 3)] },
    })
    rerender({ list: [p('c', 3)] })
    expect(result.current.map(e => e.participant.key)).toEqual(['c'])
  })
})
