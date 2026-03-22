'use client'

import { useState } from 'react'

export interface TimerDurations {
  focus: number  // minutes
  short: number  // minutes
  long: number   // minutes
}

export interface SessionSettings {
  durations: TimerDurations
  allowGuestShare: boolean
}

interface SettingsPanelProps {
  settings: SessionSettings
  onApply: (settings: SessionSettings) => void
  disabled?: boolean
}

function ClampInput({ label, value, onChange, min, max }: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
}) {
  const id = `setting-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
        }}
        className="w-full px-3 py-2 rounded-lg text-sm text-center font-mono tabular-nums focus:outline-none focus:ring-2"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      />
    </div>
  )
}

export function SettingsPanel({ settings, onApply, disabled }: SettingsPanelProps) {
  const [local, setLocal] = useState(settings)

  const setDuration = (key: keyof TimerDurations) => (v: number) =>
    setLocal(prev => ({ ...prev, durations: { ...prev.durations, [key]: v } }))

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        Timer (minutes)
      </p>

      <div className="grid grid-cols-3 gap-3">
        <ClampInput label="Focus" value={local.durations.focus} onChange={setDuration('focus')} min={1} max={60} />
        <ClampInput label="Short break" value={local.durations.short} onChange={setDuration('short')} min={1} max={30} />
        <ClampInput label="Long break" value={local.durations.long} onChange={setDuration('long')} min={1} max={60} />
      </div>

      <div
        className="flex items-center justify-between py-2.5 px-3 rounded-xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
          Allow guests to invite
        </span>
        <button
          role="switch"
          aria-checked={local.allowGuestShare}
          aria-label="Allow guests to invite"
          onClick={() => setLocal(prev => ({ ...prev, allowGuestShare: !prev.allowGuestShare }))}
          className="relative w-11 h-6 rounded-full transition-colors cursor-pointer focus:outline-none flex-shrink-0"
          style={{
            background: local.allowGuestShare ? 'var(--accent)' : 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <span
            className="absolute top-1 left-1 w-4 h-4 rounded-full transition-transform"
            style={{
              background: '#fff',
              transform: local.allowGuestShare ? 'translateX(20px)' : 'translateX(0px)',
            }}
          />
        </button>
      </div>

      <button
        onClick={() => onApply(local)}
        disabled={disabled}
        className="w-full py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        Apply
      </button>
    </div>
  )
}
