'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Wifi, WifiOff, Zap, Users, Settings, ChevronDown, Music2 } from 'lucide-react'
import type { ActivityItem, Session, SettingsChangeRequest, TimerMode, TimerState } from '@/types'
import { useTimer } from '@/hooks/useTimer'
import { useSession } from '@/hooks/useSession'
import { computeProgress, sessionToTimerState } from '@/lib/timer'
import { generateUsername } from '@/lib/roomName'
import { SettingsPanel, type TimerDurations, type SessionSettings } from '@/components/session/SettingsPanel'
import { playCompleteSound, showNotification, requestNotificationPermission } from '@/lib/audio'
import { TimerRing } from '@/components/timer/TimerRing'
import { TimerDisplay } from '@/components/timer/TimerDisplay'
import { TimerControls } from '@/components/timer/TimerControls'
import { ModeSelector } from '@/components/timer/ModeSelector'
import { MissedEventsToast } from '@/components/session/MissedEventsToast'
import { ParticipantList } from '@/components/session/ParticipantList'
import { SharePanel } from '@/components/session/SharePanel'
import { ActivityFeed } from '@/components/session/ActivityFeed'
import { BreakOverlay } from '@/components/session/BreakOverlay'
import { GuestNicknamePrompt } from '@/components/session/GuestNicknamePrompt'
import { SettingsRequestCard } from '@/components/session/SettingsRequestCard'
import { AmbientPlayer } from '@/components/session/AmbientPlayer'
import { ModeTipBubble } from '@/components/session/ModeTipBubble'
import { KeyboardShortcutsModal } from '@/components/session/KeyboardShortcutsModal'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// Module-level pure function — no closure deps
function toSecs(d: TimerDurations) {
  return {
    focus: d.focus * 60,
    short: d.short * 60,
    long: d.long * 60,
  }
}

interface SessionProviderProps {
  session: Session
  userId: string | null
  isHost: boolean
  username?: string | null
  avatarUrl?: string | null
}

