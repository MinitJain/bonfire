'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BroadcastActivityPayload, Participant, TimerState } from '@/types'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseSessionOptions {
  sessionId: string
  userId: string | null
  isHost: boolean
  username?: string | null
  avatarUrl?: string | null
}

interface UseSessionReturn {
  participants: Participant[]
  isConnected: boolean
  broadcastTimerState: (state: TimerState) => void
  onTimerUpdate: (callback: (state: TimerState) => void) => () => void
  broadcastShareLock: (locked: boolean) => void
  onShareLock: (callback: (locked: boolean) => void) => () => void
  broadcastJamMode: (jamMode: boolean) => void
  onJamMode: (callback: (jamMode: boolean) => void) => () => void
  onParticipantJoin: (callback: (username: string | null) => void) => () => void
  onParticipantLeave: (callback: (username: string | null) => void) => () => void
  broadcastActivity: (text: string) => void
  onActivity: (callback: (text: string) => void) => () => void
  updatePresence: (newUsername: string | null) => void
}

export function useSession({
  sessionId,
  userId,
  isHost,
  username,
  avatarUrl,
}: UseSessionOptions): UseSessionReturn {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isHostRef = useRef(isHost)
  const avatarUrlRef = useRef(avatarUrl)
  const usernameRef = useRef(username)
  // Assign during render so refs are always current within the same render cycle
  isHostRef.current = isHost
  avatarUrlRef.current = avatarUrl ?? null
  usernameRef.current = username ?? null
  // Re-track presence whenever isHost changes so the is_host field stays accurate
  useEffect(() => {
    if (!channelRef.current) return
    channelRef.current.track({
      username: usernameRef.current ?? null,
      avatar_url: avatarUrlRef.current ?? null,
      is_host: isHost,
      joined_at: new Date().toISOString(),
    })
  }, [isHost])
  const timerCallbacksRef = useRef<Set<(state: TimerState) => void>>(new Set())
  const shareLockCallbacksRef = useRef<Set<(locked: boolean) => void>>(new Set())
  const jamModeCallbacksRef = useRef<Set<(jamMode: boolean) => void>>(new Set())
  const joinCallbacksRef = useRef<Set<(username: string | null) => void>>(new Set())
  const leaveCallbacksRef = useRef<Set<(username: string | null) => void>>(new Set())
  const activityCallbacksRef = useRef<Set<(text: string) => void>>(new Set())
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const channelName = `session:${sessionId}`

    let effectiveId = userId
    if (!effectiveId) {
      const stored = localStorage.getItem('pomodoro_guest_id')
      if (stored) {
        effectiveId = stored
      } else {
        effectiveId = crypto.randomUUID()
        localStorage.setItem('pomodoro_guest_id', effectiveId)
      }
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: effectiveId },
      },
    })

    channelRef.current = channel

    // Track presence (participants)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{
        username: string | null
        avatar_url: string | null
        is_host: boolean
        joined_at: string
      }>()

      const updated: Participant[] = Object.entries(state).map(([key, presences]) => {
        const presence = presences[0]
        return {
          user_id: key,
          username: presence.username ?? null,
          avatar_url: presence.avatar_url ?? null,
          joined_at: presence.joined_at,
          is_host: presence.is_host,
        }
      })

      setParticipants(updated)
    })

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const presence = newPresences[0] as unknown as {
        username: string | null
        avatar_url: string | null
        is_host: boolean
        joined_at: string
      }
      const joinedUsername = presence.username ?? null
      // Fire join callbacks (host re-broadcasts state + activity messages)
      joinCallbacksRef.current.forEach(cb => cb(joinedUsername))
      setParticipants((prev) => {
        const existing = prev.find((p) => p.user_id === key)
        if (existing) return prev
        return [
          ...prev,
          {
            user_id: key,
            username: joinedUsername,
            avatar_url: presence.avatar_url ?? null,
            joined_at: presence.joined_at,
            is_host: presence.is_host,
          },
        ]
      })
    })

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      setParticipants((prev) => {
        const leaving = prev.find((p) => p.user_id === key)
        leaveCallbacksRef.current.forEach(cb => cb(leaving?.username ?? null))
        return prev.filter((p) => p.user_id !== key)
      })
    })

    // Listen for timer broadcasts
    channel.on('broadcast', { event: 'timer_update' }, ({ payload }) => {
      const timerState = payload as TimerState
      timerCallbacksRef.current.forEach((cb) => cb(timerState))
    })

    // Listen for share lock broadcasts
    channel.on('broadcast', { event: 'share_lock' }, ({ payload }) => {
      const locked = (payload as { locked: boolean }).locked
      shareLockCallbacksRef.current.forEach((cb) => cb(locked))
    })

    // Listen for jam mode broadcasts
    channel.on('broadcast', { event: 'jam_mode_update' }, ({ payload }) => {
      const jamMode = (payload as { jamMode: boolean }).jamMode
      jamModeCallbacksRef.current.forEach((cb) => cb(jamMode))
    })

    // Listen for activity broadcasts (timer events, status messages)
    channel.on('broadcast', { event: 'activity' }, ({ payload }) => {
      const { text } = payload as BroadcastActivityPayload
      activityCallbacksRef.current.forEach((cb) => cb(text))
    })

    channel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)

          await channel.track({
            username: usernameRef.current ?? null,
            avatar_url: avatarUrlRef.current ?? null,
            is_host: isHostRef.current,
            joined_at: new Date().toISOString(),
          })
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
        }
      })

    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
      channelRef.current = null
      setIsConnected(false)
    }
  }, [sessionId, userId])

  const broadcastTimerState = useCallback((state: TimerState) => {
    if (!channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'timer_update',
      payload: state,
    })
  }, [])

  const onTimerUpdate = useCallback((callback: (state: TimerState) => void) => {
    timerCallbacksRef.current.add(callback)
    return () => {
      timerCallbacksRef.current.delete(callback)
    }
  }, [])

  const broadcastShareLock = useCallback((locked: boolean) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'share_lock',
      payload: { locked },
    })
  }, [])

  const onShareLock = useCallback((callback: (locked: boolean) => void) => {
    shareLockCallbacksRef.current.add(callback)
    return () => {
      shareLockCallbacksRef.current.delete(callback)
    }
  }, [])

  const broadcastJamMode = useCallback((jamMode: boolean) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'jam_mode_update',
      payload: { jamMode },
    })
  }, [])

  const onJamMode = useCallback((callback: (jamMode: boolean) => void) => {
    jamModeCallbacksRef.current.add(callback)
    return () => {
      jamModeCallbacksRef.current.delete(callback)
    }
  }, [])

  const onParticipantJoin = useCallback((callback: (username: string | null) => void) => {
    joinCallbacksRef.current.add(callback)
    return () => {
      joinCallbacksRef.current.delete(callback)
    }
  }, [])

  const onParticipantLeave = useCallback((callback: (username: string | null) => void) => {
    leaveCallbacksRef.current.add(callback)
    return () => {
      leaveCallbacksRef.current.delete(callback)
    }
  }, [])

  const broadcastActivity = useCallback((text: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'activity',
      payload: { text } satisfies BroadcastActivityPayload,
    })
  }, [])

  const onActivity = useCallback((callback: (text: string) => void) => {
    activityCallbacksRef.current.add(callback)
    return () => {
      activityCallbacksRef.current.delete(callback)
    }
  }, [])

  const updatePresence = useCallback((newUsername: string | null) => {
    if (!channelRef.current) return
    usernameRef.current = newUsername
    channelRef.current.track({
      username: newUsername,
      avatar_url: avatarUrlRef.current ?? null,
      is_host: isHostRef.current,
      joined_at: new Date().toISOString(),
    })
  }, [])

  return {
    participants,
    isConnected,
    broadcastTimerState,
    onTimerUpdate,
    broadcastShareLock,
    onShareLock,
    broadcastJamMode,
    onJamMode,
    onParticipantJoin,
    onParticipantLeave,
    broadcastActivity,
    onActivity,
    updatePresence,
  }
}
