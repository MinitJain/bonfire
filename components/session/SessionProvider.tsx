'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Wifi, WifiOff, Zap, Users, Settings, ChevronDown, Music2 } from 'lucide-react'
import type { ActivityItem, Session, SettingsChangeRequest, TimerMode, TimerState } from '@/types'
import { useTimer } from '@/hooks/useTimer'
import { useSession } from '@/hooks/useSession'
import { computeProgress, sessionToTimerState } from '@/lib/timer'
import { SettingsPanel, type TimerDurations, type SessionSettings } from '@/components/session/SettingsPanel'
import { playCompleteSound, showNotification, requestNotificationPermission } from '@/lib/audio'
import { TimerRing } from '@/components/timer/TimerRing'
import { TimerDisplay } from '@/components/timer/TimerDisplay'
import { TimerControls } from '@/components/timer/TimerControls'
import { ModeSelector } from '@/components/timer/ModeSelector'
import { ParticipantList } from '@/components/session/ParticipantList'
import { SharePanel } from '@/components/session/SharePanel'
import { ActivityFeed } from '@/components/session/ActivityFeed'
import { BreakOverlay } from '@/components/session/BreakOverlay'
import { GuestNicknamePrompt } from '@/components/session/GuestNicknamePrompt'
import { SettingsRequestCard } from '@/components/session/SettingsRequestCard'
import { AmbientPlayer } from '@/components/session/AmbientPlayer'
import { ModeTipBubble } from '@/components/session/ModeTipBubble'
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
  const [jamMode, setJamMode] = useState(session.jam_mode ?? false)
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
  // localUsername: for guests this starts null and is set when they save a nickname
  const [localUsername, setLocalUsername] = useState<string | null>(username ?? null)
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false)
  const [nicknameReady, setNicknameReady] = useState(!!userId)
  const [showSettings, setShowSettings] = useState(false)
  const [showWatcherSettings, setShowWatcherSettings] = useState(false)
  const [showAmbient, setShowAmbient] = useState(false)
  const [ambientActive, setAmbientActive] = useState(false)
  const [pendingRequest, setPendingRequest] = useState<SettingsChangeRequest | null>(null)
  const pendingRequestRef = useRef<SettingsChangeRequest | null>(null)
  useEffect(() => { pendingRequestRef.current = pendingRequest }, [pendingRequest])
  const [modeTipDismissed, setModeTipDismissed] = useState(false)
  const sharePanelRef = useRef<HTMLDivElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)
  const watcherSettingsPanelRef = useRef<HTMLDivElement>(null)
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
      // Brief delay so the page settles before the prompt appears
      const t = setTimeout(() => setShowNicknamePrompt(true), 800)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount

  const canControl = isHost || jamMode

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
    showNotification('PomodoroJam', 'Your session has ended! Time for a break.')
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

  const { participants, isConnected, broadcastTimerState, onTimerUpdate, broadcastShareLock, onShareLock, broadcastJamMode, onJamMode, onParticipantJoin, onParticipantLeave, broadcastActivity, onActivity, updatePresence, broadcastSettingsRequest, onSettingsRequest, broadcastSettingsResponse, onSettingsResponse } = useSession({
    sessionId: session.id,
    userId,
    isHost,
    username,
    avatarUrl,
  })

  // Enrich every timer broadcast with the current focusCount so watchers stay in sync
  const broadcastWithCount = useCallback((state: TimerState) => {
    broadcastTimerState({ ...state, focusCount: focusCountRef.current })
  }, [broadcastTimerState])

  // Keep late-bound refs up to date
  useEffect(() => { skipAndStartRef.current = skipAndStart }, [skipAndStart])
  useEffect(() => { broadcastTimerStateRef.current = broadcastWithCount }, [broadcastWithCount])

  // Keep refs up to date
  useEffect(() => { modeRef.current = mode }, [mode])

  // Short display name for activity messages — prefers live localUsername (guest nick)
  const actorName = localUsername ?? 'Guest'

  // Push an ephemeral activity item — auto-removes after animation completes
  const pushActivity = useCallback((text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setActivities(prev => [...prev.slice(-3), { id, text }])
    setTimeout(() => setActivities(prev => prev.filter(a => a.id !== id)), 2900)
  }, [])

  // Receive activity broadcasts from other participants
  useEffect(() => {
    return onActivity(pushActivity)
  }, [onActivity, pushActivity])

  // Join / leave presence events → local activity messages
  useEffect(() => {
    return onParticipantJoin((joinedUsername) => {
      const name = joinedUsername ?? 'Someone'
      pushActivity(`${name} joined the session 👋`)
      // Host re-broadcasts current timer state to the new joiner
      if (isHost) broadcastWithCount(timerStateRef.current)
    })
  }, [onParticipantJoin, pushActivity, isHost, broadcastWithCount])

  useEffect(() => {
    return onParticipantLeave((leftUsername) => {
      const name = leftUsername ?? 'Someone'
      pushActivity(`${name} left`)
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
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(e.target as Node)) {
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
      if (watcherSettingsPanelRef.current && !watcherSettingsPanelRef.current.contains(e.target as Node)) {
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

  // Toggle jam mode (host only) — await DB first, then broadcast to avoid state divergence
  const handleToggleJamMode = useCallback(async () => {
    const next = !jamMode
    const { error } = await supabase
      .from('sessions')
      .update({ jam_mode: next })
      .eq('id', session.id)
    if (error) {
      console.error('[handleToggleJamMode] DB update failed:', error)
      return
    }
    setJamMode(next)
    broadcastJamMode(next)
    const msg = next ? 'Jam Mode on — everyone can control ⚡' : 'Back to host control 👑'
    pushActivity(msg)
    broadcastActivity(msg)
  }, [jamMode, session.id, supabase, broadcastJamMode, broadcastActivity, pushActivity])

  // Non-hosts receive jam mode changes from the host
  useEffect(() => {
    if (isHost) return
    const unsubscribe = onJamMode((next) => {
      setJamMode(next)
    })
    return unsubscribe
  }, [isHost, onJamMode])

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
      if (response.accepted && response.settings) {
        // Apply the accepted settings locally so round labels and UI stay in sync
        setSessionSettings(prev => ({
          durations: { focus: response.settings!.focus, short: response.settings!.short, long: response.settings!.long },
          rounds: response.settings!.rounds,
          allowGuestShare: prev.allowGuestShare, // host-only setting, preserve watcher's current value
          autoStartBreaks: response.settings!.autoStartBreaks,
          autoStartPomodoros: response.settings!.autoStartPomodoros,
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
    setShowWatcherSettings(false)
    toast('Settings request sent to host', 'info')
  }, [userId, localUsername, broadcastSettingsRequest, toast])

  const handleStart = useCallback(() => {
    const newState = start()
    const msg = `${actorName} started the timer ▶`
    pushActivity(msg)
    broadcastActivity(msg)
    if (canControl) {
      broadcastWithCount(newState)
      supabase.from('sessions').update({ running: true, time_left: newState.timeLeft, mode: newState.mode }).eq('id', session.id)
    }
  }, [start, actorName, canControl, broadcastWithCount, broadcastActivity, pushActivity, supabase, session.id])

  const handlePause = useCallback(() => {
    const newState = pause()
    const mins = String(Math.floor(newState.timeLeft / 60)).padStart(2, '0')
    const secs = String(newState.timeLeft % 60).padStart(2, '0')
    const msg = `${actorName} paused · ${mins}:${secs} left ⏸`
    pushActivity(msg)
    broadcastActivity(msg)
    if (canControl) {
      broadcastWithCount(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft }).eq('id', session.id)
    }
  }, [pause, actorName, canControl, broadcastWithCount, broadcastActivity, pushActivity, supabase, session.id])

  const handleReset = useCallback(() => {
    const newState = reset(toSecs(sessionSettings.durations))
    setShowBreakOverlay(false)
    const msg = `${actorName} reset the timer ↺`
    pushActivity(msg)
    broadcastActivity(msg)
    if (canControl) {
      broadcastWithCount(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft, total_time: newState.totalTime, mode: newState.mode }).eq('id', session.id)
    }
  }, [reset, actorName, canControl, broadcastWithCount, broadcastActivity, pushActivity, sessionSettings.durations, supabase, session.id])

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
      short: `${actorName} switched to short break ☕`,
      long: `${actorName} switched to long break 🎉`,
      focus: `${actorName} started a new focus session 🍅`,
    }
    const msg = modeMessages[nextMode]
    pushActivity(msg)
    broadcastActivity(msg)
    const newState = setMode(nextMode, toSecs(sessionSettings.durations))
    setShowBreakOverlay(false)
    if (canControl) {
      broadcastWithCount(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft, total_time: newState.totalTime, mode: newState.mode }).eq('id', session.id)
    }
  }, [mode, actorName, setMode, canControl, broadcastWithCount, broadcastActivity, pushActivity, sessionSettings.durations, sessionSettings.rounds, supabase, session.id])

  const handleModeChange = useCallback((newMode: TimerMode) => {
    const modeMessages: Record<TimerMode, string> = {
      short: `${actorName} switched to short break ☕`,
      long: `${actorName} switched to long break 🎉`,
      focus: `${actorName} started a new focus session 🍅`,
    }
    const msg = modeMessages[newMode]
    pushActivity(msg)
    broadcastActivity(msg)
    const newState = setMode(newMode, toSecs(sessionSettings.durations))
    setShowBreakOverlay(false)
    if (canControl) {
      broadcastWithCount(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft, total_time: newState.totalTime, mode: newState.mode }).eq('id', session.id)
    }
  }, [setMode, actorName, canControl, broadcastWithCount, broadcastActivity, pushActivity, sessionSettings.durations, supabase, session.id])

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
      accepted: ok !== false,
      // Include settings so the watcher can apply them locally without a separate broadcast
      settings: ok !== false ? {
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
    : `Session ${focusCount} of ${sessionSettings.rounds} · ${mode === 'long' ? 'long break' : 'short break'}`

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 sm:px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/" aria-label="Back to home">
          <Logo size="sm" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Session title */}
          {session.title && (
            <span
              className="text-sm hidden sm:block"
              style={{ color: 'var(--text-muted)' }}
            >
              {session.title}
            </span>
          )}

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

          <ThemeToggle />
        </div>
      </header>

      {/* Jam mode banner for watchers */}
      {jamMode && !isHost && (
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
            jamMode={jamMode}
            onPlay={handleStart}
            onPause={handlePause}
            onSkip={handleSkip}
            onReset={handleReset}
          />

          {/* Share + Jam row */}
          <div className="flex items-center gap-2 w-full">
            {/* Invite button — hidden for viewers when host has locked sharing */}
            {(isHost || sessionSettings.allowGuestShare) && (
            <div className="relative flex-1" ref={sharePanelRef}>
              <button
                onClick={() => setShowSharePanel(v => !v)}
                aria-label="Share session"
                aria-expanded={showSharePanel}
                className="h-10 w-full flex items-center justify-center gap-1.5 px-4 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer"
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
                      <div
                        className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl z-50 p-4 animate-scale-in"
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--shadow-lg)',
                        }}
                      >
                        <SettingsPanel
                          settings={sessionSettings}
                          onApply={handleSendSettingsRequest}
                          isWatcher
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {isHost && (
              <>
                {/* Mode selector: Host | Jam */}
                <div className="flex-1 flex">
                  <div className="flex items-center rounded-xl overflow-hidden border h-10 w-full" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => { setModeTipDismissed(true); if (jamMode) handleToggleJamMode() }}
                      title="You control the timer. Everyone else follows along in sync."
                      className="h-full flex-1 flex items-center justify-center text-sm font-medium transition-all duration-150 cursor-pointer"
                      style={
                        !jamMode
                          ? { background: 'var(--accent)', color: '#fff' }
                          : { background: 'var(--bg-secondary)', color: 'var(--text-muted)' }
                      }
                    >
                      Host
                    </button>
                    <button
                      onClick={() => { setModeTipDismissed(true); if (!jamMode) handleToggleJamMode() }}
                      title="Everyone in the session can control the timer."
                      className="h-full flex-1 flex items-center justify-center text-sm font-medium transition-all duration-150 cursor-pointer"
                      style={
                        jamMode
                          ? { background: 'var(--green)', color: '#fff' }
                          : { background: 'var(--bg-secondary)', color: 'var(--text-muted)' }
                      }
                    >
                      Jam
                    </button>
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
                    <div
                      className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl z-50 p-4 animate-scale-in"
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
                      />
                    </div>
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
          onSkip={() => { setShowNicknamePrompt(false); setNicknameReady(true) }}
        />
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