function SessionContent({
  session,
  userId,
  isHost: isHostProp,
  username,
  avatarUrl,
}: SessionProviderProps) {
  const [isHost, setIsHost] = useState(isHostProp)
  const [sessionMode, setSessionMode] = useState<'host' | 'jam' | 'solo'>(session.session_mode ?? 'host')
  const [isPublic, setIsPublic] = useState(session.is_public ?? true)
  const [showBreakOverlay, setShowBreakOverlay] = useState(false)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>({
    durations: {
      focus: session.settings?.focus ?? 25,
      short: session.settings?.short ?? 5,
      long: session.settings?.long ?? 15,
    },
    rounds: session.settings?.rounds ?? 4,
    allowGuestShare: session.settings?.allowGuestShare ?? true,
    autoStartBreaks: session.settings?.autoStartBreaks ?? false,
    autoStartPomodoros: session.settings?.autoStartPomodoros ?? false,
  })
  const focusCountRef = useRef(0)
  const [focusCount, setFocusCount] = useState(0)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const sessionLogRef = useRef<string[]>([])
  const totalLogCountRef = useRef<number>(0)
  const tabHiddenAtRef = useRef<number | null>(null)
  const logCountAtHideRef = useRef<number>(0)
  const missedEventsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [missedEvents, setMissedEvents] = useState<string[]>([])
  // localUsername: for guests this starts null and is set when they save a nickname
  const [localUsername, setLocalUsername] = useState<string | null>(username ?? null)
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false)
  const [nicknameReady, setNicknameReady] = useState(!!userId)
  const [showSettings, setShowSettings] = useState(false)
  const [showWatcherSettings, setShowWatcherSettings] = useState(false)
  const [showAmbient, setShowAmbient] = useState(false)
  const [ambientActive, setAmbientActive] = useState(false)
  const [pendingRequest, setPendingRequest] = useState<SettingsChangeRequest | null>(null)
  const [pendingSettingsRequest, setPendingSettingsRequest] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const pendingRequestRef = useRef<SettingsChangeRequest | null>(null)
  useEffect(() => { pendingRequestRef.current = pendingRequest }, [pendingRequest])
  const [modeTipDismissed, setModeTipDismissed] = useState(false)
  const sharePanelRef = useRef<HTMLDivElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)
  const settingsPanelDesktopRef = useRef<HTMLDivElement>(null)
  const watcherSettingsPanelRef = useRef<HTMLDivElement>(null)
  const watcherSettingsPanelDesktopRef = useRef<HTMLDivElement>(null)
  const hasRequestedNotifRef = useRef(false)
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  // Guest host detection via localStorage
  useEffect(() => {
    if (!isHostProp) {
      const guestOwned = localStorage.getItem(`pomodoro_host_${session.id}`) === '1'
      if (guestOwned) setIsHost(true)
    }
  }, [session.id, isHostProp])

  // Restore or prompt for nickname (guests only)
  useEffect(() => {
    if (userId) return // auth users have a username already
    const stored = localStorage.getItem(`pomodoro_nick_${session.id}`)
    if (stored) {
      setLocalUsername(stored)
      setNicknameReady(true)
    } else {
      setShowNicknamePrompt(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount

  const canControl = isHost || sessionMode === 'jam'

  const modeRef = useRef<TimerMode>('focus')

  const sessionSettingsRef = useRef(sessionSettings)
  useEffect(() => { sessionSettingsRef.current = sessionSettings }, [sessionSettings])

  const canControlRef = useRef(canControl)
  useEffect(() => { canControlRef.current = canControl }, [canControl])

  // Refs for functions defined later — avoids temporal dead zone in handleExpire
  const broadcastTimerStateRef = useRef<((state: TimerState) => void) | null>(null)
  const skipAndStartRef = useRef<((nextMode: TimerMode, durations?: Record<TimerMode, number>) => TimerState) | null>(null)

  const handleExpire = useCallback(() => {
    playCompleteSound()
    showNotification('PomodoroJam', 'Your room has ended! Time for a break.')
    const currentMode = modeRef.current
    const settings = sessionSettingsRef.current
    const durations = toSecs(settings.durations)

    // Log completed pomodoro for authenticated users (focus mode only)
    if (userId && currentMode === 'focus') {
      const minutes = Math.round(settings.durations.focus)
      supabase.rpc('increment_profile_stats', {
        p_user_id: userId,
        p_minutes: minutes,
        p_session_id: session.id,
      }).then(({ error }) => {
        if (error) console.error('[handleExpire] Failed to log pomodoro:', error)
      })
    }

    if (currentMode === 'focus' && settings.autoStartBreaks) {
      focusCountRef.current += 1
      setFocusCount(focusCountRef.current)
      const nextMode = focusCountRef.current % settings.rounds === 0 ? 'long' : 'short'
      const newState = skipAndStartRef.current?.(nextMode, durations)
      if (!newState) return
      if (canControlRef.current) {
        broadcastTimerStateRef.current?.(newState)
        supabase.from('sessions').update({ running: true, time_left: newState.timeLeft, total_time: newState.totalTime, mode: newState.mode }).eq('id', session.id)
      }
    } else if ((currentMode === 'short' || currentMode === 'long') && settings.autoStartPomodoros) {
      const newState = skipAndStartRef.current?.('focus', durations)
      if (!newState) return
      if (canControlRef.current) {
        broadcastTimerStateRef.current?.(newState)
        supabase.from('sessions').update({ running: true, time_left: newState.timeLeft, total_time: newState.totalTime, mode: newState.mode }).eq('id', session.id)
      }
    } else {
      setShowBreakOverlay(true)
    }
  }, [userId, supabase, session.id])

  const {
    timeLeft, status, mode, timerState,
    start, pause, reset, setMode, applyState, skipAndStart,
  } = useTimer({
    initialState: sessionToTimerState(session),
    onExpire: handleExpire,
  })

  const { participants, isConnected, broadcastTimerState, onTimerUpdate, broadcastShareLock, onShareLock, broadcastSessionMode, onSessionMode, onParticipantJoin, onParticipantLeave, broadcastActivity, onActivity, updatePresence, broadcastSettingsRequest, onSettingsRequest, broadcastSettingsResponse, onSettingsResponse } = useSession({
    sessionId: session.id,
    userId,
    isHost,
    username: localUsername,
    avatarUrl,
  })

  // Enrich every timer broadcast with the current focusCount so watchers stay in sync
  const broadcastWithCount = useCallback((state: TimerState) => {
    broadcastTimerState({ ...state, focusCount: focusCountRef.current })
  }, [broadcastTimerState])

  // Keep late-bound refs up to date
  useEffect(() => { skipAndStartRef.current = skipAndStart }, [skipAndStart])
  useEffect(() => { broadcastTimerStateRef.current = broadcastWithCount }, [broadcastWithCount])

  // Clear pending settings request if channel disconnects — avoids infinite spinner
  useEffect(() => {
    if (!isConnected) setPendingSettingsRequest(false)
  }, [isConnected])

  // Auto-cancel pending settings request after 30s if host never responds
  useEffect(() => {
    if (!pendingSettingsRequest) return
    const t = setTimeout(() => setPendingSettingsRequest(false), 30_000)
    return () => clearTimeout(t)
  }, [pendingSettingsRequest])

  // Keep refs up to date
  useEffect(() => { modeRef.current = mode }, [mode])

  // Short display name for activity messages — prefers live localUsername (guest nick)
  const actorName = localUsername ?? 'Guest'

  // Push an ephemeral activity item — auto-removes after animation completes
  const pushActivity = useCallback((text: string) => {
    totalLogCountRef.current++
    sessionLogRef.current = [...sessionLogRef.current, text].slice(-10)
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setActivities(prev => [...prev.slice(-2), { id, text }])
    setTimeout(() => setActivities(prev => prev.filter(a => a.id !== id)), 5050)
  }, [])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        tabHiddenAtRef.current = Date.now()
        logCountAtHideRef.current = totalLogCountRef.current
      } else {
        if (tabHiddenAtRef.current === null) return
        tabHiddenAtRef.current = null
        const newCount = totalLogCountRef.current - logCountAtHideRef.current
        const missed = newCount > 0 ? sessionLogRef.current.slice(-newCount) : []
        if (missed.length === 0) return
        setActivities([])
        setMissedEvents(missed)
        if (missedEventsTimerRef.current) clearTimeout(missedEventsTimerRef.current)
        missedEventsTimerRef.current = setTimeout(() => setMissedEvents([]), 4000)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (missedEventsTimerRef.current) clearTimeout(missedEventsTimerRef.current)
    }
  }, [])

  // Receive activity broadcasts from other participants
  useEffect(() => {
    return onActivity(pushActivity)
  }, [onActivity, pushActivity])

  // Join / leave presence events → local activity messages
  useEffect(() => {
    return onParticipantJoin((joinedUsername, isReconnect) => {
      // Always resync timer state to the (re)joining participant
      if (isHost) broadcastWithCount(timerStateRef.current)
      // Suppress activity message on quick reconnects (tab switch / brief disconnect)
      if (!isReconnect) {
        const name = joinedUsername ?? 'Someone'
        pushActivity(`${name} joined 👋`)
      }
    })
  }, [onParticipantJoin, pushActivity, isHost, broadcastWithCount])

  useEffect(() => {
    return onParticipantLeave((leftUsername) => {
      const name = leftUsername ?? 'Someone'
      pushActivity(`${name} left the room`)
    })
  }, [onParticipantLeave, pushActivity])

  // Keep a ref to timerState so join handler always has the latest without re-subscribing
  const timerStateRef = useRef(timerState)
  useEffect(() => { timerStateRef.current = timerState }, [timerState])

  // Always receive timer updates from other controllers.
  // broadcast: { self: false } ensures you never apply your own broadcasts.
  // In Jam mode this is essential — every participant must sync with whoever just acted.
  useEffect(() => {
    const unsubscribe = onTimerUpdate((state: TimerState) => {
      applyState(state)
      // Sync focusCount from host broadcasts so round label stays accurate for watchers
      if (state.focusCount !== undefined) {
        focusCountRef.current = state.focusCount
        setFocusCount(state.focusCount)
      }
    })
    return unsubscribe
  }, [onTimerUpdate, applyState])

  // (join re-broadcast + activity handled in the pushActivity/onParticipantJoin block above)

  // Receive share lock updates (non-hosts)
  useEffect(() => {
    if (isHost) return
    const unsubscribe = onShareLock((locked) => {
      setSessionSettings(prev => ({ ...prev, allowGuestShare: !locked }))
    })
    return unsubscribe
  }, [isHost, onShareLock])

  // Close share panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sharePanelRef.current && !sharePanelRef.current.contains(e.target as Node)) {
        setShowSharePanel(false)
      }
    }
    if (showSharePanel) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showSharePanel])

  // Close settings panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const inGear = settingsPanelRef.current?.contains(e.target as Node)
      const inDesktop = settingsPanelDesktopRef.current?.contains(e.target as Node)
      if (!inGear && !inDesktop) {
        setShowSettings(false)
      }
    }
    if (showSettings) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showSettings])

  // Close watcher settings panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const inGear = watcherSettingsPanelRef.current?.contains(e.target as Node)
      const inDesktop = watcherSettingsPanelDesktopRef.current?.contains(e.target as Node)
      if (!inGear && !inDesktop) {
        setShowWatcherSettings(false)
      }
    }
    if (showWatcherSettings) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showWatcherSettings])

  // Request notification permission
  useEffect(() => {
    if (!hasRequestedNotifRef.current) {
      hasRequestedNotifRef.current = true
      requestNotificationPermission()
    }
  }, [])

  // Host heartbeat — keeps last_active_at fresh so explore page can filter out zombie sessions
  useEffect(() => {
    if (!isHost) return
    const id = setInterval(() => {
      supabase.from('sessions').update({ last_active_at: new Date().toISOString() }).eq('id', session.id)
        .then(({ error }) => { if (error) console.error('[heartbeat] Failed to update last_active_at for session', session.id, error) })
    }, 30_000)
    return () => clearInterval(id)
  }, [isHost, supabase, session.id])

  // Warn host before closing tab while timer is running
  useEffect(() => {
    if (!isHost) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'running') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isHost, status])

  // Set session mode (host only) — await DB first, then broadcast to avoid state divergence
  const handleSetMode = useCallback(async (mode: 'host' | 'jam' | 'solo') => {
    if (mode === sessionMode) return
    const { error } = await supabase
      .from('sessions')
      .update({ session_mode: mode, jam_mode: mode === 'jam' })
      .eq('id', session.id)
    if (error) {
      console.error('[handleSetMode] DB update failed:', error)
      return
    }
    setSessionMode(mode)
    broadcastSessionMode(mode)
    const messages: Record<'host' | 'jam' | 'solo', string> = {
      host: `${actorName} switched to Host mode 👑`,
      jam: `${actorName} switched to Jam mode ⚡`,
      solo: `${actorName} switched to Solo mode 🎯`,
    }
    broadcastActivity(messages[mode])
  }, [sessionMode, session.id, supabase, broadcastSessionMode, broadcastActivity, actorName])

  // Non-hosts receive session mode changes from the host
  useEffect(() => {
    if (isHost) return
    const unsubscribe = onSessionMode((next) => {
      setSessionMode(next)
    })
    return unsubscribe
  }, [isHost, onSessionMode])

  // Host receives settings change requests from watchers
  useEffect(() => {
    if (!isHost) return
    const unsubscribe = onSettingsRequest((request) => {
      // Auto-reject any existing pending request before accepting the new one,
      // so the first requester isn't left waiting indefinitely
      if (pendingRequestRef.current) {
        broadcastSettingsResponse({ requester_id: pendingRequestRef.current.requester_id, accepted: false })
      }
      setPendingRequest(request)
    })
    return unsubscribe
  }, [isHost, onSettingsRequest, broadcastSettingsResponse])

  // Watchers receive response from host (accepted/rejected)
  useEffect(() => {
    if (isHost) return
    const unsubscribe = onSettingsResponse((response) => {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('pomodoro_guest_id') : null
      const myId = userId ?? guestId
      if (response.requester_id !== myId) return
      setPendingSettingsRequest(false)
      if (response.accepted && response.settings) {
        const settings = response.settings
        // Apply the accepted settings locally so round labels and UI stay in sync
        setSessionSettings(prev => ({
          durations: { focus: settings.focus, short: settings.short, long: settings.long },
          rounds: settings.rounds,
          allowGuestShare: prev.allowGuestShare, // host-only setting, preserve watcher's current value
          autoStartBreaks: settings.autoStartBreaks,
          autoStartPomodoros: settings.autoStartPomodoros,
        }))
        toast('Host accepted your settings request ✓', 'success')
        setShowWatcherSettings(false)
      } else if (!response.accepted) {
        toast('Host declined your settings request', 'error')
      }
    })
    return unsubscribe
  }, [isHost, onSettingsResponse, userId, toast])

  const handleSendSettingsRequest = useCallback((newSettings: SessionSettings) => {
    const guestId = typeof window !== 'undefined' ? localStorage.getItem('pomodoro_guest_id') : null
    const myId = userId ?? guestId ?? 'unknown'
    broadcastSettingsRequest({
      requester_id: myId,
      requester_name: localUsername,
      focus: newSettings.durations.focus,
      short: newSettings.durations.short,
      long: newSettings.durations.long,
      rounds: newSettings.rounds,
      autoStartBreaks: newSettings.autoStartBreaks,
      autoStartPomodoros: newSettings.autoStartPomodoros,
    })
    setPendingSettingsRequest(true)
    toast('Settings request sent to host', 'info')
  }, [userId, localUsername, broadcastSettingsRequest, toast])

  const handleStart = useCallback(() => {
    const newState = start()
    const msg = `${actorName} started the timer 🍅`
    broadcastActivity(msg)
    if (canControl) {
      broadcastWithCount(newState)
      supabase.from('sessions').update({ running: true, time_left: newState.timeLeft, mode: newState.mode }).eq('id', session.id)
    }
  }, [start, actorName, canControl, broadcastWithCount, broadcastActivity, supabase, session.id])

  const handlePause = useCallback(() => {
    const newState = pause()
    const mins = String(Math.floor(newState.timeLeft / 60)).padStart(2, '0')
    const secs = String(newState.timeLeft % 60).padStart(2, '0')
    const msg = `${actorName} paused — ${mins}:${secs} remaining ⏸`
    broadcastActivity(msg)
    if (canControl) {
      broadcastWithCount(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft }).eq('id', session.id)
    }
  }, [pause, actorName, canControl, broadcastWithCount, broadcastActivity, supabase, session.id])

  // Global keyboard shortcuts (placed after handleStart/handlePause declarations)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '?') {
        e.preventDefault()
        setShowShortcutsModal(v => !v)
        return
      }
      if (showShortcutsModal) return
      if (e.code === 'Space' && canControl) {
        e.preventDefault()
        if (status === 'running') handlePause()
        else handleStart()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showShortcutsModal, canControl, status, handleStart, handlePause])

  const handleReset = useCallback(() => {
    const newState = reset(toSecs(sessionSettings.durations))
    setShowBreakOverlay(false)
    const msg = `${actorName} reset the timer ↺`
    broadcastActivity(msg)
    if (canControl) {
      broadcastWithCount(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft, total_time: newState.totalTime, mode: newState.mode }).eq('id', session.id)
    }
  }, [reset, actorName, canControl, broadcastWithCount, broadcastActivity, sessionSettings.durations, supabase, session.id])

  const handleSkip = useCallback(() => {
    let nextMode: TimerMode
    if (mode === 'focus') {
      focusCountRef.current += 1
      setFocusCount(focusCountRef.current)
      nextMode = focusCountRef.current % sessionSettings.rounds === 0 ? 'long' : 'short'
    } else {
      nextMode = 'focus'
    }
    const modeMessages: Record<TimerMode, string> = {
      short: `Short break started ☕`,
      long: `Long break — take a proper rest 🎉`,
      focus: `${actorName} started a new focus round 🍅`,
    }
    const msg = modeMessages[nextMode]
    broadcastActivity(msg)
    const newState = setMode(nextMode, toSecs(sessionSettings.durations))
    setShowBreakOverlay(false)
    if (canControl) {
      broadcastWithCount(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft, total_time: newState.totalTime, mode: newState.mode }).eq('id', session.id)
    }
  }, [mode, actorName, setMode, canControl, broadcastWithCount, broadcastActivity, sessionSettings.durations, sessionSettings.rounds, supabase, session.id])

  const handleModeChange = useCallback((newMode: TimerMode) => {
    const modeMessages: Record<TimerMode, string> = {
      short: `Short break started ☕`,
      long: `Long break — take a proper rest 🎉`,
      focus: `${actorName} started a new focus round 🍅`,
    }
    const msg = modeMessages[newMode]
    broadcastActivity(msg)
    const newState = setMode(newMode, toSecs(sessionSettings.durations))
    setShowBreakOverlay(false)
    if (canControl) {
      broadcastWithCount(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft, total_time: newState.totalTime, mode: newState.mode }).eq('id', session.id)
    }
  }, [setMode, actorName, canControl, broadcastWithCount, broadcastActivity, sessionSettings.durations, supabase, session.id])

  const handleApplySettings = useCallback(async (newSettings: SessionSettings) => {
    setSessionSettings(newSettings)
    setShowSettings(false)
    focusCountRef.current = 0
    setFocusCount(0)
    const newState = reset(toSecs(newSettings.durations))
    if (canControl) {
      const { error } = await supabase.from('sessions').update({
        running: false,
        time_left: newState.timeLeft,
        mode: newState.mode,
        settings: {
          focus: newSettings.durations.focus,
          short: newSettings.durations.short,
          long: newSettings.durations.long,
          rounds: newSettings.rounds,
          allowGuestShare: newSettings.allowGuestShare,
          autoStartBreaks: newSettings.autoStartBreaks,
          autoStartPomodoros: newSettings.autoStartPomodoros,
        },
      }).eq('id', session.id)
      if (error) {
        console.error('[handleApplySettings] DB update failed:', error)
        return false
      } else {
        broadcastWithCount(newState)
        broadcastShareLock(!newSettings.allowGuestShare)
      }
    }
    return true
  }, [reset, canControl, broadcastWithCount, broadcastShareLock, supabase, session.id])

  const isTogglingPublic = useRef(false)

  const handleTogglePublic = useCallback(async (newValue: boolean) => {
    if (isTogglingPublic.current) return
    isTogglingPublic.current = true
    const oldValue = isPublic
    setIsPublic(newValue)
    const { error } = await supabase
      .from('sessions')
      .update({ is_public: newValue })
      .eq('id', session.id)
    if (error) {
      console.error('[handleTogglePublic] DB update failed:', error)
      setIsPublic(oldValue)
    }
    isTogglingPublic.current = false
  }, [isPublic, supabase, session.id])

  const handleAcceptRequest = useCallback(async () => {
    if (!pendingRequest) return
    const newSettings: SessionSettings = {
      durations: { focus: pendingRequest.focus, short: pendingRequest.short, long: pendingRequest.long },
      rounds: pendingRequest.rounds,
      allowGuestShare: sessionSettings.allowGuestShare,
      autoStartBreaks: pendingRequest.autoStartBreaks,
      autoStartPomodoros: pendingRequest.autoStartPomodoros,
    }
    const ok = await handleApplySettings(newSettings)
    broadcastSettingsResponse({
      requester_id: pendingRequest.requester_id,
      accepted: ok,
      // Include settings so the watcher can apply them locally without a separate broadcast
      settings: ok ? {
        focus: newSettings.durations.focus,
        short: newSettings.durations.short,
        long: newSettings.durations.long,
        rounds: newSettings.rounds,
        autoStartBreaks: newSettings.autoStartBreaks,
        autoStartPomodoros: newSettings.autoStartPomodoros,
      } : undefined,
    })
    setPendingRequest(null)
  }, [pendingRequest, sessionSettings.allowGuestShare, handleApplySettings, broadcastSettingsResponse])

  const handleRejectRequest = useCallback(() => {
    if (!pendingRequest) return
    broadcastSettingsResponse({ requester_id: pendingRequest.requester_id, accepted: false })
    setPendingRequest(null)
  }, [pendingRequest, broadcastSettingsResponse])

  const progress = computeProgress(timerState)
  const isFirstRoundIdle = focusCount === 0 && mode === 'focus'
  const focusRoundsLeft = sessionSettings.rounds - ((focusCount % sessionSettings.rounds) + 1)
  const roundLabel = mode === 'focus'
    ? `Round ${focusCount + 1} · ${focusRoundsLeft === 0 ? 'long break next' : `long break after ${focusRoundsLeft} more`}`
    : `Round ${focusCount} of ${sessionSettings.rounds} · ${mode === 'long' ? 'long break' : 'short break'}`

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <header
        className="relative flex items-center justify-between px-4 sm:px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/" aria-label="Back to home">
          <Logo size="sm" />
        </Link>

        {/* Room name — centered absolutely so it doesn't shift the side controls */}
        {session.title && (
          <span
            className="absolute left-1/2 -translate-x-1/2 text-sm font-medium max-w-[40%] truncate"
            style={{ color: 'var(--text-secondary)' }}
            title={session.title}
          >
            {session.title}
          </span>
        )}

        <div className="flex items-center gap-2 sm:gap-3">

          {/* Connection status */}
          <div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            {isConnected ? (
              <Wifi className="w-4 h-4" style={{ color: 'var(--green)' }} />
            ) : (
              <WifiOff className="w-4 h-4 animate-pulse" />
            )}
            <span className="hidden sm:block">{isConnected ? 'Live' : 'Connecting'}</span>
          </div>

          <button
            onClick={() => setShowShortcutsModal(v => !v)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-sm font-medium"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
          >
            ?
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Jam mode banner for watchers */}
      {sessionMode === 'jam' && !isHost && (
        <div
          className="px-4 py-2 text-center text-xs"
          style={{
            background: 'var(--green-soft)',
            borderBottom: '1px solid var(--border)',
            color: 'var(--green)',
          }}
        >
          <Zap className="w-3 h-3 inline mr-1" />
          Jam Mode: everyone controls the timer
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
        {/* Timer card */}
        <div
          className="w-full max-w-sm sm:max-w-md flex flex-col items-center gap-4 sm:gap-5 p-5 sm:p-8 rounded-3xl animate-scale-in"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <ModeSelector mode={mode} isHost={canControl} onChange={handleModeChange} />

          {/* Round indicator — always visible; dimmed on round 1 idle */}
          <p
            className="text-xs transition-opacity duration-300 mt-1"
            style={{
              color: isFirstRoundIdle ? 'var(--text-secondary)' : 'var(--text-primary)',
              fontSize: isFirstRoundIdle ? '11px' : undefined,
            }}
          >
            {roundLabel}
          </p>

          {/* Timer ring */}
          <div className="block sm:hidden">
            <TimerRing progress={progress} mode={mode} size={220}>
              <TimerDisplay timeLeft={timeLeft} status={status} mode={mode} />
            </TimerRing>
          </div>
          <div className="hidden sm:block">
            <TimerRing progress={progress} mode={mode} size={260}>
              <TimerDisplay timeLeft={timeLeft} status={status} mode={mode} />
            </TimerRing>
          </div>

          <TimerControls
            status={status}
            isHost={isHost}
            jamMode={sessionMode === 'jam'}
            onPlay={handleStart}
            onPause={handlePause}
            onSkip={handleSkip}
            onReset={handleReset}
          />

          {/* Share + Jam row */}
          <div className="flex flex-wrap items-center gap-2 w-full">
            {/* Invite button — hidden for viewers when host has locked sharing, and hidden in solo mode */}
            {(isHost || sessionSettings.allowGuestShare) && sessionMode !== 'solo' && (
            <div className="relative shrink-0" ref={sharePanelRef}>
              <button
                onClick={() => setShowSharePanel(v => !v)}
                aria-label="Share room"
                aria-expanded={showSharePanel}
                className="h-10 w-24 flex items-center justify-center gap-1.5 px-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer"
                style={{
                  background: showSharePanel ? 'var(--accent)' : 'var(--bg-secondary)',
                  borderColor: showSharePanel ? 'var(--accent)' : 'var(--border)',
                  color: showSharePanel ? '#fff' : 'var(--text-primary)',
                }}
              >
                <Users className="w-4 h-4" />
                Invite
              </button>

              {showSharePanel && (
                <div
                  className="absolute left-0 bottom-12 w-72 rounded-2xl z-50 p-4 animate-scale-in"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  <SharePanel sessionId={session.id} sessionName={session.title} />
                </div>
              )}
            </div>
            )}

            {!isHost && (
              <>
                {/* Watcher settings request button — centred in remaining space */}
                <div className="flex-1 flex justify-center">
                  <div ref={watcherSettingsPanelRef} className="relative">
                    <button
                      onClick={() => setShowWatcherSettings(v => !v)}
                      title="Request settings change"
                      aria-label="Request settings change"
                      className="h-10 w-10 flex items-center justify-center rounded-xl border transition-all cursor-pointer"
                      style={{
                        background: showWatcherSettings ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                        borderColor: showWatcherSettings ? 'var(--accent)' : 'var(--border)',
                        color: showWatcherSettings ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      <Settings className="w-5 h-5" />
                    </button>

                    {showWatcherSettings && (
                      <>
                        {/* Backdrop + bottom sheet — mobile only */}
                        <div
                          className="fixed inset-0 z-40 xl:hidden"
                          style={{ background: 'rgba(0,0,0,0.5)' }}
                          onClick={() => setShowWatcherSettings(false)}
                        />
                        <div className="fixed bottom-0 left-0 right-0 z-50 xl:hidden">
                          <div
                            className="rounded-t-2xl p-4 animate-slide-up-sheet max-h-[85vh] overflow-y-auto"
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border)',
                              boxShadow: 'var(--shadow-lg)',
                            }}
                          >
                            {pendingSettingsRequest ? (
                              <div className="flex flex-col items-center gap-3 py-4 text-center">
                                <span
                                  className="w-5 h-5 border-2 rounded-full animate-spin"
                                  style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
                                />
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                  Waiting for host approval...
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  The host will accept or decline your request.
                                </p>
                                <button
                                  onClick={() => setPendingSettingsRequest(false)}
                                  className="text-xs underline cursor-pointer"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <SettingsPanel
                                settings={sessionSettings}
                                onApply={handleSendSettingsRequest}
                                isWatcher
                              />
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {isHost && (
              <>
                {/* Mode selector: Host | Jam | Solo */}
                <div className="flex-1 flex">
                  <div className="flex items-center rounded-xl overflow-hidden border h-10 w-full" style={{ borderColor: 'var(--border)' }}>
                    {(['host', 'jam', 'solo'] as const).map((m) => {
                      const active = sessionMode === m
                      const label = m === 'host' ? 'Host' : m === 'jam' ? 'Jam' : 'Solo'
                      const activeColor = m === 'host' ? 'var(--accent)' : m === 'jam' ? 'var(--green)' : '#8B5CF6'
                      const title = m === 'host'
                        ? 'You control the timer. Everyone else follows along in sync.'
                        : m === 'jam'
                        ? 'Everyone in the room can control the timer.'
                        : 'Private room. No sharing, no watchers.'
                      const soloBlocked = m === 'solo' && participants.length > 1
                      return (
                        <button
                          key={m}
                          onClick={() => { if (!soloBlocked) { setModeTipDismissed(true); handleSetMode(m) } }}
                          disabled={soloBlocked}
                          title={soloBlocked ? `${participants.length} people in the room — can't switch to Solo` : title}
                          className="h-full flex-1 flex items-center justify-center text-sm font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          style={
                            active
                              ? { background: activeColor, color: '#fff' }
                              : { background: 'var(--bg-secondary)', color: 'var(--text-muted)' }
                          }
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Settings gear */}
                <div ref={settingsPanelRef} className="relative shrink-0">
                  <button
                    onClick={() => setShowSettings(v => !v)}
                    title="Timer settings"
                    aria-label="Timer settings"
                    className="h-10 w-10 flex items-center justify-center rounded-xl border transition-all cursor-pointer"
                    style={{
                      background: showSettings ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                      borderColor: showSettings ? 'var(--accent)' : 'var(--border)',
                      color: showSettings ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {showSettings && (
                    <>
                      {/* Backdrop + bottom sheet — mobile only */}
                      <div
                        className="fixed inset-0 z-40 xl:hidden"
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                        onClick={() => setShowSettings(false)}
                      />
                      <div className="fixed bottom-0 left-0 right-0 z-50 xl:hidden">
                        <div
                          className="rounded-t-2xl p-4 animate-slide-up-sheet max-h-[85vh] overflow-y-auto"
                          style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-lg)',
                          }}
                        >
                          <SettingsPanel
                            settings={sessionSettings}
                            onApply={handleApplySettings}
                            disabled={status === 'running'}
                            isPublic={isPublic}
                            onTogglePublic={handleTogglePublic}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <ParticipantList participants={participants} />

          {/* Ambient sound — collapsible */}
          <div className="w-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <button
              onClick={() => setShowAmbient(v => !v)}
              className="w-full flex items-center justify-between cursor-pointer"
              aria-expanded={showAmbient}
              aria-label="Toggle focus noise"
            >
              <span className="flex items-center gap-2 text-xs font-medium" style={{ color: ambientActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                <Music2 className="w-3.5 h-3.5" />
                Focus Noise
                {ambientActive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--green)' }} />}
              </span>
              <ChevronDown
                className={cn('w-3.5 h-3.5 transition-transform duration-200', showAmbient && 'rotate-180')}
                style={{ color: 'var(--text-muted)' }}
              />
            </button>
            {showAmbient && (
              <div className="mt-3">
                <AmbientPlayer onActiveChange={setAmbientActive} />
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Desktop settings panel — host. Fixed in right free space, vertically centred.
          Outer div: positioning only (no animation) so -translate-y-1/2 is never overwritten.
          Inner div: scale-in animation only. */}
      {showSettings && isHost && (
        <div
          ref={settingsPanelDesktopRef}
          className="hidden xl:block fixed z-50"
          style={{ top: '50%', left: 'calc(50% + 15rem)', transform: 'translateY(-50%)' }}
        >
          <div
            className="w-72 rounded-2xl p-4 animate-scale-in"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <SettingsPanel
              settings={sessionSettings}
              onApply={handleApplySettings}
              disabled={status === 'running'}
              isPublic={isPublic}
              onTogglePublic={handleTogglePublic}
            />
          </div>
        </div>
      )}

      {/* Desktop settings panel — watcher. Same fixed layout. */}
      {showWatcherSettings && !isHost && (
        <div
          ref={watcherSettingsPanelDesktopRef}
          className="hidden xl:block fixed z-50"
          style={{ top: '50%', left: 'calc(50% + 15rem)', transform: 'translateY(-50%)' }}
        >
          <div
            className="w-72 rounded-2xl p-4 animate-scale-in"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {pendingSettingsRequest ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <span
                  className="w-5 h-5 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
                />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Waiting for host approval...
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  The host will accept or decline your request.
                </p>
                <button
                  onClick={() => setPendingSettingsRequest(false)}
                  className="text-xs underline cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <SettingsPanel
                settings={sessionSettings}
                onApply={handleSendSettingsRequest}
                isWatcher
              />
            )}
          </div>
        </div>
      )}

      {isHost && <ModeTipBubble externalDismiss={modeTipDismissed} ready={nicknameReady} />}

      <BreakOverlay
        visible={showBreakOverlay}
        onDismiss={() => {
          setShowBreakOverlay(false)
          if (canControl) handleSkip()
        }}
        mode={mode}
        canControl={canControl}
      />

      {missedEvents.length > 0 && (
        <MissedEventsToast events={missedEvents} onDismiss={() => setMissedEvents([])} />
      )}
      <ActivityFeed items={activities} />

      {isHost && pendingRequest && (
        <SettingsRequestCard
          request={pendingRequest}
          currentSettings={sessionSettings}
          timerRunning={status === 'running'}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
        />
      )}

      {showNicknamePrompt && (
        <GuestNicknamePrompt
          onSave={(name) => {
            setLocalUsername(name)
            localStorage.setItem(`pomodoro_nick_${session.id}`, name)
            updatePresence(name)
            setShowNicknamePrompt(false)
            setNicknameReady(true)
          }}
          onSkip={() => {
            // Safety net: assign a random name instead of leaving username null
            const fallback = generateUsername()
            setLocalUsername(fallback)
            localStorage.setItem(`pomodoro_nick_${session.id}`, fallback)
            updatePresence(fallback)
            setShowNicknamePrompt(false)
            setNicknameReady(true)
          }}
        />
      )}

      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}
    </div>
  )
}

export function SessionProvider(props: SessionProviderProps) {
  return (
    <ToastProvider>
      <SessionContent {...props} />
    </ToastProvider>
  )
}
