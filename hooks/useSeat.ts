'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getParticipantToken,
  joinBonfire,
  leaveBonfire,
  storeParticipantToken,
  touchSeat,
  type SeatClaim,
} from '@/lib/bonfire'
import type { SeatIndex } from '@/types'

export type SeatStatus = 'waiting' | 'joining' | 'seated' | 'full' | 'ended' | 'error' | 'left'

const HEARTBEAT_MS = 30_000

interface UseSeatOptions {
  bonfireId: string
  /** Display name. The seat is not claimed until a name is known. */
  name: string | null
  enabled: boolean
}

interface UseSeatReturn {
  status: SeatStatus
  seat: SeatIndex | null
  /** Participant credential for this bonfire (jam control, heartbeat, leave). */
  token: string | null
  retry: () => void
  release: () => Promise<void>
}

// One claim in flight per bonfire, so a double-mounted effect (StrictMode)
// does not claim two seats.
const inflight = new Map<string, Promise<{ data: SeatClaim | null; error: string | null }>>()

function claim(bonfireId: string, name: string) {
  const key = `${bonfireId}:${name}`
  let p = inflight.get(key)
  if (!p) {
    p = joinBonfire(bonfireId, name, getParticipantToken(bonfireId)).finally(() => {
      inflight.delete(key)
    })
    inflight.set(key, p)
  }
  return p
}

function statusFromError(message: string): SeatStatus {
  const m = message.toLowerCase()
  if (m.includes('full')) return 'full'
  if (m.includes('ended')) return 'ended'
  return 'error'
}

/**
 * Claims one of the six seats around the fire via join_bonfire, keeps it
 * alive with a heartbeat and releases it on Step away. The server enforces
 * the six participant maximum and assigns the seat.
 */
export function useSeat({ bonfireId, name, enabled }: UseSeatOptions): UseSeatReturn {
  const [status, setStatus] = useState<SeatStatus>('waiting')
  const [seat, setSeat] = useState<SeatIndex | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const releasedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !name || releasedRef.current) return
    let cancelled = false
    setStatus('joining')

    claim(bonfireId, name).then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) {
        setStatus(statusFromError(error ?? ''))
        return
      }
      storeParticipantToken(bonfireId, data.participant_token)
      setToken(data.participant_token)
      setSeat(data.seat)
      setStatus('seated')
    })

    return () => {
      cancelled = true
    }
  }, [bonfireId, name, enabled, attempt])

  // Heartbeat: keep the seat while the page is open. A lapsed seat is reclaimed.
  useEffect(() => {
    if (status !== 'seated' || !token) return

    async function beat() {
      if (releasedRef.current || !token) return
      const { data, error } = await touchSeat(bonfireId, token)
      if (!error && data === false && !releasedRef.current) {
        setAttempt(a => a + 1)
      }
    }

    const interval = setInterval(beat, HEARTBEAT_MS)
    function onVisible() {
      if (document.visibilityState === 'visible') void beat()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [status, token, bonfireId])

  const retry = useCallback(() => setAttempt(a => a + 1), [])

  const release = useCallback(async () => {
    releasedRef.current = true
    setStatus('left')
    if (token) await leaveBonfire(bonfireId, token)
  }, [bonfireId, token])

  return { status, seat, token, retry, release }
}
