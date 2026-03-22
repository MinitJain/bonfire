'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Wifi, WifiOff, Zap, Users, Settings } from 'lucide-react'
import type { Session, TimerMode, TimerState } from '@/types'
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
import { BreakOverlay } from '@/components/session/BreakOverlay'
import { AmbientPlayer } from '@/components/session/AmbientPlayer'
import { ToastProvider } from '@/components/ui/Toast'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

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
    allowGuestShare: true,
  })
  const [showSettings, setShowSettings] = useState(false)
  const sharePanelRef = useRef<HTMLDivElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)
  const hasRequestedNotifRef = useRef(false)
  const supabase = createClient()

  // Guest host detection via localStorage
  useEffect(() => {
    if (!isHostProp) {
      const guestOwned = localStorage.getItem(`pomodoro_host_${session.id}`) === '1'
      if (guestOwned) setIsHost(true)
    }
  }, [session.id, isHostProp])

  const canControl = isHost || jamMode

  const modeRef = useRef<TimerMode>('focus')

  const handleExpire = useCallback(() => {
    setShowBreakOverlay(true)
    playCompleteSound()
    showNotification('PomodoroJam', 'Your session has ended! Time for a break.')
    // Log completed pomodoro for authenticated users (focus mode only)
    if (userId && modeRef.current === 'focus') {
      const minutes = Math.round(sessionSettings.durations.focus)
      supabase.rpc('increment_profile_stats', { p_user_id: userId, p_minutes: minutes })
    }
  }, [userId, sessionSettings.durations.focus, supabase])

  const {
    timeLeft, status, mode, timerState,
    start, pause, reset, setMode, applyState,
  } = useTimer({
    initialState: sessionToTimerState(session),
    onExpire: handleExpire,
  })

  const { participants, isConnected, broadcastTimerState, onTimerUpdate, broadcastShareLock, onShareLock, onParticipantJoin } = useSession({
    sessionId: session.id,
    userId,
    isHost: canControl,
    username,
    avatarUrl,
  })

  // Keep refs up to date
  useEffect(() => { modeRef.current = mode }, [mode])

  // Keep a ref to timerState so join handler always has the latest without re-subscribing
  const timerStateRef = useRef(timerState)
  useEffect(() => { timerStateRef.current = timerState }, [timerState])

  // Receive timer updates (only when we can't control)
  useEffect(() => {
    if (canControl) return
    const unsubscribe = onTimerUpdate((state: TimerState) => {
      applyState(state)
    })
    return unsubscribe
  }, [canControl, onTimerUpdate, applyState])

  // Re-broadcast current timer state when a new participant joins (host only)
  useEffect(() => {
    if (!canControl) return
    const unsubscribe = onParticipantJoin(() => {
      broadcastTimerState(timerStateRef.current)
    })
    return unsubscribe
  }, [canControl, onParticipantJoin, broadcastTimerState])

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

  // Toggle jam mode (host only) — persisted to DB
  const handleToggleJamMode = useCallback(async () => {
    const next = !jamMode
    setJamMode(next)
    await supabase
      .from('sessions')
      .update({ jam_mode: next })
      .eq('id', session.id)
  }, [jamMode, session.id, supabase])

  const handleStart = useCallback(() => {
    const newState = start()
    if (canControl) {
      broadcastTimerState(newState)
      supabase.from('sessions').update({ running: true, time_left: newState.timeLeft, mode: newState.mode }).eq('id', session.id)
    }
  }, [start, canControl, broadcastTimerState, supabase, session.id])

  const handlePause = useCallback(() => {
    const newState = pause()
    if (canControl) {
      broadcastTimerState(newState)
      supabase.from('sessions').update({ running: false, time_left: newState.timeLeft }).eq('id', session.id)
    }
  }, [pause, canControl, broadcastTimerState, supabase, session.id])

  const toSecs = (d: TimerDurations) => ({
    focus: d.focus * 60,
    short: d.short * 60,
    long: d.long * 60,
  })

  const handleReset = useCallback(() => {
    const newState = reset(toSecs(sessionSettings.durations))
    setShowBreakOverlay(false)
    if (canControl) broadcastTimerState(newState)
  }, [reset, canControl, broadcastTimerState, sessionSettings.durations])

  const handleSkip = useCallback(() => {
    const nextMode: TimerMode =
      mode === 'focus' ? 'short' : mode === 'short' ? 'long' : 'focus'
    const newState = setMode(nextMode, toSecs(sessionSettings.durations))
    setShowBreakOverlay(false)
    if (canControl) broadcastTimerState(newState)
  }, [mode, setMode, canControl, broadcastTimerState, sessionSettings.durations])

  const handleModeChange = useCallback((newMode: TimerMode) => {
    const newState = setMode(newMode, toSecs(sessionSettings.durations))
    setShowBreakOverlay(false)
    if (canControl) broadcastTimerState(newState)
  }, [setMode, canControl, broadcastTimerState, sessionSettings.durations])

  const handleApplySettings = useCallback((newSettings: SessionSettings) => {
    setSessionSettings(newSettings)
    setShowSettings(false)
    // Reset timer with new durations
    const newState = reset(toSecs(newSettings.durations))
    if (canControl) broadcastTimerState(newState)
    // Broadcast share lock change
    broadcastShareLock(!newSettings.allowGuestShare)
  }, [reset, canControl, broadcastTimerState, broadcastShareLock])

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
                {/* Jam mode toggle (host only) */}
                <button
                  onClick={handleToggleJamMode}
                  title={jamMode ? 'Switch to Host Mode' : 'Switch to Jam Mode'}
                  aria-label={jamMode ? 'Switch to Host Mode' : 'Switch to Jam Mode'}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap"
                  style={
                    jamMode
                      ? {
                          background: 'var(--green-soft)',
                          borderColor: 'var(--green)',
                          color: 'var(--green)',
                        }
                      : {
                          background: 'var(--bg-secondary)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)',
                        }
                  }
                >
                  <Zap className="w-3.5 h-3.5" />
                  {jamMode ? 'Jam' : 'Host only'}
                </button>

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
                      className="absolute right-0 bottom-12 w-64 rounded-2xl z-50 p-4 animate-scale-in"
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

          <AmbientPlayer />
        </div>
      </main>

      <BreakOverlay
        visible={showBreakOverlay}
        onDismiss={() => {
          setShowBreakOverlay(false)
          if (canControl) handleSkip()
        }}
        mode={mode}
      />
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
