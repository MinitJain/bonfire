import type { BonfireParticipant, SeatIndex } from '@/types'

/**
 * Six seats around the fire.
 *
 * Coordinates are percentages of the campfire circle, where the fire's base
 * sits at (FIRE_X, FIRE_Y). Each seat point is where the character sits
 * (the bottom-centre of the figure).
 *
 *              0 top
 *   1 upper-left      2 upper-right
 *                FIRE
 *   3 lower-left      4 lower-right
 *             5 bottom
 */

export const MAX_SEATS = 6
export const FIRE_X = 50
export const FIRE_Y = 54

/** How the character is drawn so that it faces the fire. */
export type SeatPose = 'front' | 'back' | 'side-right' | 'side-left'

export interface Seat {
  index: SeatIndex
  x: number
  y: number
  pose: SeatPose
  /** Back-row seats sit behind the fire, front-row seats in front of it. */
  row: 'back' | 'front'
}

const RX = 38
const RY = 36

function onEllipse(deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return {
    x: Math.round((FIRE_X + RX * Math.cos(rad)) * 10) / 10,
    y: Math.round((FIRE_Y + RY * Math.sin(rad)) * 10) / 10,
  }
}

export const SEATS: readonly Seat[] = [
  { index: 0, ...onEllipse(-90), pose: 'front', row: 'back' },
  { index: 1, ...onEllipse(-150), pose: 'side-right', row: 'back' },
  { index: 2, ...onEllipse(-30), pose: 'side-left', row: 'back' },
  { index: 3, ...onEllipse(150), pose: 'side-right', row: 'front' },
  { index: 4, ...onEllipse(30), pose: 'side-left', row: 'front' },
  { index: 5, ...onEllipse(90), pose: 'back', row: 'front' },
]

/**
 * Seat preference order. Every prefix is a balanced arrangement:
 * 1 → a side, 2 → both front sides, 3 → triangle, 4 → kite, 5, 6 → full circle.
 * Mirrors v_pref in the join_bonfire RPC, which assigns seats server-side.
 */
export const SEAT_PREFERENCE: readonly SeatIndex[] = [3, 4, 0, 5, 1, 2]

export function isSeatIndex(value: unknown): value is SeatIndex {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < MAX_SEATS
}

/** Unit vector pointing from the fire towards the seat (used for arrive/leave drift). */
export function outwardVector(seat: Seat): { dx: number; dy: number } {
  const dx = seat.x - FIRE_X
  const dy = seat.y - FIRE_Y
  const len = Math.hypot(dx, dy) || 1
  return { dx: dx / len, dy: dy / len }
}

/**
 * Resolve which seat each participant is drawn in.
 *
 * Seats are assigned by the server (join_bonfire) and carried in presence,
 * so every client agrees and people keep their seat when others come and go.
 * This only repairs transient disagreements: a missing seat, or two presences
 * briefly claiming the same seat. Those are resolved in joined_at order, the
 * earlier arrival keeping the seat, the later one taking the next free seat
 * in preference order. At most six participants are placed.
 */
export function assignSeats(participants: readonly BonfireParticipant[]): Map<string, SeatIndex> {
  const ordered = [...participants].sort((a, b) => {
    const t = a.joined_at.localeCompare(b.joined_at)
    return t !== 0 ? t : a.key.localeCompare(b.key)
  })

  const result = new Map<string, SeatIndex>()
  const taken = new Set<SeatIndex>()
  const unplaced: BonfireParticipant[] = []

  for (const p of ordered) {
    if (isSeatIndex(p.seat) && !taken.has(p.seat)) {
      result.set(p.key, p.seat)
      taken.add(p.seat)
    } else {
      unplaced.push(p)
    }
  }

  for (const p of unplaced) {
    const free = SEAT_PREFERENCE.find(s => !taken.has(s))
    if (free === undefined) break
    result.set(p.key, free)
    taken.add(free)
  }

  return result
}
