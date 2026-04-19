'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, ChevronDown } from 'lucide-react'
import { AmbientPlayer as Player, AMBIENT_SOUNDS, type AmbientType } from '@/lib/ambient'

const NOISE_COLORS: Record<AmbientType, string> = {
  brown: '#8B5E3C',
  pink:  '#D86BAD',
  white: '#A8A8A2',
  rain:  '#5BA8D4',
}

interface AmbientPlayerProps {
  onActiveChange?: (active: boolean) => void
  /** compact=true renders a single select dropdown instead of the button grid */
  compact?: boolean
}

export function AmbientPlayer({ onActiveChange, compact = false }: AmbientPlayerProps) {
  const playerRef = useRef<Player | null>(null)
  const [active, setActive] = useState<AmbientType | null>(null)
  const [volume, setVolume] = useState(0.12)
  const [muted, setMuted] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showPicker) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPicker])

  useEffect(() => {
    const savedType = localStorage.getItem('pomodoro_ambient_type') as AmbientType | null
    const savedVolume = parseFloat(localStorage.getItem('pomodoro_ambient_volume') ?? '0.12')
    if (!isNaN(savedVolume)) setVolume(Math.min(savedVolume, 0.35))

    playerRef.current = new Player()
    if (savedType && AMBIENT_SOUNDS.some(s => s.type === savedType)) {
      playerRef.current.play(savedType, savedVolume)
      setActive(savedType)
    }
    return () => { playerRef.current?.destroy() }
  }, [])

  useEffect(() => {
    onActiveChange?.(active !== null)
  }, [active, onActiveChange])

  const handleSelect = (type: AmbientType) => {
    if (active === type) {
      playerRef.current?.stop()
      setActive(null)
      localStorage.removeItem('pomodoro_ambient_type')
    } else {
      playerRef.current?.play(type, muted ? 0 : volume)
      setActive(type)
      localStorage.setItem('pomodoro_ambient_type', type)
    }
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    localStorage.setItem('pomodoro_ambient_volume', String(v))
    if (!muted) playerRef.current?.setVolume(v)
  }

  const handleMute = () => {
    const next = !muted
    setMuted(next)
    playerRef.current?.setVolume(next ? 0 : volume)
  }

  // Compact mode: custom colored dropdown for inline use (session bottom bar)
  if (compact) {
    const activeSound = active ? AMBIENT_SOUNDS.find(s => s.type === active) : null
    return (
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(v => !v)}
          aria-label="Focus music"
          aria-expanded={showPicker}
          className="w-full h-9 px-2 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 focus:outline-none"
          style={{
            background: 'var(--bg-secondary)',
            border: `1px solid ${showPicker ? 'var(--accent)' : 'var(--border)'}`,
            color: 'var(--text-secondary)',
          }}
        >
          {activeSound ? (
            <>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: NOISE_COLORS[active!] }} />
              <span className="flex-1 text-left truncate">{activeSound.label}</span>
            </>
          ) : (
            <span className="flex-1 text-left">None</span>
          )}
          <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        </button>

        {showPicker && (
          <div
            className="absolute bottom-10 left-0 right-0 rounded-xl z-50 overflow-hidden py-1"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <button
              onClick={() => {
                playerRef.current?.stop()
                setActive(null)
                localStorage.removeItem('pomodoro_ambient_type')
                setShowPicker(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors"
              style={{
                color: active === null ? 'var(--text-primary)' : 'var(--text-muted)',
                background: active === null ? 'var(--bg-secondary)' : 'transparent',
              }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--border)' }} />
              None
            </button>
            {AMBIENT_SOUNDS.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => { handleSelect(type); setShowPicker(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors"
                style={{
                  color: active === type ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: active === type ? 'var(--bg-secondary)' : 'transparent',
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: NOISE_COLORS[type] }} />
                {label}
              </button>
            ))}

            {/* Volume row — always visible so user can set level before picking */}
            <div
              className="flex items-center gap-2 px-3 py-2 mt-0.5"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <button
                onClick={handleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                className="flex-shrink-0 cursor-pointer transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="0.35"
                step="0.01"
                value={volume}
                onChange={handleVolume}
                className="flex-1 h-1 cursor-pointer"
                style={{ accentColor: 'var(--accent)' }}
                aria-label="Volume"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-xs">
      <div className="grid grid-cols-4 gap-2 mb-3">
        {AMBIENT_SOUNDS.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => handleSelect(type)}
            title={label}
            aria-label={`${label} ambient sound`}
            aria-pressed={active === type}
            className="flex flex-col items-center justify-center aspect-square p-0 rounded-xl text-xs transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50"
            style={
              active === type
                ? {
                    background: 'var(--accent-soft)',
                    border: '1px solid var(--accent)',
                    color: 'var(--text-primary)',
                  }
                : {
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }
            }
          >
            <span className="font-semibold truncate w-full text-center leading-tight text-[11px]">{label}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="0.35"
            step="0.01"
            value={volume}
            onChange={handleVolume}
            className="flex-1 h-1 cursor-pointer"
            style={{ accentColor: 'var(--accent)' }}
            aria-label="Volume"
          />
        </div>
      )}
    </div>
  )
}
