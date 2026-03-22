import { formatTime } from '@/lib/timer'
import { cn } from '@/lib/utils'
import type { TimerMode } from '@/types'

interface TimerDisplayProps {
  timeLeft: number // seconds
  status?: 'idle' | 'running' | 'paused' | 'finished'
  mode?: TimerMode
  className?: string
}

export function TimerDisplay({ timeLeft, status, mode = 'focus', className }: TimerDisplayProps) {
  const formatted = formatTime(timeLeft)

  const modeLabel: Record<TimerMode, string> = {
    focus: 'FOCUS',
    short: 'SHORT BREAK',
    long: 'LONG BREAK',
  }

  return (
    <div
      className={cn('flex flex-col items-center gap-2', className)}
      aria-label={`Timer: ${formatted}`}
      role="timer"
    >
      <span
        className={cn(
          'font-mono text-6xl sm:text-7xl font-bold tracking-tight',
          'transition-colors duration-300',
          status === 'running' && 'text-foreground',
          status === 'paused' && 'text-[color:var(--text-muted)]',
          status === 'idle' && 'text-[color:var(--text-secondary)]',
          status === 'finished' && 'text-brand',
          !status && 'text-foreground',
        )}
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {formatted}
      </span>
      <span
        className="text-xs font-sans tracking-[0.12em] uppercase"
        style={{ color: 'var(--text-muted)' }}
      >
        {modeLabel[mode]}
      </span>
    </div>
  )
}
