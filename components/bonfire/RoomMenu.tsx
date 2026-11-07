'use client'

import { useEffect, useRef, useState } from 'react'
import { Headphones, Link2, Shirt, SlidersHorizontal } from 'lucide-react'
import type { BonfireState } from '@/types'
import type { SettingsInput } from '@/hooks/useBonfire'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ShareDrawer } from '@/components/bonfire/ShareDrawer'
import { AudioControls, type RoomSound } from '@/components/bonfire/AudioControls'
import { SessionSettings } from '@/components/bonfire/SessionSettings'
import { CharacterEditor } from '@/components/bonfire/CharacterEditor'
import type { CharacterChoice } from '@/lib/characters'

type Panel = 'share' | 'sound' | 'settings' | 'character'

interface RoomMenuProps {
  state: BonfireState
  canControl: boolean
  isInitiator: boolean
  onSaveSettings: (opts: SettingsInput) => Promise<void>
  onToggleMode: () => Promise<void>
  onRename: (name: string) => Promise<void>
  sound: RoomSound
  character: {
    presenceKey: string | null
    choice: CharacterChoice
    onChange: (next: CharacterChoice) => void
    signedIn: boolean
    saveFailed: boolean
  }
}

/** Share, sound, settings and theme: one restrained cluster in the top-right corner. */
export function RoomMenu({ state, canControl, isInitiator, onSaveSettings, onToggleMode, onRename, sound, character }: RoomMenuProps) {
  const [open, setOpen] = useState<Panel | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (panel: Panel) => setOpen(p => (p === panel ? null : panel))
  const showSettings = canControl || isInitiator

  return (
    <div ref={ref} className="bf-corner bf-corner-right">
      <button
        type="button"
        className="bf-icon-btn"
        aria-label="Invite"
        aria-expanded={open === 'share'}
        onClick={() => toggle('share')}
      >
        <Link2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        className={cn('bf-icon-btn', (sound.active || sound.chime) && 'is-lit')}
        aria-label="Sound"
        aria-expanded={open === 'sound'}
        onClick={() => toggle('sound')}
      >
        <Headphones className="w-4 h-4" />
      </button>
      <button
        type="button"
        className="bf-icon-btn"
        aria-label="Your character"
        aria-expanded={open === 'character'}
        onClick={() => toggle('character')}
      >
        <Shirt className="w-4 h-4" />
      </button>
      {showSettings && (
        <button
          type="button"
          className="bf-icon-btn"
          aria-label="Settings"
          aria-expanded={open === 'settings'}
          onClick={() => toggle('settings')}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      )}
      <ThemeToggle variant="quiet" />

      {open && (
        <div className={cn('bf-popover', open === 'character' && 'is-tall')} role="dialog" aria-label={open === 'character' ? 'your character' : open}>
          {open === 'share' && (
            <ShareDrawer
              bonfireId={state.id}
              joinCode={state.join_code}
              initiatorName={state.initiator_name}
              bonfireName={state.name}
            />
          )}
          {open === 'sound' && <AudioControls sound={sound} />}
          {open === 'character' && character.presenceKey && (
            <CharacterEditor {...character} presenceKey={character.presenceKey} />
          )}
          {open === 'settings' && showSettings && (
            <SessionSettings
              // Settings saved by someone else (Jam) replace this form, so
              // Save can never write back values the room has moved past
              key={[state.name, state.focus_duration, state.short_duration, state.long_duration, state.rounds_before_long].join('|')}
              state={state}
              isInitiator={isInitiator}
              onSave={onSaveSettings}
              onToggleMode={onToggleMode}
              onRename={onRename}
              onClose={() => setOpen(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}
