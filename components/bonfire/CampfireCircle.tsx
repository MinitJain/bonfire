'use client'

import { useMemo } from 'react'
import type { BonfirePhase } from '@/types'
import { SEATS, outwardVector } from '@/lib/seats'
import { characterLook } from '@/lib/characters'
import { cn } from '@/lib/utils'
import type { SceneParticipant } from '@/hooks/useSceneParticipants'
import { FireScene } from '@/components/bonfire/FireScene'
import { Character } from '@/components/bonfire/Character'

interface CampfireCircleProps {
  intensity: number
  isSurging: boolean
  phase: BonfirePhase
  participants: SceneParticipant[]
  selfKey?: string | null
}

/**
 * The scene: a clearing below a soft horizon, the fire at its centre and
 * up to six people sitting around it in fixed seats.
 */
export function CampfireCircle({
  intensity,
  isSurging,
  phase,
  participants,
  selfKey,
}: CampfireCircleProps) {
  const present = participants.filter(p => !p.leaving)
  const label = present.length === 0
    ? 'The fire, with no one around it yet'
    : `${present.length} ${present.length === 1 ? 'person' : 'people'} around the fire`

  return (
    <div
      className="bf-circle"
      role="img"
      aria-label={label}
      style={{ '--fire-intensity': intensity.toFixed(2) } as React.CSSProperties}
    >
      <div className="bf-land" />
      <Horizon />
      <div className="bf-ground" />
      <div className="bf-lightpool" />

      <div className="bf-fire">
        <FireScene targetIntensity={intensity} isSurging={isSurging} mode={phase} />
      </div>

      {participants.map(entry => (
        <SeatedCharacter
          key={entry.participant.key}
          entry={entry}
          isSelf={entry.participant.key === selfKey}
        />
      ))}

      <ul className="sr-only">
        {present.map(p => (
          <li key={p.participant.key}>
            {p.participant.username ?? 'Someone'}
            {p.participant.is_initiator ? ', lit this bonfire' : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SeatedCharacter({ entry, isSelf }: { entry: SceneParticipant; isSelf: boolean }) {
  const seat = SEATS[entry.seat]
  const { dx, dy } = outwardVector(seat)
  const { key, username, is_initiator } = entry.participant
  const look = useMemo(() => characterLook(key), [key])
  const name = username ?? 'Someone'

  return (
    <div
      className="bf-seat"
      data-row={seat.row}
      style={{
        left: `${seat.x}%`,
        top: `${seat.y}%`,
        '--dx': dx.toFixed(3),
        '--dy': dy.toFixed(3),
        '--breath-delay': `${-(entry.seat * 0.9)}s`,
      } as React.CSSProperties}
    >
      <div className={cn('bf-seat-motion', entry.leaving && 'is-leaving')}>
        <div className={cn('bf-name', isSelf && 'is-self')}>
          {is_initiator && <span className="bf-ember-dot" title="Lit this bonfire" />}
          <span className="bf-name-text">{name}</span>
        </div>
        <Character look={look} pose={seat.pose} />
      </div>
    </div>
  )
}

function Horizon() {
  return (
    <svg className="bf-horizon" viewBox="0 0 1000 90" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 58C120 30 240 40 360 52C480 64 560 28 700 34C820 40 900 58 1000 42L1000 90L0 90Z"
        fill="var(--hill-far)"
      />
      <path
        d="M0 74C150 58 300 70 430 72C560 74 640 56 780 62C880 66 940 74 1000 70L1000 90L0 90Z"
        fill="var(--hill-near)"
      />
    </svg>
  )
}
