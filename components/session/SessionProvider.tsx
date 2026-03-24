'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Wifi, WifiOff, Zap, Users, Settings } from 'lucide-react'
import type { ActivityItem, Session, TimerMode, TimerState } from '@/types'
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
import { AmbientPlayer } from '@/components/session/AmbientPlayer'
import { ModeTipBubble } from '@/components/session/ModeTipBubble'
import { ToastProvider } from '@/components/ui/Toast'
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
  const [showSettings, setShowSettings] = useState(false)
  const [modeTipDismissed, setModeTipDismissed] = useState(false)
  const sharePanelRef = useRef<HTMLDivElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)
  const hasRequestedNotifRef = useRef(false)
  const supabase = useMemo(() => createClient(), [])

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

  const { participants, isConnected, broadcastTimerState, onTimerUpdate, broadcastShareLock, onShareLock, broadcastJamMode, onJamMode, onParticipantJoin, onParticipantLeave, broadcastActivity, onActivity, updatePresence } = useSession({
    sessionId: session.id,
    userId,
    isHost,
    username,
    avatarUrl,
  })

  // Keep late-bound refs up to date
  useEffect(() => { skipAndStartRef.current = skipAndStart }, [skipAndStart])
  useEffect(() => { broadcastTimerStateRef.current = broadcastTimerState }, [broadcastTimerState])

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
      if (isHost) broadcastTimerState(timerStateRef.current)
    })
  }, [onParticipantJoin, pushActivity, isHost, broadcastTimerState])

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

  // Toggle jam mode (host only) — persisted to DB and broadcast to existing participants
  const handleToggleJamMode = useCallback(async () => {
    const next = !jamMode
    setJamMode(next)
    broadcastJamMode(next)
    const msg = next ? 'Jam Mode on — everyone can control ⚡' : 'Back to host control 👑'
    pushActivity(msg)
    broadcastActivity(msg)
    await supabase
      .from('sessions')
      .update({ jam_mode: next })
      .eq('id', session.id)
  }, [jamMode, session.id, supabase, broadcastJamMode, broadcastActivity, pushActivity])

  // Non-hosts receive jam mode changes from the host
  useEffect(() => {
    if (isHost) return
    const unsubscribe = onJamMode((next) => {
      setJamMode(next)
    })
    return unsubscribe
  }, [isHost, onJamMode])

  const handleStart = useCallback(() => {
    const newState = start()
    const msg = `${actorName} started the timer ▶`
    pushActivity(msg)
    broadcastActivity(msg)
    if (canControl) {
      broadcastTimerState(newState)
      supabase.from('sessions').update({ running: true, time_left: newState.timeLeft, mode: newState.mode }).eq('id', session.id)
    }
  }, [start, actorName, canControl, broadcastTimerState, broadcastActivity, pushActivity, supabase, session.id])

  const handlePause = useCallback(() => {
    const newState = pause()
    const mins = String(Math.floor(newState.timeLeft / 60)).padStart(2, '0')
    const secs = String(newState.timeLeft % 60).padStart(2, '0')
    const msg = `${actorName} paused · ${mins}:${secs} left ⏸`
    pushActivity(msg)
    broadcastActivity(msg)
    if (canControl) {
      broadcastTimerState(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft }).eq('id', session.id)
    }
  }, [pause, actorName, canControl, broadcastTimerState, broadcastActivity, pushActivity, supabase, session.id])

  const handleReset = useCallback(() => {
    const newState = reset(toSecs(sessionSettings.durations))
    setShowBreakOverlay(false)
    const msg = `${actorName} reset the timer ↺`
    pushActivity(msg)
    broadcastActivity(msg)
    if (canControl) {
      broadcastTimerState(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft, total_time: newState.totalTime, mode: newState.mode }).eq('id', session.id)
    }
  }, [reset, actorName, canControl, broadcastTimerState, broadcastActivity, pushActivity, sessionSettings.durations, supabase, session.id])

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
      broadcastTimerState(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft, total_time: newState.totalTime, mode: newState.mode }).eq('id', session.id)
    }
  }, [mode, actorName, setMode, canControl, broadcastTimerState, broadcastActivity, pushActivity, sessionSettings.durations, sessionSettings.rounds, supabase, session.id])

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
      broadcastTimerState(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft, total_time: newState.totalTime, mode: newState.mode }).eq('id', session.id)
    }
  }, [setMode, actorName, canControl, broadcastTimerState, broadcastActivity, pushActivity, sessionSettings.durations, supabase, session.id])

  const handleApplySettings = useCallback((newSettings: SessionSettings) => {
    setSessionSettings(newSettings)
    setShowSettings(false)
    focusCountRef.current = 0
    setFocusCount(0)
    const newState = reset(toSecs(newSettings.durations))
    if (canControl) {
      broadcastTimerState(newState)
      supabase.from('sessions').update({
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
    }
    broadcastShareLock(!newSettings.allowGuestShare)
  }, [reset, canControl, broadcastTimerState, broadcastShareLock, supabase, session.id])

  const progress = computeProgress(timerState)

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

          {/* Round indicator */}
          {(focusCount > 0 || mode !== 'focus') && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {mode === 'focus'
                ? `Round ${focusCount + 1} · long break after ${sessionSettings.rounds - (focusCount % sessionSettings.rounds)} more`
                : `Session ${focusCount} of ${sessionSettings.rounds} · ${mode === 'long' ? 'long break' : 'short break'}`
              }
            </p>
          )}

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
            {/* Share button — hidden for viewers when host has locked sharing */}
            {(isHost || sessionSettings.allowGuestShare) && (
            <div className="relative flex-1" ref={sharePanelRef}>
              <button
                onClick={() => setShowSharePanel(v => !v)}
                aria-label="Share session"
                aria-expanded={showSharePanel}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer"
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

            {isHost && (
              <>
                {/* Mode selector: Host | Jam */}
                <div className="flex items-center rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => { setModeTipDismissed(true); if (jamMode) handleToggleJamMode() }}
                    title="You control the timer. Everyone else follows along in sync."
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap"
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
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap"
                    style={
                      jamMode
                        ? { background: 'var(--green)', color: '#fff' }
                        : { background: 'var(--bg-secondary)', color: 'var(--text-muted)' }
                    }
                  >
                    <Zap className="w-3 h-3" />
                    Jam
                  </button>
                </div>

                {/* Settings gear (host only) */}
                <div ref={settingsPanelRef} className="relative">
                  <button
                    onClick={() => setShowSettings(v => !v)}
                    title="Timer settings"
                    aria-label="Timer settings"
                    className="p-2.5 rounded-xl border transition-all cursor-pointer"
                    style={{
                      background: showSettings ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                      borderColor: showSettings ? 'var(--accent)' : 'var(--border)',
                      color: showSettings ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {showSettings && (
                    <div
                      className="absolute right-0 bottom-12 w-72 rounded-2xl z-50 p-4 animate-scale-in"
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

          {/* Inline hint text — always visible for host */}
          {isHost && (
            <p
              className="text-center"
              style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-dm-sans)' }}
            >
              Host - only you control the timer · Jam - everyone controls together
            </p>
          )}

          <ParticipantList participants={participants} />

          <AmbientPlayer />
        </div>
      </main>

      {isHost && <ModeTipBubble externalDismiss={modeTipDismissed} />}

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

      {showNicknamePrompt && (
        <GuestNicknamePrompt
          onSave={(name) => {
            setLocalUsername(name)
            localStorage.setItem(`pomodoro_nick_${session.id}`, name)
            updatePresence(name)
            setShowNicknamePrompt(false)
          }}
          onSkip={() => setShowNicknamePrompt(false)}
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
