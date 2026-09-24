'use client'

import { useState } from 'react'
import type { BonfireState } from '@/types'
import type { SettingsInput } from '@/hooks/useBonfire'
import { MAX_BONFIRE_NAME_LENGTH, SETTING_LIMITS } from '@/lib/bonfire'
import { NumberField } from '@/components/bonfire/NumberField'

interface SessionSettingsProps {
  state: BonfireState
  isInitiator: boolean
  onSave: (opts: SettingsInput) => Promise<void>
  onToggleMode: () => Promise<void>
  /** Initiator only. '' clears the Bonfire name. */
  onRename: (name: string) => Promise<void>
  onClose: () => void
}

export function SessionSettings({
  state,
  isInitiator,
  onSave,
  onToggleMode,
  onRename,
  onClose,
}: SessionSettingsProps) {
  const [name, setName] = useState(state.name ?? '')
  const [focus, setFocus] = useState(Math.round(state.focus_duration / 60))
  const [short, setShort] = useState(Math.round(state.short_duration / 60))
  const [long, setLong] = useState(Math.round(state.long_duration / 60))
  const [rounds, setRounds] = useState(state.rounds_before_long)
  const [saving, setSaving] = useState(false)
  const [switching, setSwitching] = useState(false)

  const nameDirty = isInitiator && name.trim() !== (state.name ?? '')
  const durationsDirty =
    Math.round(focus * 60) !== state.focus_duration ||
    Math.round(short * 60) !== state.short_duration ||
    Math.round(long * 60) !== state.long_duration ||
    rounds !== state.rounds_before_long
  const dirty = nameDirty || durationsDirty

  const save = async () => {
    setSaving(true)
    try {
      if (nameDirty) await onRename(name.trim())
      if (durationsDirty) {
        await onSave({
          focusDuration: Math.round(focus * 60),
          shortDuration: Math.round(short * 60),
          longDuration: Math.round(long * 60),
          roundsBeforeLong: rounds,
        })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const setMode = async (mode: 'focus' | 'jam') => {
    if (mode === state.session_mode || switching) return
    setSwitching(true)
    try {
      await onToggleMode()
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div>
      <p className="bf-pop-title">This bonfire</p>

      {isInitiator && (
        <div className="bf-pop-section">
          <label className="bf-pop-label" htmlFor="bf-bonfire-name">Bonfire name</label>
          <input
            id="bf-bonfire-name"
            className="bf-input"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={MAX_BONFIRE_NAME_LENGTH}
            placeholder="Optional, like Deep Work"
            autoComplete="off"
          />
        </div>
      )}

      {isInitiator && (
        <div className="bf-pop-section">
          <span className="bf-pop-label">Who tends the timer</span>
          <div className="bf-segment" role="group" aria-label="Mode">
            <button
              type="button"
              aria-pressed={state.session_mode === 'focus'}
              disabled={switching}
              onClick={() => void setMode('focus')}
            >
              Focus
            </button>
            <button
              type="button"
              aria-pressed={state.session_mode === 'jam'}
              disabled={switching}
              onClick={() => void setMode('jam')}
            >
              Jam
            </button>
          </div>
          <p className="bf-pop-hint">
            {state.session_mode === 'focus'
              ? 'Only you start, pause and skip.'
              : 'Everyone around the fire can start, pause and skip.'}
          </p>
        </div>
      )}

      <div className="bf-pop-section">
        <div className="grid grid-cols-2 gap-3">
          <Field id="bf-focus" label="Focus (min)" value={focus} onChange={setFocus} {...SETTING_LIMITS.focus} />
          <Field id="bf-short" label="Short rest (min)" value={short} onChange={setShort} {...SETTING_LIMITS.short} />
          <Field id="bf-long" label="Long rest (min)" value={long} onChange={setLong} {...SETTING_LIMITS.long} />
          <Field id="bf-rounds" label="Rounds" value={rounds} onChange={setRounds} {...SETTING_LIMITS.rounds} />
        </div>
        {dirty && (
          <button
            type="button"
            className="bf-btn-secondary w-full mt-3"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  min,
  max,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
}) {
  return (
    <div>
      <label className="bf-pop-label" htmlFor={id}>{label}</label>
      <NumberField id={id} value={value} onChange={onChange} min={min} max={max} />
    </div>
  )
}
