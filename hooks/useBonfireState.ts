'use client'

import { useEffect, useRef, useState } from 'react'
import type { TimerStatus, TimerMode } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BonfireInput {
  status: TimerStatus
  mode: TimerMode
  focusCount: number
  participantCount: number
  accountabilityMode?: boolean
}

export interface BonfireOutput {
  targetIntensity: number
  flameLabel: string
  isSurging: boolean
  tabHiddenMs: number
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function baseIntensityFor(status: TimerStatus, mode: TimerMode): number {
  if (status === 'running' && mode === 'focus') return 0.28  // starts small, grows via surges
  if (status === 'running' && mode === 'short') return 0.08  // calm embers — earned rest
  if (status === 'running' && mode === 'long')  return 0.04  // near-dormant — deep rest
  if (status === 'paused') return 0.10
  if (status === 'finished') return 0.05
  return 0.02                              // idle
}

function flameLabelFor(
  status: TimerStatus,
  mode: TimerMode,
  isSurging: boolean,
  intensity: number,
): string {
  if (status === 'idle') return 'DORMANT'
  if (status === 'paused') return 'FADING'
  if (status === 'finished') return 'FADING'
  if (status === 'running' && mode === 'short') return 'RESTING'
  if (status === 'running' && mode === 'long')  return 'COOLING'
  if (status === 'running' && mode === 'focus') {
    if (isSurging || intensity >= 0.9) return 'BLAZING'
    return 'THRIVING'
  }
  return ''
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Maps timer state + presence into bonfire visual state.
 *
 * MERN comparison: this is like a Redux selector that derives UI state
 * from multiple inputs — but as a React hook with side-effect-driven
 * transient boosts (surges, dips) that self-reset via setTimeout.
 *
 * Key design: targetIntensity is a step-function that changes on discrete
 * events. The Three.js component lerps toward it smoothly in useFrame —
 * so React never has to re-render 60× per second.
 *
 * Interview angle: "Separate the discrete event logic (React state + hooks)
 * from the continuous animation (useFrame refs). Never call setState inside
 * an animation loop — it forces a React reconciliation every frame."
 */
export function useBonfireState({
  status,
  mode,
  focusCount,
  participantCount,
  accountabilityMode = false,
}: BonfireInput): BonfireOutput {
  const [intensityBoost, setIntensityBoost] = useState(0)
  const [isSurging, setIsSurging] = useState(false)
  const [accountabilityDecay, setAccountabilityDecay] = useState(0)
  const [tabHiddenMs, setTabHiddenMs] = useState(0)

  const prevFocusCountRef      = useRef(focusCount)
  const prevParticipantRef     = useRef(participantCount)
  const tabHiddenAtRef         = useRef<number | null>(null)
  const surgeTimerRef          = useRef<ReturnType<typeof setTimeout> | null>(null)
  const accountabilityRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Pomodoro complete → surge ─────────────────────────────────────────────
  useEffect(() => {
    if (focusCount > prevFocusCountRef.current) {
      setIsSurging(true)
      setIntensityBoost(0.35)
      if (surgeTimerRef.current) clearTimeout(surgeTimerRef.current)
      surgeTimerRef.current = setTimeout(() => {
        setIsSurging(false)
        setIntensityBoost(0)
      }, 2000)
    }
    prevFocusCountRef.current = focusCount
  }, [focusCount])

  // ── Participant join / leave → brief intensity delta ──────────────────────
  useEffect(() => {
    const prev = prevParticipantRef.current
    prevParticipantRef.current = participantCount

    if (participantCount > prev) {
      // Someone joined: brief surge
      setIntensityBoost(b => Math.min(b + 0.12, 0.35))
      const t = setTimeout(() => setIntensityBoost(b => Math.max(b - 0.12, 0)), 1500)
      return () => clearTimeout(t)
    }
    if (participantCount < prev && participantCount >= 1) {
      // Someone left: brief dip then recover
      setIntensityBoost(b => b - 0.08)
      const t = setTimeout(() => setIntensityBoost(b => b + 0.08), 1500)
      return () => clearTimeout(t)
    }
  }, [participantCount])

  // ── Tab visibility ────────────────────────────────────────────────────────
  // Day 14: Page Visibility API — track hidden time, fire return surge,
  // optional accountability mode decay.
  //
  // Why NOT kill the fire on hide: users do their actual work in other
  // apps/tabs. Hiding ≠ slacking. Only track + reward return.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        tabHiddenAtRef.current = Date.now()

        // Accountability mode: gradual decay while away
        if (accountabilityMode && status === 'running' && mode === 'focus') {
          accountabilityRef.current = setInterval(() => {
            setAccountabilityDecay(d => Math.min(d + 0.008, 0.55))
          }, 1000)
        }
      } else {
        // Tab returned
        if (tabHiddenAtRef.current !== null) {
          setTabHiddenMs(ms => ms + (Date.now() - (tabHiddenAtRef.current as number)))
          tabHiddenAtRef.current = null
        }
        if (accountabilityRef.current) {
          clearInterval(accountabilityRef.current)
          accountabilityRef.current = null
        }
        // Always recover from any accountability decay on return
        setAccountabilityDecay(0)

        // Return surge — (B from plan) reward coming back
        if (status === 'running') {
          setIntensityBoost(b => b + 0.15)
          setTimeout(() => setIntensityBoost(b => Math.max(b - 0.15, 0)), 1500)
        }
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (accountabilityRef.current) clearInterval(accountabilityRef.current)
    }
  }, [accountabilityMode, status, mode])

  // Reset hidden time counter when session resets to idle
  useEffect(() => {
    if (status === 'idle') setTabHiddenMs(0)
  }, [status])

  // ── Derive final intensity ────────────────────────────────────────────────
  const base             = baseIntensityFor(status, mode)
  const participantBonus = Math.min((participantCount - 1) * 0.08, 0.24)
  const targetIntensity  = Math.max(0, Math.min(1,
    base + participantBonus + intensityBoost - accountabilityDecay
  ))

  return {
    targetIntensity,
    flameLabel: flameLabelFor(status, mode, isSurging, targetIntensity),
    isSurging,
    tabHiddenMs,
  }
}
