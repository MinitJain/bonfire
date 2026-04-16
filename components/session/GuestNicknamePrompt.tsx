'use client'

import { useEffect, useRef, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { generateUsername } from '@/lib/roomName'

interface GuestNicknamePromptProps {
  onSave: (name: string) => void
  onSkip: () => void
}

export function GuestNicknamePrompt({ onSave, onSkip }: GuestNicknamePromptProps) {
  const [name, setName] = useState(() => generateUsername())
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const handleSave = () => {
    onSave(name.trim() || generateUsername())
  }

  // Escape to skip — skip during IME composition to avoid breaking CJK input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.isComposing) onSkip() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onSkip])

  // Focus trap — keep Tab/Shift+Tab within the dialog
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'input, button:not([disabled])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-nickname-title"
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4 animate-scale-in"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 id="guest-nickname-title" className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            What should we call you?
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Edit the name or shuffle for a new one.
          </p>
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            autoFocus
            aria-label="Your name"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSave() }}
            maxLength={32}
            className="w-full pl-3 pr-11 py-2.5 rounded-xl text-sm focus:outline-none"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
          <button
            type="button"
            onClick={() => { setName(generateUsername()); inputRef.current?.select() }}
            aria-label="Generate random name"
            title="Roll a random name"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Join
          </button>
          <button
            onClick={() => onSave(generateUsername())}
            className="w-full py-2 text-sm transition-all cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            Join anonymously
          </button>
        </div>
      </div>
    </div>
  )
}
