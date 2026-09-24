'use client'

import { useState } from 'react'

interface RoomActionsProps {
  isInitiator: boolean
  leaving: boolean
  onStepAway: () => void
  onEnd: () => Promise<void>
}

/**
 * Step away (everyone): only you leave; the Bonfire continues and your seat
 * is released. You can come back with the link.
 *
 * End Bonfire (initiator only): ends it for everyone after an inline confirm.
 */
export function RoomActions({ isInitiator, leaving, onStepAway, onEnd }: RoomActionsProps) {
  const [confirming, setConfirming] = useState(false)
  const [ending, setEnding] = useState(false)

  const end = async () => {
    setEnding(true)
    try {
      await onEnd()
    } finally {
      setEnding(false)
      setConfirming(false)
    }
  }

  return (
    <div className="bf-room-actions">
      <button type="button" className="bf-text-btn is-quiet" onClick={onStepAway} disabled={leaving}>
        Step away
      </button>

      {isInitiator && (
        confirming ? (
          <div className="bf-end-confirm" role="group" aria-label="Confirm ending the Bonfire">
            <span>End for everyone?</span>
            <span className="bf-sep" aria-hidden="true">·</span>
            <button type="button" className="bf-text-btn is-danger" onClick={() => void end()} disabled={ending} autoFocus>
              End
            </button>
            <span className="bf-sep" aria-hidden="true">·</span>
            <button type="button" className="bf-text-btn is-quiet" onClick={() => setConfirming(false)} disabled={ending}>
              Keep burning
            </button>
          </div>
        ) : (
          <button type="button" className="bf-text-btn is-danger" onClick={() => setConfirming(true)}>
            End Bonfire
          </button>
        )
      )}
    </div>
  )
}
