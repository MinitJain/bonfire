'use client'

import { useEffect, useRef } from 'react'
import type { BonfireChannel, PresencePayload } from '@/hooks/useBonfireChannel'

/**
 * Re-tracks (a character change, say) wait for a pause: Realtime closes the
 * channel with "presence rate limit exceeded" when one client tracks in a burst.
 */
export const RETRACK_DELAY_MS = 600

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
  const character = self?.character ?? null
  // Compared by value so a re-created but identical choice doesn't re-track
  const characterJson = JSON.stringify(character)
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

    const retrack = joinedAtRef.current !== null
    joinedAtRef.current ??= new Date().toISOString()
    const payload: PresencePayload = {
      username,
      joined_at: joinedAtRef.current,
      is_initiator: isInitiator,
      seat,
      character: JSON.parse(characterJson),
    }
    const timer = setTimeout(() => void track(payload), retrack ? RETRACK_DELAY_MS : 0)

    function handleVisibility() {
      if (document.visibilityState === 'visible') void track(payload)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isConnected, present, username, isInitiator, seat, characterJson, track, untrack])
}
