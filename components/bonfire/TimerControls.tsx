'use client'

interface TimerControlsProps {
  running: boolean
  /** Paused part-way through a phase (as opposed to not yet started). */
  started: boolean
  canControl: boolean
  onStart: () => void
  onPause: () => void
  onSkip: () => void
}

/**
 * Calm, text-weight controls. Shown only to people who may tend the fire;
 * the RPCs authorize every command regardless.
 */
export function TimerControls({ running, started, canControl, onStart, onPause, onSkip }: TimerControlsProps) {
  if (!canControl) return <div className="bf-controls" aria-hidden="true" />

  return (
    <div className="bf-controls">
      {running ? (
        <button type="button" className="bf-text-btn" onClick={onPause}>
          Pause
        </button>
      ) : (
        <button type="button" className="bf-btn-primary" onClick={onStart}>
          {started ? 'Resume' : 'Start'}
        </button>
      )}
      <span className="bf-sep" aria-hidden="true">·</span>
      <button type="button" className="bf-text-btn" onClick={onSkip}>
        Skip
      </button>
    </div>
  )
}
