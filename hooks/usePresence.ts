'use client'

import { useEffect, useRef } from 'react'
import type { BonfireChannel, PresencePayload } from '@/hooks/useBonfireChannel'

interface UsePresenceOptions {
  channel: BonfireChannel
  /** What to publish about ourselves. null = not seated, do not appear. */
  self: Omit<PresencePayload, 'joined_at'> | null
}

/**
 * Publishes this participant's presence on the shared bonfire channel.
 *
 * Presence is purely visual: it decides who is drawn around the fire,
 * never who may control the timer. Re-tracks on reconnect and when the
 * tab becomes visible again so background tabs keep their place.
 */
export function usePresence({ channel, self }: UsePresenceOptions): void {
  const joinedAtRef = useRef<string | null>(null)
  const { isConnected, track, untrack } = channel

  const username = self?.username ?? null
  const isInitiator = self?.is_initiator ?? false
  const seat = self?.seat ?? null
  const present = self !== null

  useEffect(() => {
    if (!isConnected) return
    if (!present || username === null) {
      if (joinedAtRef.current) {
        joinedAtRef.current = null
        void untrack()
      }
      return
    }

    joinedAtRef.current ??= new Date().toISOString()
    const payload: PresencePayload = {
      username,
      joined_at: joinedAtRef.current,
      is_initiator: isInitiator,
      seat,
    }
    void track(payload)

    function handleVisibility() {
      if (document.visibilityState === 'visible') void track(payload)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isConnected, present, username, isInitiator, seat, track, untrack])
}
