'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimerMode, TimerState, TimerStatus } from '@/types'
import {
  TIMER_DURATIONS,
  computeTimeLeft,
  createTimerState,
  isTimerExpired,
} from '@/lib/timer'
import { updateFavicon, resetFavicon } from '@/lib/favicon'

interface UseTimerOptions {
  initialState: TimerState
  onTick?: (timeLeft: number) => void
  onExpire?: () => void
}

interface UseTimerReturn {
  timeLeft: number
  status: TimerStatus
  mode: TimerMode
  timerState: TimerState
  start: () => TimerState
  pause: () => TimerState
  reset: (durations?: Record<TimerMode, number>) => TimerState
  setMode: (mode: TimerMode, durations?: Record<TimerMode, number>) => TimerState
  applyState: (state: TimerState) => void
  skipAndStart: (nextMode: TimerMode, durations?: Record<TimerMode, number>) => TimerState
}

export function useTimer({
  initialState,
  onTick,
  onExpire,
}: UseTimerOptions): UseTimerReturn {
  const [timerState, setTimerState] = useState<TimerState>(initialState)
  const [timeLeft, setTimeLeft] = useState<number>(computeTimeLeft(initialState))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerStateRef = useRef<TimerState>(initialState)
  const expiredRef = useRef(false)
  const expireCalledRef = useRef(false)
  const onTickRef = useRef(onTick)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onTickRef.current = onTick
    onExpireRef.current = onExpire
  }, [onTick, onExpire])

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (timerState.status === 'running') {
      expiredRef.current = false
      expireCalledRef.current = false
      clearTimer()
      intervalRef.current = setInterval(() => {
        const left = computeTimeLeft(timerStateRef.current)
        setTimeLeft(left)
        onTickRef.current?.(left)
        if (left <= 0 && !expiredRef.current) {
          expiredRef.current = true
          clearTimer()
          setTimerState(current => ({ ...current, status: 'finished', timeLeft: 0 }))
        }
      }, 500)
    } else {
      clearTimer()
      const left = computeTimeLeft(timerState)
      setTimeLeft(left)
    }

    return clearTimer
  }, [timerState.status, timerState.startedAt, clearTimer])

  // Keep ref in sync so interval can read current state without stale closure
  useEffect(() => {
    timerStateRef.current = timerState
  }, [timerState])

  // Sync timeLeft for external state changes (applyState, pause, reset, etc.)
  // and fire onExpire when state transitions to finished
  useEffect(() => {
    const left = computeTimeLeft(timerState)
    setTimeLeft(left)
    if (timerState.status === 'finished' && !expireCalledRef.current) {
      expireCalledRef.current = true
      onExpireRef.current?.()
    }
  }, [timerState])

  const start = useCallback((): TimerState => {
    const now = Date.now()
    const newState: TimerState = {
      ...timerStateRef.current,
      status: 'running',
      startedAt: now,
      pausedAt: null,
    }
    setTimerState(newState)
    expiredRef.current = false
    return newState
  }, []) // no deps — reads from ref

  const pause = useCallback((): TimerState => {
    const now = Date.now()
    const left = computeTimeLeft(timerState)
    const newState: TimerState = {
      ...timerState,
      status: 'paused',
      timeLeft: left,
      pausedAt: now,
      startedAt: null,
    }
    setTimerState(newState)
    return newState
  }, [timerState])

  const reset = useCallback((durations?: Record<TimerMode, number>): TimerState => {
    const newState = createTimerState(timerState.mode, durations)
    setTimerState(newState)
    expiredRef.current = false
    return newState
  }, [timerState.mode])

  const setMode = useCallback((mode: TimerMode, durations?: Record<TimerMode, number>): TimerState => {
    const newState = createTimerState(mode, durations)
    setTimerState(newState)
    expiredRef.current = false
    return newState
  }, [])

  const skipAndStart = useCallback((nextMode: TimerMode, durations?: Record<TimerMode, number>): TimerState => {
    const totalTime = durations?.[nextMode] ?? TIMER_DURATIONS[nextMode]
    const newState: TimerState = {
      mode: nextMode,
      status: 'running',
      timeLeft: totalTime,
      totalTime,
      startedAt: Date.now(),
      pausedAt: null,
    }
    setTimerState(newState)
    expiredRef.current = false
    return newState
  }, [])

  const applyState = useCallback((state: TimerState) => {
    // Skip redundant re-apply — avoids restarting the interval when timer is
    // already running with the same anchor (e.g., host re-broadcasts on join)
    if (
      state.status === 'running' &&
      timerStateRef.current.status === 'running' &&
      state.startedAt === timerStateRef.current.startedAt
    ) {
      return
    }
    setTimerState(state)
    setTimeLeft(computeTimeLeft(state))
    if (isTimerExpired(state)) {
      expiredRef.current = true
      expireCalledRef.current = true // remote expiry — do not fire onExpire locally
    }
  }, [])

  // Dynamic document.title + canvas favicon
  useEffect(() => {
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
    const secs = String(timeLeft % 60).padStart(2, '0')

    const modeLabel: Record<TimerMode, string> = {
      focus: '🍅 Focus',
      short: '☕ Short Break',
      long: '🎉 Long Break',
    }

    if (timeLeft > 0 && timerState.status !== 'idle') {
      document.title = `${mins}:${secs} ${modeLabel[timerState.mode]} | PomodoroJam`
    } else {
      document.title = 'PomodoroJam 🍅'
    }

    return () => {
      document.title = 'PomodoroJam 🍅'
    }
  }, [timeLeft, timerState.mode, timerState.status])

  // Canvas favicon
  useEffect(() => {
    if (timerState.status === 'running' || (timerState.status === 'paused' && timeLeft > 0)) {
      updateFavicon(timeLeft, timerState.mode)
    } else {
      resetFavicon()
    }
  }, [timeLeft, timerState.mode, timerState.status])

  // Reset on unmount
  useEffect(() => {
    return () => {
      resetFavicon()
      document.title = 'PomodoroJam 🍅'
    }
  }, [])

  return {
    timeLeft,
    status: timerState.status,
    mode: timerState.mode,
    timerState,
    start,
    pause,
    reset,
    setMode,
    applyState,
    skipAndStart,
  }
}
