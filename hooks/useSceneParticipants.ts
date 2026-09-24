'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { assignSeats } from '@/lib/seats'
import type { BonfireParticipant, SeatIndex } from '@/types'

export const LEAVE_ANIMATION_MS = 700

export interface SceneParticipant {
  participant: BonfireParticipant
  seat: SeatIndex
  leaving: boolean
}

/**
 * Participants as they should be drawn around the fire.
 *
 * Someone who leaves presence stays in the scene, flagged `leaving`, long
 * enough for their exit animation to finish, and keeps the seat they had.
 */
export function useSceneParticipants(participants: BonfireParticipant[]): SceneParticipant[] {
  const seats = useMemo(() => assignSeats(participants), [participants])
  const [departing, setDeparting] = useState<SceneParticipant[]>([])
  const previousRef = useRef<Map<string, SceneParticipant>>(new Map())
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const present = useMemo<SceneParticipant[]>(() => {
    const list: SceneParticipant[] = []
    for (const p of participants) {
      const seat = seats.get(p.key)
      if (seat !== undefined) list.push({ participant: p, seat, leaving: false })
    }
    return list
  }, [participants, seats])

  useEffect(() => {
    const now = new Map(present.map(e => [e.participant.key, e]))
    const timers = timersRef.current

    // Someone who came back before their exit finished is simply present again
    for (const key of Array.from(now.keys())) {
      const t = timers.get(key)
      if (t) {
        clearTimeout(t)
        timers.delete(key)
      }
    }
    setDeparting(prev => prev.filter(d => !now.has(d.participant.key)))

    for (const [key, entry] of Array.from(previousRef.current)) {
      if (now.has(key) || timers.has(key)) continue
      setDeparting(prev => [...prev, { ...entry, leaving: true }])
      timers.set(key, setTimeout(() => {
        timers.delete(key)
        setDeparting(prev => prev.filter(d => d.participant.key !== key))
      }, LEAVE_ANIMATION_MS))
    }

    previousRef.current = now
  }, [present])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach(t => clearTimeout(t))
      timers.clear()
    }
  }, [])

  return useMemo(() => {
    // A newcomer may take a seat someone is still leaving; drop that ghost
    const occupied = new Set(present.map(e => e.seat))
    return [...present, ...departing.filter(d => !occupied.has(d.seat))]
  }, [present, departing])
}
