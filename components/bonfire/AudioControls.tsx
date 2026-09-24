'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AmbientPlayer, type AmbientType } from '@/lib/ambient'

const AMBIENT_OPTIONS: { value: AmbientType; label: string }[] = [
  { value: 'rain', label: 'Rain' },
  { value: 'brown', label: 'Brown' },
  { value: 'pink', label: 'Pink' },
  { value: 'white', label: 'White' },
]

const SUGGESTION_KEY = 'bonfire_ambient'

export interface RoomSound {
  /** What is playing now. Always null until the participant chooses a sound. */
  active: AmbientType | null
  /** The participant's previous choice, remembered only as a suggestion. */
  suggestion: AmbientType | null
  volume: number
  select: (type: AmbientType | null) => void
  setVolume: (volume: number) => void
  /** Phase-end chime. Off by default, never remembered. */
  chime: boolean
  setChime: (on: boolean) => void
}

/**
 * Local, per-participant sound. Bonfire is silent by default: nothing plays
 * until the participant chooses a sound here, and a previous choice is only
 * shown as a suggestion, never autoplayed. Lives with the room page, so sound
 * continues while the popover is closed.
 */
export function useRoomSound(): RoomSound {
  const [active, setActive] = useState<AmbientType | null>(null)
  const [suggestion, setSuggestion] = useState<AmbientType | null>(null)
  const [volume, setVolume] = useState(0.5)
  const [chime, setChime] = useState(false)
  const playerRef = useRef<AmbientPlayer | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SUGGESTION_KEY) as AmbientType | null
      if (stored && AMBIENT_OPTIONS.some(o => o.value === stored)) setSuggestion(stored)
    } catch {
      /* storage unavailable */
    }
  }, [])

  useEffect(() => {
    if (!active) return
    const player = new AmbientPlayer()
    playerRef.current = player
    player.play(active, volume)
    return () => {
      player.stop()
      player.destroy()
      playerRef.current = null
    }
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps -- volume handled by separate effect

  useEffect(() => {
    playerRef.current?.setVolume(volume)
  }, [volume])

  const select = useCallback((type: AmbientType | null) => {
    setActive(type)
    if (!type) return
    setSuggestion(type)
    try {
      localStorage.setItem(SUGGESTION_KEY, type)
    } catch {
      /* storage unavailable */
    }
  }, [])

  return { active, suggestion, volume, select, setVolume, chime, setChime }
}

export function AudioControls({ sound }: { sound: RoomSound }) {
  const hintSuggestion = !sound.active && sound.suggestion
    ? AMBIENT_OPTIONS.find(o => o.value === sound.suggestion)?.label
    : null

  return (
    <div>
      <p className="bf-pop-title">Sound</p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="bf-chip"
          aria-pressed={sound.active === null}
          onClick={() => sound.select(null)}
        >
          Quiet
        </button>
        {AMBIENT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className="bf-chip"
            aria-pressed={sound.active === opt.value}
            data-suggested={!sound.active && sound.suggestion === opt.value ? 'true' : undefined}
            onClick={() => sound.select(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {hintSuggestion && <p className="bf-pop-hint">Last time: {hintSuggestion}</p>}

      {sound.active && (
        <div style={{ marginTop: 14 }}>
          <label className="bf-pop-label" htmlFor="bf-volume">Volume</label>
          <input
            id="bf-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sound.volume}
            onChange={e => sound.setVolume(parseFloat(e.target.value))}
            className="bf-range"
          />
        </div>
      )}

      <label className="bf-toggle">
        <input
          type="checkbox"
          checked={sound.chime}
          onChange={e => sound.setChime(e.target.checked)}
        />
        <span>Chime when a phase ends</span>
      </label>

      <p className="bf-pop-hint">Only you hear this.</p>
    </div>
  )
}
