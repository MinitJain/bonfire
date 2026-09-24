import { describe, it, expect, vi, beforeEach } from 'vitest'

const query = {
  select: vi.fn(() => query),
  eq: vi.fn(() => query),
  gte: vi.fn(() => query),
  lt: vi.fn(async () => ({ data: [{ duration_minutes: 25 }, { duration_minutes: 50 }], error: null })),
}
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: () => query }) }))

import { fetchTodayStats, getGuestTodayCount, localDay, recordGuestPomodoro } from '@/lib/today'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
  localStorageMock.clear()
})

describe('localDay', () => {
  it('is the local calendar day, midnight to midnight', () => {
    const now = new Date(2026, 8, 25, 23, 30)
    const { key, start, end } = localDay(now)
    expect(key).toBe('2026-09-25')
    expect(start).toEqual(new Date(2026, 8, 25))
    expect(end).toEqual(new Date(2026, 8, 26))
  })
})

describe('fetchTodayStats', () => {
  it("counts the user's own logs between local midnights, across all Bonfires", async () => {
    const now = new Date(2026, 8, 25, 10)
    expect(await fetchTodayStats('user-1', now)).toEqual({ pomodoros: 2, minutes: 75 })
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(query.gte).toHaveBeenCalledWith('completed_at', new Date(2026, 8, 25).toISOString())
    expect(query.lt).toHaveBeenCalledWith('completed_at', new Date(2026, 8, 26).toISOString())
    // No room filter: the count is not tied to a Bonfire
    expect(query.eq).toHaveBeenCalledTimes(1)
  })
})

describe('guest count', () => {
  const day = new Date(2026, 8, 25, 10)

  it('counts each completed pomodoro once, across rooms', () => {
    expect(recordGuestPomodoro('fire-a', 1, day)).toBe(1)
    expect(recordGuestPomodoro('fire-a', 1, day)).toBe(1)
    expect(recordGuestPomodoro('fire-a', 2, day)).toBe(2)
    expect(recordGuestPomodoro('fire-b', 1, day)).toBe(3)
    expect(getGuestTodayCount(day)).toBe(3)
  })

  it('starts again the next day', () => {
    recordGuestPomodoro('fire-a', 1, day)
    expect(getGuestTodayCount(new Date(2026, 8, 26, 0, 1))).toBe(0)
    expect(recordGuestPomodoro('fire-a', 2, new Date(2026, 8, 26, 9))).toBe(1)
  })
})
