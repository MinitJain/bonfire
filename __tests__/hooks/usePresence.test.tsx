import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePresence, RETRACK_DELAY_MS } from '@/hooks/usePresence'
import type { BonfireChannel } from '@/hooks/useBonfireChannel'
import type { CharacterChoice } from '@/lib/characters'

const base: CharacterChoice = {
  build: 'neutral', skin: 0, hairStyle: 'short', hairColor: 0,
  outfit: 'sweater', outfitColor: 0, accessory: 'none',
}

function channel(): BonfireChannel {
  return {
    participants: [], isConnected: true, hasConnected: true,
    track: vi.fn(async () => {}), untrack: vi.fn(async () => {}),
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('usePresence', () => {
  it('tracks at once on arrival, then sends a burst of character changes as one update', () => {
    const ch = channel()
    const { rerender } = renderHook(
      ({ character }: { character: CharacterChoice }) =>
        usePresence({ channel: ch, self: { username: 'Ada', is_initiator: false, seat: 0, character } }),
      { initialProps: { character: base } },
    )
    act(() => { vi.advanceTimersByTime(0) })
    expect(ch.track).toHaveBeenCalledTimes(1)

    for (const hairStyle of ['long', 'bun', 'buzz', 'beanie'] as const) {
      rerender({ character: { ...base, hairStyle } })
      act(() => { vi.advanceTimersByTime(100) })
    }
    expect(ch.track).toHaveBeenCalledTimes(1)

    act(() => { vi.advanceTimersByTime(RETRACK_DELAY_MS) })
    expect(ch.track).toHaveBeenCalledTimes(2)
    expect(ch.track).toHaveBeenLastCalledWith(expect.objectContaining({ character: { ...base, hairStyle: 'beanie' } }))
  })

  it('does not re-track for an equal but re-created choice', () => {
    const ch = channel()
    const { rerender } = renderHook(
      ({ character }: { character: CharacterChoice }) =>
        usePresence({ channel: ch, self: { username: 'Ada', is_initiator: false, seat: 0, character } }),
      { initialProps: { character: base } },
    )
    act(() => { vi.advanceTimersByTime(0) })
    rerender({ character: { ...base } })
    act(() => { vi.advanceTimersByTime(RETRACK_DELAY_MS * 2) })
    expect(ch.track).toHaveBeenCalledTimes(1)
  })
})
