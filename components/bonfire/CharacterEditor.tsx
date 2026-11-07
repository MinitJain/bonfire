'use client'

import { useMemo } from 'react'
import { Character } from '@/components/bonfire/Character'
import {
  ACCESSORY_OPTIONS, BODY, HAIR, HAIR_STYLE_OPTIONS, OUTFITS, SKIN,
  lookFor, type CharacterChoice,
} from '@/lib/characters'

const BODY_ORDER = ['feminine', 'neutral', 'masculine'] as const
const BUILD_LABEL = { feminine: 'Feminine', neutral: 'Neutral', masculine: 'Masculine' } as const
const SKIN_NAMES = ['Light', 'Light medium', 'Medium', 'Deep', 'Fair', 'Medium deep']
const HAIR_NAMES = ['Black', 'Dark brown', 'Brown', 'Blond', 'Charcoal', 'Auburn']
const OUTFIT_COLOR_NAMES = ['Blue', 'Sage', 'Clay', 'Lavender', 'Mustard', 'Teal', 'Rust', 'Slate']
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

interface CharacterEditorProps {
  presenceKey: string
  choice: CharacterChoice
  onChange: (next: CharacterChoice) => void
  signedIn: boolean
  saveFailed: boolean
}

/** Pick how you look around the fire. Every change applies (and saves) at once. */
export function CharacterEditor({ presenceKey, choice, onChange, signedIn, saveFailed }: CharacterEditorProps) {
  const look = useMemo(() => lookFor(presenceKey, choice), [presenceKey, choice])
  const set = <K extends keyof CharacterChoice>(key: K, value: CharacterChoice[K]) =>
    onChange({ ...choice, [key]: value })

  return (
    <div className="bf-char-editor">
      <p className="bf-pop-title">Your character</p>
      <div className="bf-char-preview" aria-hidden="true">
        <Character look={look} pose="front" />
      </div>

      <Options label="Body" options={BODY_ORDER} value={choice.build} name={b => BUILD_LABEL[b]} onPick={v => set('build', v)} />
      <Swatches label="Skin tone" colors={SKIN} names={SKIN_NAMES} value={choice.skin} onPick={v => set('skin', v)} />
      <Options label="Hair" options={HAIR_STYLE_OPTIONS} value={choice.hairStyle} name={cap} onPick={v => set('hairStyle', v)} />
      <Swatches label="Hair colour" colors={HAIR} names={HAIR_NAMES} value={choice.hairColor} onPick={v => set('hairColor', v)} />
      <Options label="Outfit" options={OUTFITS} value={choice.outfit} name={cap} onPick={v => set('outfit', v)} />
      <Swatches label="Outfit colour" colors={BODY} names={OUTFIT_COLOR_NAMES} value={choice.outfitColor} onPick={v => set('outfitColor', v)} />
      <Options label="Accessory" options={ACCESSORY_OPTIONS} value={choice.accessory} name={cap} onPick={v => set('accessory', v)} />

      <p className="bf-pop-hint" role="status">
        {saveFailed
          ? 'Could not save to your profile. Your change shows here until you leave.'
          : signedIn ? 'Saved to your profile.' : 'Saved in this browser.'}
      </p>
    </div>
  )
}

function Options<T extends string>({ label, options, value, name, onPick }: {
  label: string
  options: readonly T[]
  value: T
  name: (v: T) => string
  onPick: (v: T) => void
}) {
  return (
    <div className="bf-pop-section">
      <span className="bf-pop-label">{label}</span>
      <div className="bf-char-options" role="group" aria-label={label}>
        {options.map(o => (
          <button key={o} type="button" className="bf-chip" aria-pressed={o === value} onClick={() => onPick(o)}>
            {name(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Swatches({ label, colors, names, value, onPick }: {
  label: string
  colors: readonly string[]
  names: readonly string[]
  value: number
  onPick: (i: number) => void
}) {
  return (
    <div className="bf-pop-section">
      <span className="bf-pop-label">{label}</span>
      <div className="bf-char-options" role="group" aria-label={label}>
        {colors.map((c, i) => (
          <button
            key={c}
            type="button"
            className="bf-swatch"
            style={{ background: c }}
            aria-label={names[i]}
            aria-pressed={i === value}
            onClick={() => onPick(i)}
          />
        ))}
      </div>
    </div>
  )
}
