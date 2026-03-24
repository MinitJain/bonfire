'use client'

import { useState } from 'react'

export interface TimerDurations {
  focus: number  // minutes
  short: number  // minutes
  long: number   // minutes
}

export interface SessionSettings {
  durations: TimerDurations
  rounds: number
  allowGuestShare: boolean
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
}

interface SettingsPanelProps {
  settings: SessionSettings
  onApply: (settings: SessionSettings) => void
  onGuestShareChange?: (v: boolean) => void
  onAutoStartBreaksChange?: (v: boolean) => void
  onAutoStartPomodorosChange?: (v: boolean) => void
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

function ToggleRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface border border-border">
      <span className="text-sm text-foreground">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer focus:outline-none flex-shrink-0 border border-border ${checked ? 'bg-accent' : 'bg-surface'}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

export function SettingsPanel({
  settings,
  onApply,
  onGuestShareChange,
  onAutoStartBreaksChange,
  onAutoStartPomodorosChange,
  disabled,
}: SettingsPanelProps) {
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

      <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface border border-border">
        <span className="text-sm text-foreground">Long break interval</span>
        <input
          type="number"
          min={1}
          max={10}
          value={local.rounds}
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v)) setLocal(prev => ({ ...prev, rounds: Math.min(10, Math.max(1, v)) }))
          }}
          className="w-14 px-2 py-1 rounded-lg text-sm text-center font-mono tabular-nums focus:outline-none focus:ring-2"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <ToggleRow
        label="Auto start breaks"
        checked={local.autoStartBreaks}
        onToggle={() => {
          const next = !local.autoStartBreaks
          setLocal(prev => ({ ...prev, autoStartBreaks: next }))
          onAutoStartBreaksChange?.(next)
        }}
      />

      <ToggleRow
        label="Auto start pomodoros"
        checked={local.autoStartPomodoros}
        onToggle={() => {
          const next = !local.autoStartPomodoros
          setLocal(prev => ({ ...prev, autoStartPomodoros: next }))
          onAutoStartPomodorosChange?.(next)
        }}
      />

      <ToggleRow
        label="Allow guests to invite"
        checked={local.allowGuestShare}
        onToggle={() => {
          const next = !local.allowGuestShare
          setLocal(prev => ({ ...prev, allowGuestShare: next }))
          onGuestShareChange?.(next)
        }}
      />

      <button
        onClick={() => onApply(local)}
        disabled={disabled}
        title={disabled ? 'Pause the timer to change settings' : undefined}
        className="w-full py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50 bg-accent text-white"
      >
        {disabled ? 'Pause timer to apply' : 'Apply'}
      </button>
    </div>
  )
}
