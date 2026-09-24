'use client'

import type { BonfireMode, BonfirePhase } from '@/types'
import { formatTime } from '@/lib/timer'
import { cn } from '@/lib/utils'

interface TimerDisplayProps {
  timeLeft: number
  running: boolean
  /** Paused part-way through a phase (as opposed to not yet started). */
  started: boolean
  phase: BonfirePhase
  mode: BonfireMode
}

export const PHASE_LABEL: Record<BonfirePhase, string> = {
  focus: 'Focusing',
  short: 'Short rest',
  long: 'Long rest',
}

export function TimerDisplay({ timeLeft, running, started, phase, mode }: TimerDisplayProps) {
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="bf-timer">
      <span
        className={cn('bf-time', !running && 'is-paused')}
        role="timer"
        aria-label={`${minutes} minutes ${seconds} seconds remaining`}
      >
        {formatTime(timeLeft)}
      </span>
      <span className="bf-phase">
        {PHASE_LABEL[phase]}
        {!running && started && timeLeft > 0 && <span> · paused</span>}
      </span>
      {mode === 'jam' && <span className="bf-mode-note">everyone can tend the fire</span>}
    </div>
  )
}
