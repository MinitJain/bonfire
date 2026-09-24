'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { isSeatIndex } from '@/lib/seats'
import type { BonfireParticipant, BonfireState } from '@/types'

export interface PresencePayload {
  username: string
  joined_at: string
  is_initiator: boolean
  seat: number | null
}

interface UseBonfireChannelOptions {
  bonfireId: string
  /** Stable per-person presence key. The channel is not opened until it is known. */
  presenceKey: string | null
  /** Called with every database-originated state_update broadcast. */
  onStateUpdate: (state: BonfireState) => void
}

export interface BonfireChannel {
  participants: BonfireParticipant[]
  isConnected: boolean
  /** True once the channel has been subscribed at least once. */
  hasConnected: boolean
  track: (payload: PresencePayload) => Promise<void>
  untrack: () => Promise<void>
}

/**
 * The single Realtime channel for a bonfire: `bonfire:{id}`.
 *
 * realtime-js returns the existing channel when a topic is requested twice,
 * so the broadcast listener (server state) and the presence listener must be
 * registered on one channel instance, before subscribe(). This hook owns that
 * instance. Clients only receive state_update; they never broadcast state.
 */
export function useBonfireChannel({
  bonfireId,
  presenceKey,
  onStateUpdate,
}: UseBonfireChannelOptions): BonfireChannel {
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onStateUpdateRef = useRef(onStateUpdate)
  const [participants, setParticipants] = useState<BonfireParticipant[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [hasConnected, setHasConnected] = useState(false)

  useEffect(() => {
    onStateUpdateRef.current = onStateUpdate
  }, [onStateUpdate])

  useEffect(() => {
    if (!presenceKey) return

    const channel = supabase.channel(`bonfire:${bonfireId}`, {
      config: { presence: { key: presenceKey } },
    })
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'state_update' }, ({ payload }) => {
        onStateUpdateRef.current(payload as BonfireState)
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresencePayload>()
        const list: BonfireParticipant[] = []
        for (const [key, presences] of Object.entries(state)) {
          // Several tabs of one person share a key; the newest entry wins
          const p = presences[presences.length - 1]
          if (!p) continue
          list.push({
            key,
            username: p.username ?? null,
            joined_at: p.joined_at ?? new Date(0).toISOString(),
            is_initiator: p.is_initiator === true,
            seat: isSeatIndex(p.seat) ? p.seat : null,
          })
        }
        setParticipants(list)
      })
      .subscribe((status) => {
        const connected = status === 'SUBSCRIBED'
        setIsConnected(connected)
        if (connected) setHasConnected(true)
      })

    return () => {
      channelRef.current = null
      setIsConnected(false)
      setParticipants([])
      supabase.removeChannel(channel)
    }
  }, [supabase, bonfireId, presenceKey])

  const track = useCallback(async (payload: PresencePayload) => {
    await channelRef.current?.track(payload)
  }, [])

  const untrack = useCallback(async () => {
    await channelRef.current?.untrack()
  }, [])

  return { participants, isConnected, hasConnected, track, untrack }
}
