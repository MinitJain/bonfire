/**
 * "N today": the pomodoros this person completed since their local midnight,
 * across every Bonfire.
 *
 * Signed in: counted from their own pomodoro_logs rows (RLS: own rows only),
 * which complete_phase writes for everyone seated when a focus completes.
 * Guests: there is no server identity, so this browser keeps the count,
 * recording each completed focus it saw while holding a seat.
 */

import { createClient } from '@/lib/supabase/client'

/** Local calendar day: key (YYYY-MM-DD) and its [start, end) instants. */
export function localDay(now: Date = new Date()): { key: string; start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const key = [
    start.getFullYear(),
    String(start.getMonth() + 1).padStart(2, '0'),
    String(start.getDate()).padStart(2, '0'),
  ].join('-')
  return { key, start, end }
}

export interface TodayStats {
  pomodoros: number
  minutes: number
}

/** Signed-in user's completed pomodoros (and minutes) for their local today. */
export async function fetchTodayStats(userId: string, now: Date = new Date()): Promise<TodayStats | null> {
  const { start, end } = localDay(now)
  const { data, error } = await createClient()
    .from('pomodoro_logs')
    .select('duration_minutes')
    .eq('user_id', userId)
    .gte('completed_at', start.toISOString())
    .lt('completed_at', end.toISOString())
  if (error || !data) return null
  return {
    pomodoros: data.length,
    minutes: data.reduce((sum, row) => sum + (row.duration_minutes ?? 0), 0),
  }
}

// ─── Guests ──────────────────────────────────────────────────
// { day, seen: ["<bonfireId>:<pomodoro number>", ...] } for the current day
// only. Keyed by pomodoro, so refreshes and several tabs count it once.

const GUEST_KEY = 'bonfire_today'

interface GuestDay {
  day: string
  seen: string[]
}

function readGuestDay(day: string): GuestDay {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_KEY) ?? 'null') as Partial<GuestDay> | null
    if (raw?.day === day && Array.isArray(raw.seen)) {
      return { day, seen: raw.seen.filter((s): s is string => typeof s === 'string') }
    }
  } catch {
    /* unavailable or corrupt: start the day fresh */
  }
  return { day, seen: [] }
}

export function getGuestTodayCount(now: Date = new Date()): number {
  if (typeof window === 'undefined') return 0
  return readGuestDay(localDay(now).key).seen.length
}

/** Record a completed focus seen by this browser. Returns today's count. */
export function recordGuestPomodoro(bonfireId: string, pomodoroNumber: number, now: Date = new Date()): number {
  if (typeof window === 'undefined') return 0
  const today = readGuestDay(localDay(now).key)
  const id = `${bonfireId}:${pomodoroNumber}`
  if (!today.seen.includes(id)) today.seen.push(id)
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(today))
  } catch {
    /* storage unavailable */
  }
  return today.seen.length
}
