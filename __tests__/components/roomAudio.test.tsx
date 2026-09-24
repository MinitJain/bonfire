import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react'

const play = vi.fn()
vi.mock('@/lib/ambient', () => ({
  AmbientPlayer: class {
    play = play
    stop() {}
    destroy() {}
    setVolume() {}
  },
}))

import { useRoomSound, AudioControls } from '@/components/bonfire/AudioControls'

const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { for (const k of Object.keys(store)) delete store[k] },
}

beforeEach(() => {
  play.mockClear()
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
  localStorageMock.clear()
})

describe('room sound', () => {
  it('is silent by default: no ambient, no chime', () => {
    const { result } = renderHook(() => useRoomSound())
    expect(result.current.active).toBeNull()
    expect(result.current.chime).toBe(false)
    expect(play).not.toHaveBeenCalled()
  })

  it('remembers a previous choice only as a suggestion, never autoplays it', () => {
    localStorage.setItem('bonfire_ambient', 'rain')
    const { result } = renderHook(() => useRoomSound())
    expect(result.current.suggestion).toBe('rain')
    expect(result.current.active).toBeNull()
    expect(play).not.toHaveBeenCalled()
  })

  it('plays only after an explicit choice', () => {
    const { result } = renderHook(() => useRoomSound())
    act(() => result.current.select('brown'))
    expect(result.current.active).toBe('brown')
    expect(play).toHaveBeenCalledWith('brown', 0.5)
    expect(localStorage.getItem('bonfire_ambient')).toBe('brown')
  })

  it('popover shows Quiet selected and the chime toggle off', () => {
    function Harness() {
      const sound = useRoomSound()
      return <AudioControls sound={sound} />
    }
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'Quiet' }).getAttribute('aria-pressed')).toBe('true')
    const chime = screen.getByRole('checkbox', { name: 'Chime when a phase ends' }) as HTMLInputElement
    expect(chime.checked).toBe(false)
    fireEvent.click(chime)
    expect(chime.checked).toBe(true)
    expect(play).not.toHaveBeenCalled()
  })
})
