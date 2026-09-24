'use client'

import { useEffect, useState } from 'react'
import { MAX_BONFIRE_NAME_LENGTH, MAX_NAME_LENGTH, getGuestName } from '@/lib/bonfire'

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
}

/** "Choose your name": shown once per Bonfire before taking a seat. */
export function NamePrompt({ defaultName, isCreator, defaultBonfireName, onSubmit }: NamePromptProps) {
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
    <form className="bf-seat-prompt" onSubmit={submit}>
      <label htmlFor="bf-name" className="bf-seat-prompt-title">Choose your name</label>
      <input
        id="bf-name"
        className="bf-name-input"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={suggestion}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="nickname"
        autoFocus
      />
      {isCreator && (
        <>
          <label htmlFor="bf-bonfire-name-step" className="bf-seat-prompt-sub">
            Name this bonfire <span>(optional)</span>
          </label>
          <input
            id="bf-bonfire-name-step"
            className="bf-name-input is-secondary"
            value={bonfireName}
            onChange={e => setBonfireName(e.target.value)}
            placeholder="Deep Work"
            maxLength={MAX_BONFIRE_NAME_LENGTH}
            autoComplete="off"
          />
        </>
      )}
      <button type="submit" className="bf-btn-primary">
        continue
      </button>
    </form>
  )
}
