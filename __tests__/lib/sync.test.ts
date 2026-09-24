import { describe, it, expect } from 'vitest'
import { isNewerState } from '@/lib/bonfire'
import { estimateOffset } from '@/lib/serverClock'
import { inviteImageVersion } from '@/lib/brand'
import type { BonfireState } from '@/types'

const state = (version?: number) => ({ id: 'abc', version }) as BonfireState

describe('isNewerState', () => {
  it('drops states older than or equal to the one held', () => {
    expect(isNewerState(state(4), state(5))).toBe(false)
    expect(isNewerState(state(5), state(5))).toBe(false)
    expect(isNewerState(state(6), state(5))).toBe(true)
  })
  it('accepts when either side has no version (before the migration)', () => {
    expect(isNewerState(state(undefined), state(5))).toBe(true)
    expect(isNewerState(state(3), state(undefined))).toBe(true)
  })
})

describe('estimateOffset', () => {
  it('is the server time at the midpoint of the round trip minus local time', () => {
    // sent at 1000, received at 1200 (local); server said 11100 at the midpoint (1100)
    expect(estimateOffset(1000, 11100, 1200)).toBe(10000)
    expect(estimateOffset(1000, 1100, 1200)).toBe(0)
  })
})

describe('inviteImageVersion', () => {
  const b = { name: 'Deep Work', initiator_name: 'Quiet Fox', focus_duration: 1500, short_duration: 300, long_duration: 900 }
  it('is stable for the same preview', () => {
    expect(inviteImageVersion(b)).toBe(inviteImageVersion({ ...b }))
  })
  it('changes when the name or settings change', () => {
    expect(inviteImageVersion({ ...b, name: 'Reading' })).not.toBe(inviteImageVersion(b))
    expect(inviteImageVersion({ ...b, focus_duration: 2700 })).not.toBe(inviteImageVersion(b))
  })
})
