'use client'

import { useEffect, useRef, useState } from 'react'
import { computeTimeLeft } from '@/lib/timer'
import type { BonfireState } from '@/types'

export function phaseDuration(state: BonfireState): number {
  switch (state.phase) {
    case 'focus': return state.focus_duration
    case 'short': return state.short_duration
    case 'long': return state.long_duration
  }
}

function remaining(state: BonfireState): number {
  return computeTimeLeft({
    mode: state.phase,
    status: state.running ? 'running' : 'paused',
    timeLeft: state.time_left,
    totalTime: phaseDuration(state),
    startedAt: state.started_at,
    pausedAt: null,
  })
}

/**
 * Clock-based countdown derived from authoritative state.
 *
 * time_remaining = time_left - (now - started_at). The interval only
 * refreshes the display; when it observes zero, onExpire asks the server
 * (complete_phase) to transition. The client never decides the next phase.
 */
export function useCountdown(state: BonfireState, onExpire: () => void): number {
  const [timeLeft, setTimeLeft] = useState(() => remaining(state))
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  const { running, started_at, time_left, phase, focus_duration, short_duration, long_duration } = state

  useEffect(() => {
    const snapshot = { ...state }
    setTimeLeft(remaining(snapshot))
    if (!running || !started_at) return

    function tick() {
      const left = remaining(snapshot)
      setTimeLeft(left)
      if (left <= 0) {
        clearInterval(interval)
        onExpireRef.current()
      }
    }

    const interval = setInterval(tick, 500)
    function onVisible() {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- state fields listed individually
  }, [running, started_at, time_left, phase, focus_duration, short_duration, long_duration])

  return timeLeft
}
