'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { BonfireState } from '@/types'
import { useBonfire } from '@/hooks/useBonfire'
import { useBonfireChannel } from '@/hooks/useBonfireChannel'
import { usePresence } from '@/hooks/usePresence'
import { usePresenceKey } from '@/hooks/usePresenceKey'
import { useSeat } from '@/hooks/useSeat'
import { useSceneParticipants } from '@/hooks/useSceneParticipants'
import { useCountdown, phaseDuration } from '@/hooks/useCountdown'
import { useBonfireState } from '@/hooks/useBonfireState'
import {
  getBonfireDisplayName,
  getParticipantToken,
  getStoredDisplayName,
  storeBonfireDisplayName,
  storeDisplayName,
} from '@/lib/bonfire'
import { formatTime } from '@/lib/timer'
import { playCompleteSound, showNotification } from '@/lib/audio'
import { CampfireCircle } from '@/components/bonfire/CampfireCircle'
import { TimerDisplay } from '@/components/bonfire/TimerDisplay'
import { TimerControls } from '@/components/bonfire/TimerControls'
import { RoomActions } from '@/components/bonfire/RoomActions'
import { RoomTitle } from '@/components/bonfire/RoomTitle'
import { NamePrompt, type NameChoice } from '@/components/bonfire/NamePrompt'
import { useRoomSound } from '@/components/bonfire/AudioControls'
import { RoomMenu } from '@/components/bonfire/RoomMenu'
import { SettledScene } from '@/components/bonfire/SettledScene'

interface BonfireRoomProps {
  initial: BonfireState
  /** Signed-in user id, or null for guests. */
  userId: string | null
  /** Profile name for signed-in users: only a prefill for "Choose your name". */
  displayName: string | null
}

