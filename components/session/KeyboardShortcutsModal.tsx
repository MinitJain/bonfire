'use client'

import { useEffect } from 'react'

interface KeyboardShortcutsModalProps {
  onClose: () => void
}

const shortcuts = [
  { key: 'Space', description: 'Play / Pause (host or jam mode)' },
  { key: '?', description: 'Open this help' },
  { key: 'Esc', description: 'Close panel or overlay' },
]

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-3xl p-6"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--text-primary)' }}>
          Keyboard Shortcuts
        </h2>
        <dl className="flex flex-col gap-3">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <dt className="text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</dt>
              <dd>
                <kbd
                  className="font-mono text-xs px-2 py-1 rounded-md"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {key}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
        <button
          onClick={onClose}
          className="mt-5 w-full py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
