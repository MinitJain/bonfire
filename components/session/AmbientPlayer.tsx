'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { AmbientPlayer as Player, AMBIENT_SOUNDS, type AmbientType } from '@/lib/ambient'

export function AmbientPlayer() {
  const playerRef = useRef<Player | null>(null)
  const [active, setActive] = useState<AmbientType | null>(null)
  const [volume, setVolume] = useState(0.25)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    playerRef.current = new Player()
    return () => { playerRef.current?.destroy() }
  }, [])

  const handleSelect = (type: AmbientType) => {
    if (active === type) {
      playerRef.current?.stop()
      setActive(null)
    } else {
      playerRef.current?.play(type, muted ? 0 : volume)
      setActive(type)
    }
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (!muted) playerRef.current?.setVolume(v)
  }

  const handleMute = () => {
    const next = !muted
    setMuted(next)
    playerRef.current?.setVolume(next ? 0 : volume)
  }

  return (
    <div className="w-full max-w-xs">
      <p
        className="text-xs uppercase tracking-widest mb-3 font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        Focus Noise
      </p>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {AMBIENT_SOUNDS.map(({ type, emoji, label }) => (
          <button
            key={type}
            onClick={() => handleSelect(type)}
            title={label}
            aria-label={`${label} ambient sound`}
            aria-pressed={active === type}
            className="flex flex-col items-center gap-1 py-3 px-1 rounded-xl text-xs transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50"
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
            <span className="text-base">{emoji}</span>
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
            max="0.6"
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
