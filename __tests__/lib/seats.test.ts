import { describe, it, expect } from 'vitest'
import { SEATS, SEAT_PREFERENCE, FIRE_X, FIRE_Y, assignSeats, outwardVector } from '@/lib/seats'
import type { BonfireParticipant, SeatIndex } from '@/types'

function p(key: string, joinedSecond: number, seat: SeatIndex | null): BonfireParticipant {
  return {
    key,
    username: key,
    joined_at: new Date(Date.UTC(2026, 0, 1, 0, 0, joinedSecond)).toISOString(),
    is_initiator: false,
    seat,
  }
}

describe('SEATS', () => {
  it('has six seats: three behind the fire, three in front', () => {
    expect(SEATS).toHaveLength(6)
    expect(SEATS.filter(s => s.row === 'back').map(s => s.index)).toEqual([0, 1, 2])
    expect(SEATS.filter(s => s.row === 'front').map(s => s.index)).toEqual([3, 4, 5])
    for (const s of SEATS) {
      if (s.row === 'back') expect(s.y).toBeLessThan(FIRE_Y)
      else expect(s.y).toBeGreaterThan(FIRE_Y)
    }
  })

  it('poses every character towards the fire', () => {
    for (const s of SEATS) {
      if (s.pose === 'side-right') expect(s.x).toBeLessThan(FIRE_X)
      if (s.pose === 'side-left') expect(s.x).toBeGreaterThan(FIRE_X)
    }
    expect(SEATS[0].pose).toBe('front')
    expect(SEATS[5].pose).toBe('back')
  })

  it('is left/right symmetric', () => {
    expect(SEATS[1].x + SEATS[2].x).toBeCloseTo(100, 5)
    expect(SEATS[3].x + SEATS[4].x).toBeCloseTo(100, 5)
    expect(SEATS[1].y).toBe(SEATS[2].y)
  })

  it('preference order covers each seat once and starts balanced', () => {
    expect([...SEAT_PREFERENCE].sort()).toEqual([0, 1, 2, 3, 4, 5])
    // two people: mirrored pair
    const [a, b] = SEAT_PREFERENCE.slice(0, 2).map(i => SEATS[i])
    expect(a.x + b.x).toBeCloseTo(100, 5)
    expect(a.y).toBe(b.y)
  })
})

describe('outwardVector', () => {
  it('points away from the fire', () => {
    const top = outwardVector(SEATS[0])
    expect(top.dy).toBeCloseTo(-1, 5)
    const bottom = outwardVector(SEATS[5])
    expect(bottom.dy).toBeCloseTo(1, 5)
    const left = outwardVector(SEATS[3])
    expect(left.dx).toBeLessThan(0)
  })
})

describe('assignSeats', () => {
  it('uses server-assigned seats when they are unique', () => {
    const seats = assignSeats([p('a', 1, 3), p('b', 2, 4), p('c', 3, 0)])
    expect(seats.get('a')).toBe(3)
    expect(seats.get('b')).toBe(4)
    expect(seats.get('c')).toBe(0)
  })

  it('keeps everyone in their seat when someone leaves', () => {
    const before = assignSeats([p('a', 1, 3), p('b', 2, 4), p('c', 3, 0)])
    const after = assignSeats([p('b', 2, 4), p('c', 3, 0)])
    expect(after.get('b')).toBe(before.get('b'))
    expect(after.get('c')).toBe(before.get('c'))
  })

  it('resolves a duplicated seat in joined_at order', () => {
    const seats = assignSeats([p('late', 5, 3), p('early', 1, 3)])
    expect(seats.get('early')).toBe(3)
    expect(seats.get('late')).toBe(4) // next free in preference order
  })

  it('places participants without a seat in the next free balanced seat', () => {
    const seats = assignSeats([p('a', 1, null), p('b', 2, null), p('c', 3, null)])
    expect([seats.get('a'), seats.get('b'), seats.get('c')]).toEqual([3, 4, 0])
  })

  it('never places more than six', () => {
    const many = Array.from({ length: 8 }, (_, i) => p(`p${i}`, i, null))
    const seats = assignSeats(many)
    expect(seats.size).toBe(6)
    expect(new Set(seats.values()).size).toBe(6)
  })
})
