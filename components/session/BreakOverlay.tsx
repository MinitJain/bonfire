'use client'

import { useEffect, useState } from 'react'
import { Coffee, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreakOverlayProps {
  visible: boolean
  onDismiss: () => void
  mode: 'focus' | 'short' | 'long'
}

const messages = {
  focus: {
    title: "Time's up!",
    subtitle: "Stand up. Get water. Rest your eyes.",
    cta: "Start Break",
  },
  short: {
    title: "Break's over!",
    subtitle: "Quick breather. Back in a moment.",
    cta: "Start Focusing",
  },
  long: {
    title: "Long break done!",
    subtitle: "Real break. Move around. You earned it.",
    cta: "Start Focusing",
  },
}

export function BreakOverlay({ visible, onDismiss, mode }: BreakOverlayProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShow(true), 50)
      return () => clearTimeout(t)
    } else {
      setShow(false)
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [visible, onDismiss])

  if (!visible) return null

  const { title, subtitle, cta } = messages[mode]

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm transition-opacity duration-300',
        show ? 'opacity-100' : 'opacity-0'
      )}
      style={{ background: 'rgba(15, 15, 13, 0.85)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Timer finished"
    >
      <button
        onClick={onDismiss}
        className="absolute top-6 right-6 transition-colors cursor-pointer w-10 h-10 flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        className={cn(
          'flex flex-col items-center text-center max-w-sm transition-transform duration-300 animate-scale-in p-10 rounded-3xl',
          show ? 'translate-y-0' : 'translate-y-4'
        )}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}
        >
          <Coffee className="w-10 h-10" style={{ color: 'var(--accent)' }} />
        </div>

        <h2
          className="font-display font-bold text-3xl mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h2>
        <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="px-6 py-3 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer"
            style={{ background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-md)' }}
          >
            {cta}
          </button>
          <button
            onClick={onDismiss}
            className="px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
