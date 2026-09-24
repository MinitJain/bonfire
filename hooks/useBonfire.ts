'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BonfireState } from '@/types'
import {
  startTimer,
  pauseTimer,
  skipPhase,
  completePhase,
  changeSettings,
  toggleMode,
  endBonfire,
  setBonfireDetails,
  getInitiatorToken,
  fetchBonfire,
  isNewerState,
} from '@/lib/bonfire'

interface UseBonfireOptions {
  initial: BonfireState
  /** Signed-in user id, known on the server. null for guests. */
  userId: string | null
  /** Whether this client currently holds a seat (required for Jam control). */
  hasSeat: boolean
}

export interface SettingsInput {
  focusDuration?: number
  shortDuration?: number
  longDuration?: number
  roundsBeforeLong?: number
}

interface UseBonfireReturn {
  state: BonfireState
  canControl: boolean
  isInitiator: boolean
  /** Apply a database-originated state_update received on the channel. */
  applyRemote: (state: BonfireState) => void
  /** Re-read the authoritative state (after (re)subscribing, or a rejected command). */
  resync: () => Promise<void>
  start: () => Promise<void>
  pause: () => Promise<void>
  skip: () => Promise<void>
  complete: () => Promise<void>
  settings: (opts: SettingsInput) => Promise<void>
  toggleMode: () => Promise<void>
  end: () => Promise<void>
  /** Initiator only: Bonfire name ('' clears) and/or their display name. */
  details: (d: { name?: string; initiatorName?: string }) => Promise<void>
}

/**
 * Server-authoritative session hook.
 *
 * Commands go through RPC -> database. The database trigger fires pg_net,
 * the Edge Function publishes to the Realtime channel (see useBonfireChannel),
 * and every client applies what the server declared via applyRemote.
 *
 * The command issuer applies the RPC return value immediately. canControl
 * only decides which controls are shown; the RPCs authorize every command.
 *
 * Every incoming state goes through `accept`: broadcasts are not delivered
 * in order, so a state older than the one held (by version) is dropped.
 */
export function useBonfire({ initial, userId, hasSeat }: UseBonfireOptions): UseBonfireReturn {
  const [state, setState] = useState<BonfireState>(initial)
  const stateRef = useRef(state)
  const [hasInitiatorToken, setHasInitiatorToken] = useState(false)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    setHasInitiatorToken(getInitiatorToken(initial.id) !== null)
  }, [initial.id])

  // A guest initiator is recognised by holding the token create_bonfire gave
  // them. The token itself is never readable from bonfire state.
  const isInitiator = useMemo(() => {
    if (userId && state.initiator_id) return userId === state.initiator_id
    return hasInitiatorToken
  }, [userId, state.initiator_id, hasInitiatorToken])

  const canControl = isInitiator || (state.session_mode === 'jam' && hasSeat)

  const accept = useCallback((next: BonfireState | null) => {
    if (!next || next.id !== stateRef.current.id) return
    if (!isNewerState(next, stateRef.current)) return
    stateRef.current = next
    setState(next)
  }, [])

  const applyRemote = accept

  const resync = useCallback(async () => {
    const { data } = await fetchBonfire(stateRef.current.id)
    accept(data)
  }, [accept])

  // A rejected command usually means this client's view was stale
  // ("Timer not running", "has not expired yet"): re-read the truth.
  const run = useCallback(
    async (command: (id: string) => Promise<{ data: BonfireState | null; error: string | null }>) => {
      const result = await command(stateRef.current.id)
      if (result.data) accept(result.data)
      else if (result.error) await resync()
    },
    [accept, resync],
  )

  const start = useCallback(() => run(startTimer), [run])
  const pause = useCallback(() => run(pauseTimer), [run])
  const skip = useCallback(() => run(skipPhase), [run])
  const complete = useCallback(() => run(completePhase), [run])
  const toggle = useCallback(() => run(toggleMode), [run])
  const end = useCallback(() => run(endBonfire), [run])
  const settings = useCallback(
    (opts: SettingsInput) => run(id => changeSettings(id, opts)),
    [run],
  )
  const details = useCallback(
    (d: { name?: string; initiatorName?: string }) => run(id => setBonfireDetails(id, d)),
    [run],
  )

  return {
    state,
    canControl,
    isInitiator,
    applyRemote,
    resync,
    start,
    pause,
    skip,
    complete,
    settings,
    toggleMode: toggle,
    end,
    details,
  }
}
