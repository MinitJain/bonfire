'use client'

import type { BonfireMode, BonfirePhase } from '@/types'
import { formatTime } from '@/lib/timer'
import { cn } from '@/lib/utils'

interface TimerDisplayProps {
  timeLeft: number
  /** Length of the current phase, seconds. */
  totalTime: number
  running: boolean
  /** Paused part-way through a phase (as opposed to not yet started). */
  started: boolean
  phase: BonfirePhase
  mode: BonfireMode
  /** 1-indexed focus round, as the server counts it. */
  round: number
  roundsBeforeLong: number
  /** This person's pomodoros today, across all Bonfires (null until known). */
  todayCount: number | null
}

export const PHASE_LABEL: Record<BonfirePhase, string> = {
  focus: 'Focusing',
  short: 'Short rest',
  long: 'Long rest',
}

/** Share of the current phase that has passed, 0..1. */
export function phaseProgress(timeLeft: number, totalTime: number): number {
  if (totalTime <= 0) return 0
  return Math.min(1, Math.max(0, (totalTime - timeLeft) / totalTime))
}

/**
 * Where the fire is in its set of rounds: rounds before the current one are
 * done; the current one is done once its focus is over (during its rest).
 * Mirrors complete_phase, which takes the long rest when round % rounds = 0.
 */
export function roundPosition(round: number, roundsBeforeLong: number): number {
  const total = Math.max(1, roundsBeforeLong)
  return ((Math.max(1, round) - 1) % total) + 1
}

export function roundMarks(round: number, roundsBeforeLong: number, phase: BonfirePhase): ('done' | 'now' | 'ahead')[] {
  const total = Math.max(1, roundsBeforeLong)
  const position = roundPosition(round, total)
  return Array.from({ length: total }, (_, i) => {
    const n = i + 1
    if (n < position) return 'done'
    if (n === position) return phase === 'focus' ? 'now' : 'done'
    return 'ahead'
  })
}

export function TimerDisplay({
  timeLeft,
  totalTime,
  running,
  started,
  phase,
  mode,
  round,
  roundsBeforeLong,
  todayCount,
}: TimerDisplayProps) {
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const progress = phaseProgress(timeLeft, totalTime)
  const marks = roundMarks(round, roundsBeforeLong, phase)
  const minutesLeft = Math.ceil(timeLeft / 60)

  return (
    <div className="bf-timer">
      <span
        className={cn('bf-time', !running && 'is-paused')}
        role="timer"
        aria-label={`${minutes} minutes ${seconds} seconds remaining`}
      >
        {formatTime(timeLeft)}
      </span>

      <div
        className="bf-progress"
        data-phase={phase}
        role="progressbar"
        aria-label={`${PHASE_LABEL[phase]} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={`${minutesLeft} ${minutesLeft === 1 ? 'minute' : 'minutes'} left`}
      >
        {/* Remount per phase so the fill never animates backwards into a new phase */}
        <span
          key={`${phase}-${round}`}
          className={cn('bf-progress-fill', running && 'is-running')}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <span className="bf-phase">
        {PHASE_LABEL[phase]}
        {!running && started && timeLeft > 0 && <span> · paused</span>}
      </span>

      <span className="bf-rounds">
        <span
          className="bf-round-marks"
          role="img"
          aria-label={`Round ${roundPosition(round, roundsBeforeLong)} of ${marks.length} before the long rest`}
        >
          {marks.map((m, i) => (
            <span key={i} className={cn('bf-round-mark', `is-${m}`)} />
          ))}
        </span>
        {todayCount !== null && todayCount > 0 && (
          <span
            className="bf-pomodoros"
            title="Your completed pomodoros today, across every Bonfire"
            aria-label={`${todayCount} ${todayCount === 1 ? 'pomodoro' : 'pomodoros'} completed today`}
          >
            {todayCount} today
          </span>
        )}
      </span>

      {mode === 'jam' && <span className="bf-mode-note">everyone can tend the fire</span>}
    </div>
  )
}