export function BonfireRoom({ initial, userId, displayName }: BonfireRoomProps) {
  const router = useRouter()
  const presenceKey = usePresenceKey(userId)

  // ── Name: chosen once per Bonfire ─────────────────────────────────
  // Returning to a Bonfire this browser already holds a credential for
  // (refresh, reconnect) reuses the name chosen for it. Otherwise everyone,
  // creator included, sees "Choose your name", prefilled from the profile
  // (signed in) or the last name used as a guest.
  const [name, setName] = useState<string | null>(null)
  const [askName, setAskName] = useState(false)
  const [prefill, setPrefill] = useState<string | null>(displayName)

  useEffect(() => {
    const chosenHere = getBonfireDisplayName(initial.id)
    if (chosenHere && getParticipantToken(initial.id)) {
      setName(chosenHere)
      return
    }
    setPrefill(displayName ?? getStoredDisplayName())
    setAskName(true)
  }, [initial.id, displayName])

  // ── Seat, authoritative state, and the one shared channel ─────────
  const seat = useSeat({ bonfireId: initial.id, name, enabled: initial.status === 'active' })
  const seated = seat.status === 'seated'

  const bonfire = useBonfire({ initial, userId, hasSeat: seated })
  const { state, isInitiator, canControl } = bonfire

  const { details } = bonfire
  const chooseName = useCallback((choice: NameChoice) => {
    storeBonfireDisplayName(initial.id, choice.name)
    storeDisplayName(choice.name)
    setName(choice.name)
    setAskName(false)
    // The creator's chosen name is what invitations show ("Alex is inviting you…")
    if (isInitiator) {
      void details({
        initiatorName: choice.name,
        name: choice.bonfireName ? choice.bonfireName : undefined,
      })
    }
  }, [initial.id, isInitiator, details])

  // ── Sound: silent until the participant chooses otherwise ─────────
  const sound = useRoomSound()
  const chimeRef = useRef(sound.chime)
  useEffect(() => {
    chimeRef.current = sound.chime
  }, [sound.chime])

  const channel = useBonfireChannel({
    bonfireId: initial.id,
    presenceKey,
    onStateUpdate: bonfire.applyRemote,
  })

  usePresence({
    channel,
    self: seated && name
      ? { username: name, is_initiator: isInitiator, seat: seat.seat }
      : null,
  })

  const sceneParticipants = useSceneParticipants(channel.participants)
  const presentCount = sceneParticipants.filter(p => !p.leaving).length

  // ── Timer ─────────────────────────────────────────────────────────
  const completingRef = useRef(false)
  const { complete } = bonfire
  const handleExpiry = useCallback(() => {
    if (completingRef.current) return
    completingRef.current = true
    if (chimeRef.current) {
      playCompleteSound()
      showNotification('Bonfire', 'Time to breathe')
    }
    complete().finally(() => {
      completingRef.current = false
    })
  }, [complete])

  const timeLeft = useCountdown(state, handleExpiry)
  const totalTime = phaseDuration(state)
  const started = state.running || state.time_left < totalTime
  const ended = state.status === 'ended'

  const fire = useBonfireState({
    status: ended ? 'finished' : state.running ? 'running' : 'paused',
    mode: state.phase,
    focusCount: state.completed_pomodoros,
    participantCount: presentCount,
    timeLeft,
    totalTime,
    curve: 'room',
  })

  useEffect(() => {
    document.title = state.running && timeLeft > 0 ? `${formatTime(timeLeft)} | Bonfire` : 'Bonfire'
    return () => { document.title = 'Bonfire' }
  }, [timeLeft, state.running])

  // ── Connection status: only surfaced when it is actually a problem ─
  const [slowToConnect, setSlowToConnect] = useState(false)
  useEffect(() => {
    if (channel.isConnected) {
      setSlowToConnect(false)
      return
    }
    const t = setTimeout(() => setSlowToConnect(true), 5000)
    return () => clearTimeout(t)
  }, [channel.isConnected])
  const reconnecting = !channel.isConnected && (channel.hasConnected || slowToConnect)

  // ── Step away ─────────────────────────────────────────────────────
  const [leaving, setLeaving] = useState(false)
  const { release } = seat
  const { untrack } = channel
  const stepAway = useCallback(async () => {
    setLeaving(true)
    try {
      await Promise.allSettled([release(), untrack()])
    } finally {
      router.push('/')
    }
  }, [release, untrack, router])

  if (ended) return <SettledScene phase={state.phase} />

  return (
    <div className="bf-stage">
      <div className="bf-corner bf-corner-left">
        <span className="bf-wordmark-sm">Bonfire</span>
      </div>

      {reconnecting && <p className="bf-status" role="status">reconnecting…</p>}

      <RoomMenu
        state={state}
        canControl={canControl}
        isInitiator={isInitiator}
        onSaveSettings={bonfire.settings}
        onToggleMode={bonfire.toggleMode}
        onRename={bonfireName => bonfire.details({ name: bonfireName })}
        sound={sound}
      />

      <main className="bf-stage-main">
        <RoomTitle state={state} />

        <CampfireCircle
          intensity={fire.targetIntensity}
          isSurging={fire.isSurging}
          phase={state.phase}
          participants={sceneParticipants}
          selfKey={presenceKey}
        />

        {/* Choose your name comes before entering the scene, so the timer waits */}
        {!(askName && !name) && (
          <TimerDisplay
            timeLeft={timeLeft}
            running={state.running}
            started={started}
            phase={state.phase}
            mode={state.session_mode}
          />
        )}

        {askName && !name ? (
          <NamePrompt
            defaultName={prefill}
            isCreator={isInitiator}
            defaultBonfireName={state.name}
            onSubmit={chooseName}
          />
        ) : seat.status === 'full' ? (
          <div className="bf-message">
            <p className="bf-message-title">This bonfire is full</p>
            <p className="bf-message-body">Six people are already gathered around this fire.</p>
            <Link href="/" className="bf-btn-primary">light your own</Link>
          </div>
        ) : seat.status === 'error' ? (
          <div className="bf-message">
            <p className="bf-message-body">We couldn&apos;t find you a seat.</p>
            <button type="button" className="bf-btn-secondary" onClick={seat.retry}>try again</button>
          </div>
        ) : (
          <>
            <TimerControls
              running={state.running}
              started={started}
              canControl={canControl && (seated || isInitiator)}
              onStart={bonfire.start}
              onPause={bonfire.pause}
              onSkip={bonfire.skip}
            />
            <RoomActions
              isInitiator={isInitiator}
              leaving={leaving}
              onStepAway={() => void stepAway()}
              onEnd={bonfire.end}
            />
          </>
        )}
      </main>
    </div>
  )
}
