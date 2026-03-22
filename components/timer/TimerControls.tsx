import { Play, Pause, SkipForward, RotateCcw, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimerStatus } from '@/types'

interface TimerControlsProps {
  status: TimerStatus
  isHost: boolean
  jamMode: boolean
  onPlay: () => void
  onPause: () => void
  onSkip: () => void
  onReset: () => void
  className?: string
}

const iconButtonBase =
  'w-12 h-12 flex items-center justify-center rounded-full border transition-all duration-150 cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50'

export function TimerControls({
  status,
  isHost,
  jamMode,
  onPlay,
  onPause,
  onSkip,
  onReset,
  className,
}: TimerControlsProps) {
  const canControl = isHost || jamMode

  if (!canControl) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          <Eye className="w-4 h-4" />
          Following along
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-center gap-4', className)}>
      {/* Reset */}
      <button
        onClick={onReset}
        title="Reset timer"
        aria-label="Reset timer"
        className={iconButtonBase}
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
        }}
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Play / Pause — main CTA */}
      {status === 'running' ? (
        <button
          onClick={onPause}
          title="Pause"
          aria-label="Pause timer"
          className="w-20 h-20 flex items-center justify-center rounded-full border-0 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50"
          style={{
            background: 'var(--accent)',
            boxShadow: 'var(--shadow-md)',
            color: '#fff',
            transform: 'scale(1)',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
          }}
          onMouseDown={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'
          }}
          onMouseUp={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'
          }}
        >
          <Pause className="w-7 h-7" />
        </button>
      ) : (
        <button
          onClick={onPlay}
          title={status === 'paused' ? 'Resume' : 'Start'}
          aria-label={status === 'paused' ? 'Resume timer' : 'Start timer'}
          className="w-20 h-20 flex items-center justify-center rounded-full border-0 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50"
          style={{
            background: 'var(--accent)',
            boxShadow: 'var(--shadow-md)',
            color: '#fff',
            transform: 'scale(1)',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
          }}
          onMouseDown={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'
          }}
          onMouseUp={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'
          }}
        >
          <Play className="w-7 h-7 ml-1" />
        </button>
      )}

      {/* Skip */}
      <button
        onClick={onSkip}
        title="Skip to next"
        aria-label="Skip to next session"
        className={iconButtonBase}
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
        }}
      >
        <SkipForward className="w-4 h-4" />
      </button>
    </div>
  )
}
