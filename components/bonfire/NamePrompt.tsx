'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { MAX_BONFIRE_NAME_LENGTH, MAX_NAME_LENGTH, getGuestName } from '@/lib/bonfire'
import { CharacterControls, CharacterStage, type CharacterEditorProps } from '@/components/bonfire/CharacterEditor'
import { PRESS, SPRING_SOFT, rise, stagger } from '@/lib/motion'

export interface NameChoice {
  /** Display name for this Bonfire. */
  name: string
  /** Creator only: optional Bonfire name ('' = none). */
  bonfireName?: string
}

interface NamePromptProps {
  /** Existing identity to prefill (profile name, or the last name used as a guest). */
  defaultName: string | null
  /** The creator also sees the optional Bonfire name field. */
  isCreator: boolean
  defaultBonfireName?: string | null
  onSubmit: (choice: NameChoice) => void
  /** How you look around the fire. Omitted until the presence key is known. */
  character?: CharacterEditorProps
}

/**
 * Before the fire: choose your name and how you look, then take a seat.
 * Shown once per Bonfire.
 */
export function NamePrompt({ defaultName, isCreator, defaultBonfireName, onSubmit, character }: NamePromptProps) {
  const [name, setName] = useState(defaultName ?? '')
  const [bonfireName, setBonfireName] = useState(defaultBonfireName ?? '')
  const [suggestion, setSuggestion] = useState('')

  // This browser's guest name ("Sleepy Otter"), read on the client only to keep hydration stable
  useEffect(() => setSuggestion(getGuestName()), [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const chosen = (name.trim() || suggestion).slice(0, MAX_NAME_LENGTH)
    if (!chosen) return
    onSubmit({
      name: chosen,
      bonfireName: isCreator ? bonfireName.trim().slice(0, MAX_BONFIRE_NAME_LENGTH) : undefined,
    })
  }

  return (
    <motion.div
      className="bf-lobby-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <motion.form
        className="bf-lobby"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bf-lobby-title"
        onSubmit={submit}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={SPRING_SOFT}
      >
        {character && <CharacterStage presenceKey={character.presenceKey} choice={character.choice} />}

        <motion.div className="bf-lobby-side" variants={stagger(0.12)} initial="hidden" animate="show">
          <motion.h2 variants={rise} id="bf-lobby-title" className="bf-lobby-title">Take a seat by the fire</motion.h2>

          <motion.div variants={rise} className="bf-lobby-field">
            <label htmlFor="bf-name" className="bf-pop-label">Your name</label>
            <input
              id="bf-name"
              className="bf-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={suggestion}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="nickname"
              autoFocus
            />
          </motion.div>

          {isCreator && (
            <motion.div variants={rise} className="bf-lobby-field">
              <label htmlFor="bf-bonfire-name-step" className="bf-pop-label">
                Name this bonfire <span className="bf-optional">(optional)</span>
              </label>
              <input
                id="bf-bonfire-name-step"
                className="bf-input"
                value={bonfireName}
                onChange={e => setBonfireName(e.target.value)}
                placeholder="Deep Work"
                maxLength={MAX_BONFIRE_NAME_LENGTH}
                autoComplete="off"
              />
            </motion.div>
          )}

          {character && (
            <motion.div variants={rise}>
              <CharacterControls {...character} />
            </motion.div>
          )}

          <motion.div variants={rise} className="bf-lobby-cta">
            <motion.button type="submit" className="bf-btn-primary" {...PRESS}>
              sit by the fire
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.form>
    </motion.div>
  )
}
