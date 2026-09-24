import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const fetchTodayStats = vi.fn(async () => ({ pomodoros: 4, minutes: 100 }))
vi.mock('@/lib/today', async () => {
  const actual = await vi.importActual<typeof import('@/lib/today')>('@/lib/today')
  return { ...actual, fetchTodayStats: (...args: unknown[]) => fetchTodayStats(...(args as [])) }
})

import { useToday } from '@/hooks/useToday'

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

type Props = { completed: number; seated: boolean; userId: string | null }
const render = (initial: Props) =>
  renderHook(({ completed, seated, userId }: Props) =>
    useToday({ userId, room: { bonfireId: 'fire-a', completedPomodoros: completed, seated } }),
  { initialProps: initial })

describe('useToday', () => {
  it('guest: pomodoros already done before joining are not counted', async () => {
    const { result } = render({ completed: 3, seated: true, userId: null })
    await waitFor(() => expect(result.current).toEqual({ pomodoros: 0, minutes: 0 }))
  })

  it('guest: counts a focus that completes while seated', async () => {
    const { result, rerender } = render({ completed: 3, seated: true, userId: null })
    await waitFor(() => expect(result.current?.pomodoros).toBe(0))
    act(() => rerender({ completed: 4, seated: true, userId: null }))
    expect(result.current?.pomodoros).toBe(1)
  })

  it('guest: does not count a focus that completes without a seat', async () => {
    const { result, rerender } = render({ completed: 3, seated: false, userId: null })
    await waitFor(() => expect(result.current?.pomodoros).toBe(0))
    act(() => rerender({ completed: 4, seated: false, userId: null }))
    expect(result.current?.pomodoros).toBe(0)
  })

  it('signed in: reads the server count and re-reads when a focus completes', async () => {
    const { result, rerender } = render({ completed: 0, seated: true, userId: 'user-1' })
    await waitFor(() => expect(result.current).toEqual({ pomodoros: 4, minutes: 100 }))
    expect(fetchTodayStats).toHaveBeenCalledTimes(1)
    act(() => rerender({ completed: 1, seated: true, userId: 'user-1' }))
    await waitFor(() => expect(fetchTodayStats).toHaveBeenCalledTimes(2))
    expect(localStorageMock.getItem('bonfire_today')).toBeNull()
  })
})
