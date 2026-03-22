import { cn } from '@/lib/utils'
import type { TimerMode } from '@/types'

interface ModeSelectorProps {
  mode: TimerMode
  isHost: boolean
  onChange: (mode: TimerMode) => void
  className?: string
}

const modes: { value: TimerMode; label: string }[] = [
  { value: 'focus', label: 'Focus' },
  { value: 'short', label: 'Short' },
  { value: 'long', label: 'Long' },
]

export function ModeSelector({ mode, isHost, onChange, className }: ModeSelectorProps) {
  return (
    <div
      className={cn('inline-flex items-center p-1 rounded-full', className)}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
      }}
      role="tablist"
      aria-label="Timer mode"
    >
      {modes.map(({ value, label }) => {
        const isActive = mode === value
        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            disabled={!isHost}
            onClick={() => isHost && onChange(value)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 select-none cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50',
              isActive
                ? 'shadow-sm'
                : 'hover:text-[color:var(--text-primary)]',
              !isHost && 'cursor-default',
            )}
            style={
              isActive
                ? {
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-sm)',
                  }
                : {
                    color: 'var(--text-muted)',
                  }
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
