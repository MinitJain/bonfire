'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { parseChoice, type CharacterChoice } from '@/lib/characters'
import { createClient } from '@/lib/supabase/client'

export const CHARACTER_STORAGE_KEY = 'bonfire_character'
const SAVE_DELAY_MS = 500

export function loadStoredChoice(): CharacterChoice | null {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY)
    return raw ? parseChoice(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function storeChoice(choice: CharacterChoice): void {
  try {
    localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(choice))
  } catch {
    // Private mode or blocked storage: the choice still lasts this visit
  }
}

/**
 * This person's character choice. Signed-in people keep it on their profile
 * (saved: what the server read); guests keep it in this browser.
 * Profile writes are debounced so clicking through options is one write.
 */
export function useCharacter(userId: string | null, saved: CharacterChoice | null) {
  const [choice, setChoice] = useState<CharacterChoice | null>(saved)
  const [saveFailed, setSaveFailed] = useState(false)
  const pending = useRef<CharacterChoice | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!userId) setChoice(loadStoredChoice())
  }, [userId])

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const next = pending.current
    pending.current = null
    if (!next || !userId) return
    void createClient()
      .from('profiles')
      .update({ character: next })
      .eq('id', userId)
      .then(({ error }) => {
        if (error) console.error('[bonfire] saving character failed:', error.message)
        setSaveFailed(Boolean(error))
      })
  }, [userId])

  // Don't drop a change made just before leaving the room
  useEffect(() => flush, [flush])

  const save = useCallback((next: CharacterChoice) => {
    setChoice(next)
    if (!userId) {
      storeChoice(next)
      return
    }
    pending.current = next
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY_MS)
  }, [userId, flush])

  return { choice, save, saveFailed }
}
