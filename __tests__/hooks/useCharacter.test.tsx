import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { CharacterChoice } from '@/lib/characters'

const eq = vi.fn()
const update = vi.fn(() => ({ eq }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: () => ({ update }) }),
}))

import { useCharacter, CHARACTER_STORAGE_KEY } from '@/hooks/useCharacter'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

const a: CharacterChoice = {
  build: 'masculine', skin: 1, hairStyle: 'short', hairColor: 0,
  outfit: 'jacket', outfitColor: 2, accessory: 'scarf',
}
const b: CharacterChoice = { ...a, build: 'neutral', accessory: 'glasses' }

beforeEach(() => {
  vi.clearAllMocks()
  eq.mockResolvedValue({ error: null })
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
  localStorageMock.clear()
})
afterEach(() => vi.useRealTimers())

describe('useCharacter, guest', () => {
  it('starts empty and persists picks in this browser across sessions', () => {
    const first = renderHook(() => useCharacter(null, null))
    expect(first.result.current.choice).toBeNull()
    act(() => first.result.current.save(a))
    expect(first.result.current.choice).toEqual(a)
    first.unmount()

    const second = renderHook(() => useCharacter(null, null))
    expect(second.result.current.choice).toEqual(a)
    expect(update).not.toHaveBeenCalled()
  })

  it('ignores a corrupted stored value', () => {
    localStorageMock.setItem(CHARACTER_STORAGE_KEY, JSON.stringify({ ...a, skin: 99 }))
    expect(renderHook(() => useCharacter(null, null)).result.current.choice).toBeNull()
    localStorageMock.setItem(CHARACTER_STORAGE_KEY, '{not json')
    expect(renderHook(() => useCharacter(null, null)).result.current.choice).toBeNull()
  })
})

describe('useCharacter, signed in', () => {
  it('starts from the saved profile choice, not this browser', () => {
    localStorageMock.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(b))
    expect(renderHook(() => useCharacter('user-1', a)).result.current.choice).toEqual(a)
  })

  it('debounces profile writes into one update with the latest choice', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCharacter('user-1', null))
    act(() => result.current.save(a))
    act(() => result.current.save(b))
    expect(update).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith({ character: b })
    expect(eq).toHaveBeenCalledWith('id', 'user-1')
    expect(localStorageMock.getItem(CHARACTER_STORAGE_KEY)).toBeNull()
  })

  it('writes a pending change when leaving before the debounce ends', () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useCharacter('user-1', null))
    act(() => result.current.save(a))
    unmount()
    expect(update).toHaveBeenCalledWith({ character: a })
  })

  it('reports a failed save', async () => {
    vi.useFakeTimers()
    eq.mockResolvedValue({ error: { message: 'violates check constraint' } })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useCharacter('user-1', null))
    act(() => result.current.save(a))
    await act(async () => { vi.advanceTimersByTime(500) })
    await act(async () => {})
    expect(result.current.saveFailed).toBe(true)
    spy.mockRestore()
  })
})
