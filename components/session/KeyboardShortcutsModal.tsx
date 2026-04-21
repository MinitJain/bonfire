'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  onClose: () => void
}

const SHORTCUTS = [
  { keys: ['Space'], description: 'Start / pause timer' },
  { keys: ['?'],     description: 'Toggle this help modal' },
]

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl p-6 flex flex-col gap-4 w-full max-w-xs mx-4"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.4))',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Keyboard shortcuts
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between gap-4">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {keys.map(k => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 rounded text-xs font-mono font-medium"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
