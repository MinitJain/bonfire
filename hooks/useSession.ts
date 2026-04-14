'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BroadcastActivityPayload, Participant, SettingsChangeRequest, SettingsChangeResponse, TimerState } from '@/types'
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
  broadcastSessionMode: (mode: 'host' | 'jam' | 'solo') => void
  onSessionMode: (callback: (mode: 'host' | 'jam' | 'solo') => void) => () => void
  onParticipantJoin: (callback: (username: string | null, isReconnect: boolean) => void) => () => void
  onParticipantLeave: (callback: (username: string | null) => void) => () => void
  broadcastActivity: (text: string) => void
  onActivity: (callback: (text: string) => void) => () => void
  updatePresence: (newUsername: string | null) => void
  broadcastSettingsRequest: (request: SettingsChangeRequest) => void
  onSettingsRequest: (callback: (request: SettingsChangeRequest) => void) => () => void
  broadcastSettingsResponse: (response: SettingsChangeResponse) => void
  onSettingsResponse: (callback: (response: SettingsChangeResponse) => void) => () => void
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
  const effectiveIdRef = useRef<string | null>(null)
  const joinedAtRef = useRef(new Date().toISOString())
  const isHostRef = useRef(isHost)
  const avatarUrlRef = useRef(avatarUrl)
  const usernameRef = useRef(username)
  // Assign during render so refs are always current within the same render cycle
  isHostRef.current = isHost
  avatarUrlRef.current = avatarUrl ?? null
  usernameRef.current = username ?? null
  // Re-track presence whenever isHost or username changes so all fields stay accurate.
  // Reuse the original joinedAt so Supabase doesn't treat this as a new join event.
  useEffect(() => {
    if (!channelRef.current) return
    channelRef.current.track({
      username: usernameRef.current ?? null,
      avatar_url: avatarUrlRef.current ?? null,
      is_host: isHost,
      joined_at: joinedAtRef.current,
    })
  }, [isHost, username])
  const pendingLeaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const timerCallbacksRef = useRef<Set<(state: TimerState) => void>>(new Set())
  const shareLockCallbacksRef = useRef<Set<(locked: boolean) => void>>(new Set())
  const sessionModeCallbacksRef = useRef<Set<(mode: 'host' | 'jam' | 'solo') => void>>(new Set())
  const joinCallbacksRef = useRef<Set<(username: string | null, isReconnect: boolean) => void>>(new Set())
  const leaveCallbacksRef = useRef<Set<(username: string | null) => void>>(new Set())
  const activityCallbacksRef = useRef<Set<(text: string) => void>>(new Set())
  const settingsRequestCallbacksRef = useRef<Set<(req: SettingsChangeRequest) => void>>(new Set())
  const settingsResponseCallbacksRef = useRef<Set<(res: SettingsChangeResponse) => void>>(new Set())
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
    effectiveIdRef.current = effectiveId

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
      // If there's a pending leave for this user, they just re-joined after a tab/app switch.
      // Cancel the leave notification and suppress the join notification — they never really left.
      const pendingLeave = pendingLeaveTimers.current.get(key)
      if (pendingLeave !== undefined) {
        clearTimeout(pendingLeave)
        pendingLeaveTimers.current.delete(key)
        // User rejoined within the grace window — still run resync callbacks but
        // pass isReconnect=true so activity messages ("X joined") are suppressed.
        joinCallbacksRef.current.forEach(cb => cb(joinedUsername, true))
      } else if (key !== effectiveIdRef.current) {
        // Fire join callbacks only for other participants — suppress own join events
        joinCallbacksRef.current.forEach(cb => cb(joinedUsername, false))
      }
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
      // Read participant list before the state update to avoid side effects inside updater
      const leaving = channelRef.current
        ? channel.presenceState<{ username?: string | null }>()[key]?.[0]
        : null
      const leftUsername = leaving?.username ?? null
      // Debounce leave notifications for other participants — a 15s grace period avoids
      // false "X left" messages caused by tab minimize / app switch / brief disconnects.
      // If the same user rejoins within the window the pending timer is cancelled above.
      if (key !== effectiveIdRef.current) {
        const existing = pendingLeaveTimers.current.get(key)
        if (existing !== undefined) clearTimeout(existing)
        const timer = setTimeout(() => {
          pendingLeaveTimers.current.delete(key)
          leaveCallbacksRef.current.forEach(cb => cb(leftUsername))
        }, 15_000)
        pendingLeaveTimers.current.set(key, timer)
      }
      setParticipants((prev) => prev.filter((p) => p.user_id !== key))
    })

    // Listen for timer broadcasts
    // Supabase broadcast payload arrives as Record<string, unknown>; shape is guaranteed by broadcastTimerState
    channel.on('broadcast', { event: 'timer_update' }, ({ payload }) => {
      const timerState = payload as TimerState
      timerCallbacksRef.current.forEach((cb) => cb(timerState))
    })

    // Listen for share lock broadcasts
    channel.on('broadcast', { event: 'share_lock' }, ({ payload }) => {
      const locked = (payload as { locked: boolean }).locked
      shareLockCallbacksRef.current.forEach((cb) => cb(locked))
    })

    // Listen for session mode broadcasts
    channel.on('broadcast', { event: 'session_mode_update' }, ({ payload }) => {
      const mode = (payload as { sessionMode: 'host' | 'jam' | 'solo' }).sessionMode
      sessionModeCallbacksRef.current.forEach((cb) => cb(mode))
    })

    // Listen for activity broadcasts (timer events, status messages)
    channel.on('broadcast', { event: 'activity' }, ({ payload }) => {
      const { text } = payload as BroadcastActivityPayload
      activityCallbacksRef.current.forEach((cb) => cb(text))
    })

    // Listen for settings change requests (host receives from watchers)
    channel.on('broadcast', { event: 'settings_request' }, ({ payload }) => {
      settingsRequestCallbacksRef.current.forEach((cb) => cb(payload as SettingsChangeRequest))
    })

    // Listen for settings change responses (watchers receive from host)
    channel.on('broadcast', { event: 'settings_response' }, ({ payload }) => {
      settingsResponseCallbacksRef.current.forEach((cb) => cb(payload as SettingsChangeResponse))
    })

    channel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)

          await channel.track({
            username: usernameRef.current ?? null,
            avatar_url: avatarUrlRef.current ?? null,
            is_host: isHostRef.current,
            joined_at: joinedAtRef.current,
          })
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false)
        }
      })

    return () => {
      pendingLeaveTimers.current.forEach(timer => clearTimeout(timer))
      pendingLeaveTimers.current.clear()
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

  const broadcastSessionMode = useCallback((mode: 'host' | 'jam' | 'solo') => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'session_mode_update',
      payload: { sessionMode: mode },
    })
  }, [])

  const onSessionMode = useCallback((callback: (mode: 'host' | 'jam' | 'solo') => void) => {
    sessionModeCallbacksRef.current.add(callback)
    return () => {
      sessionModeCallbacksRef.current.delete(callback)
    }
  }, [])

  const onParticipantJoin = useCallback((callback: (username: string | null, isReconnect: boolean) => void) => {
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
      payload: { type: 'activity', text } satisfies BroadcastActivityPayload,
    })
  }, [])

  const onActivity = useCallback((callback: (text: string) => void) => {
    activityCallbacksRef.current.add(callback)
    return () => {
      activityCallbacksRef.current.delete(callback)
    }
  }, [])

  const broadcastSettingsRequest = useCallback((request: SettingsChangeRequest) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'settings_request',
      payload: request,
    })
  }, [])

  const onSettingsRequest = useCallback((callback: (req: SettingsChangeRequest) => void) => {
    settingsRequestCallbacksRef.current.add(callback)
    return () => { settingsRequestCallbacksRef.current.delete(callback) }
  }, [])

  const broadcastSettingsResponse = useCallback((response: SettingsChangeResponse) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'settings_response',
      payload: response,
    })
  }, [])

  const onSettingsResponse = useCallback((callback: (res: SettingsChangeResponse) => void) => {
    settingsResponseCallbacksRef.current.add(callback)
    return () => { settingsResponseCallbacksRef.current.delete(callback) }
  }, [])

  const updatePresence = useCallback((newUsername: string | null) => {
    if (!channelRef.current) return
    usernameRef.current = newUsername
    channelRef.current.track({
      username: newUsername,
      avatar_url: avatarUrlRef.current ?? null,
      is_host: isHostRef.current,
      joined_at: joinedAtRef.current,
    })
  }, [])

  return {
    participants,
    isConnected,
    broadcastTimerState,
    onTimerUpdate,
    broadcastShareLock,
    onShareLock,
    broadcastSessionMode,
    onSessionMode,
    onParticipantJoin,
    onParticipantLeave,
    broadcastActivity,
    onActivity,
    updatePresence,
    broadcastSettingsRequest,
    onSettingsRequest,
    broadcastSettingsResponse,
    onSettingsResponse,
  }
}
