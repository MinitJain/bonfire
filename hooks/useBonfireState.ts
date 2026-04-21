'use client'

import { useEffect, useRef, useState } from 'react'
import type { TimerStatus, TimerMode } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BonfireInput {
  status: TimerStatus
  mode: TimerMode
  focusCount: number
  participantCount: number
  timeLeft: number   // seconds remaining in current timer
  totalTime: number  // total seconds for current timer
}

export interface BonfireOutput {
  targetIntensity: number
  flameLabel: string
  isSurging: boolean
  tabHiddenMs: number
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function flameLabelFor(
  status: TimerStatus,
  mode: TimerMode,
  intensity: number,
): string {
  if (status === 'idle') return 'DORMANT'
  if (status === 'paused') return 'PAUSED'
  if (status === 'finished') return 'FADING'
  if (status === 'running' && mode === 'short') return 'RESTING'
  if (status === 'running' && mode === 'long')  return 'COOLING'
  if (status === 'running' && mode === 'focus') {
    if (intensity >= 0.72) return 'BLAZING'
    if (intensity >= 0.50) return 'THRIVING'
    if (intensity >= 0.30) return 'GROWING'
    return 'KINDLING'
  }
  return ''
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Maps timer state + presence into bonfire visual state.
 *
 * Intensity is driven by timer progress (0 → 1 as timer counts down),
 * so the flame grows organically from a small flicker at the start of each
 * focus session to a full blaze near the end. On completion the flame resets.
 * Each pomodoro is independent — no state carries over between sessions.
 */
export function useBonfireState({
  status,
  mode,
  focusCount,
  participantCount,
  timeLeft,
  totalTime,
}: BonfireInput): BonfireOutput {
  const [intensityBoost, setIntensityBoost] = useState(0)
  const [isSurging, setIsSurging] = useState(false)
  const [tabHiddenMs, setTabHiddenMs] = useState(0)

  const prevFocusCountRef  = useRef(focusCount)
  const prevParticipantRef = useRef(participantCount)
  const tabHiddenAtRef     = useRef<number | null>(null)
  const surgeTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const returnSurgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Pomodoro complete → trigger CompletionGlow visual only (no intensity boost) ──
  useEffect(() => {
    if (focusCount > prevFocusCountRef.current) {
      setIsSurging(true)
      if (surgeTimerRef.current) clearTimeout(surgeTimerRef.current)
      surgeTimerRef.current = setTimeout(() => setIsSurging(false), 2000)
    }
    prevFocusCountRef.current = focusCount
  }, [focusCount])

  // ── Participant join / leave → brief intensity delta ──────────────────────
  useEffect(() => {
    const prev = prevParticipantRef.current
    prevParticipantRef.current = participantCount

    if (participantCount > prev) {
      setIntensityBoost(b => Math.min(b + 0.08, 0.18))
      const t = setTimeout(() => setIntensityBoost(b => Math.max(b - 0.08, 0)), 1500)
      return () => clearTimeout(t)
    }
    if (participantCount < prev && participantCount >= 1) {
      setIntensityBoost(b => b - 0.05)
      const t = setTimeout(() => setIntensityBoost(b => b + 0.05), 1500)
      return () => clearTimeout(t)
    }
  }, [participantCount])

  // ── Tab visibility ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        tabHiddenAtRef.current = Date.now()
      } else {
        if (tabHiddenAtRef.current !== null) {
          setTabHiddenMs(ms => ms + (Date.now() - (tabHiddenAtRef.current as number)))
          tabHiddenAtRef.current = null
        }
        if (status === 'running') {
          setIntensityBoost(b => b + 0.10)
          if (returnSurgeTimerRef.current) clearTimeout(returnSurgeTimerRef.current)
          returnSurgeTimerRef.current = setTimeout(
            () => setIntensityBoost(b => Math.max(b - 0.10, 0)),
            1500,
          )
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (returnSurgeTimerRef.current) clearTimeout(returnSurgeTimerRef.current)
    }
  }, [status])

  // Reset hidden time counter when session goes idle
  useEffect(() => {
    if (status === 'idle') setTabHiddenMs(0)
  }, [status])

  // ── Derive final intensity ─────────────────────────────────────────────────
  // Progress: 0 = just started, 1 = timer complete.
  // Intensity grows from 0.12 (small flame) to 0.85 (full blaze) as timer runs down.
  // Each new focus session starts fresh from progress=0 regardless of history.
  const progress = totalTime > 0
    ? Math.max(0, Math.min(1, (totalTime - timeLeft) / totalTime))
    : 0

  const participantBonus = Math.min((participantCount - 1) * 0.05, 0.15)

  let base: number
  if (mode === 'focus') {
    const progressIntensity = 0.12 + progress * 0.73   // 0.12 at start → 0.85 at end
    if (status === 'running') base = progressIntensity
    else if (status === 'paused') base = progressIntensity * 0.75  // hold progress, slightly dimmed
    else base = 0.02
  } else if (status === 'running' && mode === 'short') {
    base = 0.08
  } else if (status === 'running' && mode === 'long') {
    base = 0.04
  } else if (status === 'paused') {
    base = 0.08
  } else if (status === 'finished') {
    base = 0.05
  } else {
    base = 0.02  // idle
  }

  const targetIntensity = Math.max(0, Math.min(1, base + participantBonus + intensityBoost))

  return {
    targetIntensity,
    flameLabel: flameLabelFor(status, mode, targetIntensity),
    isSurging,
    tabHiddenMs,
  }
}
