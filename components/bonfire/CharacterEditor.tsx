'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Character } from '@/components/bonfire/Character'
import {
  ACCESSORY_OPTIONS, BODY, HAIR, HAIR_STYLE_OPTIONS, OUTFITS, SKIN,
  lookFor, type CharacterChoice,
} from '@/lib/characters'
import { SPRING } from '@/lib/motion'

const BODY_ORDER = ['feminine', 'neutral', 'masculine'] as const
const BUILD_LABEL = { feminine: 'Feminine', neutral: 'Neutral', masculine: 'Masculine' } as const
const SKIN_NAMES = ['Light', 'Light medium', 'Medium', 'Deep', 'Fair', 'Medium deep']
const HAIR_NAMES = ['Black', 'Dark brown', 'Brown', 'Blond', 'Charcoal', 'Auburn']
const OUTFIT_COLOR_NAMES = ['Blue', 'Sage', 'Clay', 'Lavender', 'Mustard', 'Teal', 'Rust', 'Slate']
const TABS = ['Body', 'Hair', 'Outfit', 'Extras'] as const
type Tab = (typeof TABS)[number]
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export interface CharacterEditorProps {
  presenceKey: string
  choice: CharacterChoice
  onChange: (next: CharacterChoice) => void
  signedIn: boolean
  saveFailed: boolean
}

/** The big figure on the character step: bounces softly on every change. */
export function CharacterStage({ presenceKey, choice }: Pick<CharacterEditorProps, 'presenceKey' | 'choice'>) {
  const look = useMemo(() => lookFor(presenceKey, choice), [presenceKey, choice])
  return (
    <div className="bf-char-stage" aria-hidden="true">
      <div className="bf-char-glow" />
      <motion.div
        key={JSON.stringify(choice)}
        className="bf-char-figure"
        initial={{ scale: 0.92, y: 6 }}
        animate={{ scale: 1, y: 0 }}
        transition={SPRING}
      >
        <Character look={look} pose="front" />
      </motion.div>
    </div>
  )
}

/** Tabs of options. Every change applies (and saves) at once. */
export function CharacterControls({ choice, onChange, signedIn, saveFailed }: CharacterEditorProps) {
  const [tab, setTab] = useState<Tab>('Body')
  const id = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const set = <K extends keyof CharacterChoice>(key: K, value: CharacterChoice[K]) =>
    onChange({ ...choice, [key]: value })

  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (TABS.indexOf(tab) + step + TABS.length) % TABS.length
    setTab(TABS[next])
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="bf-char-controls">
      <div className="bf-tabs" role="tablist" aria-label="Character" onKeyDown={onKeyDown}>
        {TABS.map((t, i) => (
          <button
            key={t}
            ref={el => { tabRefs.current[i] = el }}
            type="button"
            role="tab"
            id={`${id}-tab-${t}`}
            aria-selected={t === tab}
            aria-controls={`${id}-panel`}
            tabIndex={t === tab ? 0 : -1}
            className="bf-tab"
            onClick={() => setTab(t)}
          >
            {t === tab && <motion.span layoutId={`${id}-tab`} className="bf-tab-thumb" transition={SPRING} />}
            <span className="bf-tab-label">{t}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${tab}`}
          className="bf-tab-panel"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.16 }}
        >
          {tab === 'Body' && (
            <>
              <Options label="Body" options={BODY_ORDER} value={choice.build} name={b => BUILD_LABEL[b]} onPick={v => set('build', v)} />
              <Swatches label="Skin tone" colors={SKIN} names={SKIN_NAMES} value={choice.skin} onPick={v => set('skin', v)} />
            </>
          )}
          {tab === 'Hair' && (
            <>
              <Options label="Style" options={HAIR_STYLE_OPTIONS} value={choice.hairStyle} name={cap} onPick={v => set('hairStyle', v)} />
              <Swatches label="Colour" colors={HAIR} names={HAIR_NAMES} value={choice.hairColor} onPick={v => set('hairColor', v)} />
            </>
          )}
          {tab === 'Outfit' && (
            <>
              <Options label="Style" options={OUTFITS} value={choice.outfit} name={cap} onPick={v => set('outfit', v)} />
              <Swatches label="Colour" colors={BODY} names={OUTFIT_COLOR_NAMES} value={choice.outfitColor} onPick={v => set('outfitColor', v)} />
            </>
          )}
          {tab === 'Extras' && (
            <Options label="Accessory" options={ACCESSORY_OPTIONS} value={choice.accessory} name={cap} onPick={v => set('accessory', v)} />
          )}
        </motion.div>
      </AnimatePresence>

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
  const id = useId()
  return (
    <div className="bf-opt-group">
      <span className="bf-pop-label">{label}</span>
      <div className="bf-opts" role="group" aria-label={label}>
        {options.map(o => (
          <button key={o} type="button" className="bf-opt" aria-pressed={o === value} onClick={() => onPick(o)}>
            {o === value && <motion.span layoutId={`${id}-pill`} className="bf-opt-pill" transition={SPRING} />}
            <span className="bf-opt-label">{name(o)}</span>
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
  const id = useId()
  return (
    <div className="bf-opt-group">
      <span className="bf-pop-label">{label}</span>
      <div className="bf-opts" role="group" aria-label={label}>
        {colors.map((c, i) => (
          <motion.button
            key={c}
            type="button"
            className="bf-swatch"
            aria-label={names[i]}
            aria-pressed={i === value}
            onClick={() => onPick(i)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            transition={SPRING}
          >
            <span className="bf-swatch-fill" style={{ background: c }} />
            {i === value && <motion.span layoutId={`${id}-ring`} className="bf-swatch-ring" transition={SPRING} />}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
