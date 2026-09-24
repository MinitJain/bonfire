'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { NumberField } from '@/components/bonfire/NumberField'
import { FOCUS_PRESETS, SETTING_LIMITS, restsFor, type HomeSetup } from '@/lib/bonfire'
import { cn } from '@/lib/utils'

interface FocusSetupProps {
  setup: HomeSetup
  onChange: (setup: HomeSetup) => void
  onSubmit: () => void
  dimmed?: boolean
}

const isPreset = (m: number) => (FOCUS_PRESETS as readonly number[]).includes(m)

/**
 * How long to focus and how many rounds before the long rest, chosen before
 * lighting the fire. Rests follow the focus length; exact rests, mode and the
 * Bonfire name stay in the room.
 */
export function FocusSetup({ setup, onChange, onSubmit, dimmed }: FocusSetupProps) {
  const [custom, setCustom] = useState(false)
  const showCustom = custom || !isPreset(setup.focus)
  const { short, long } = restsFor(setup.focus)
  const { min: minRounds, max: maxRounds } = SETTING_LIMITS.rounds

  const setRounds = (rounds: number) =>
    onChange({ ...setup, rounds: Math.min(maxRounds, Math.max(minRounds, rounds)) })

  return (
    <div className={cn('bf-setup', dimmed && 'is-dimmed')}>
      <div className="bf-setup-row">
        <span className="bf-setup-label" id="bf-setup-focus">focus for</span>
        <div className="bf-setup-chips" role="group" aria-labelledby="bf-setup-focus">
          {FOCUS_PRESETS.map(m => (
            <button
              key={m}
              type="button"
              className="bf-chip"
              aria-pressed={!showCustom && setup.focus === m}
              aria-label={`${m} minutes`}
              onClick={() => {
                setCustom(false)
                onChange({ ...setup, focus: m })
              }}
            >
              {m}
            </button>
          ))}
          {showCustom ? (
            <span className="bf-chip is-custom" aria-pressed="true">
              <NumberField
                id="bf-setup-custom"
                className="bf-chip-input"
                value={setup.focus}
                onChange={focus => onChange({ ...setup, focus })}
                onEnter={onSubmit}
                aria-label="Custom focus length in minutes"
                autoFocus={custom}
                {...SETTING_LIMITS.focus}
              />
              <span aria-hidden="true">min</span>
            </span>
          ) : (
            <button type="button" className="bf-chip" aria-pressed="false" onClick={() => setCustom(true)}>
              custom
            </button>
          )}
        </div>
      </div>

      <div className="bf-setup-row">
        <span className="bf-setup-label" id="bf-setup-rounds">rounds</span>
        <div className="bf-stepper" role="group" aria-labelledby="bf-setup-rounds">
          <button
            type="button"
            aria-label="Fewer rounds"
            disabled={setup.rounds <= minRounds}
            onClick={() => setRounds(setup.rounds - 1)}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <output aria-live="polite">{setup.rounds}</output>
          <button
            type="button"
            aria-label="More rounds"
            disabled={setup.rounds >= maxRounds}
            onClick={() => setRounds(setup.rounds + 1)}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="bf-setup-note">
        {setup.rounds === 1
          ? `a ${long} min rest after each round`
          : `${short} min rests, a ${long} min rest every ${setup.rounds} rounds`}
      </p>
    </div>
  )
}
