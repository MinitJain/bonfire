'use client'

import { AnimatePresence, motion } from 'motion/react'
import { PRESS } from '@/lib/motion'

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
 * Start/Pause is the one key; Skip stays text weight. Shown only to people who may tend the fire;
 * the RPCs authorize every command regardless.
 */
export function TimerControls({ running, started, canControl, onStart, onPause, onSkip }: TimerControlsProps) {
  if (!canControl) return <div className="bf-controls" aria-hidden="true" />

  return (
    <div className="bf-controls">
      <AnimatePresence mode="popLayout" initial={false}>
        {running ? (
          <motion.button key="pause" type="button" className="bf-btn-secondary" onClick={onPause}
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} {...PRESS}>
            Pause
          </motion.button>
        ) : (
          <motion.button key="start" type="button" className="bf-btn-primary" onClick={onStart}
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} {...PRESS}>
            {started ? 'Resume' : 'Start'}
          </motion.button>
        )}
      </AnimatePresence>
      <button type="button" className="bf-text-btn" onClick={onSkip}>
        Skip
      </button>
    </div>
  )
}
