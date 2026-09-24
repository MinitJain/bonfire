'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchTodayStats,
  getGuestTodayCount,
  localDay,
  recordGuestPomodoro,
  type TodayStats,
} from '@/lib/today'

interface UseTodayOptions {
  /** Signed-in user id, or null for a guest. */
  userId: string | null
  /** In a room: the fire's completed pomodoros, to notice a focus finishing. */
  room?: { bonfireId: string; completedPomodoros: number; seated: boolean }
}

/**
 * This person's pomodoros for their local today, across all Bonfires.
 * null until known. Refreshes when a focus completes in the room, when the
 * tab becomes visible again, and at local midnight.
 */
export function useToday({ userId, room }: UseTodayOptions): TodayStats | null {
  const [today, setToday] = useState<TodayStats | null>(null)

  const refresh = useCallback(async () => {
    if (userId) {
      const stats = await fetchTodayStats(userId)
      if (stats) setToday(stats)
    } else {
      setToday({ pomodoros: getGuestTodayCount(), minutes: 0 })
    }
  }, [userId])

  useEffect(() => {
    void refresh()
    function onVisible() {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    // Roll over at local midnight, a moment after it passes
    const untilMidnight = localDay().end.getTime() - Date.now() + 1000
    const midnight = setTimeout(() => void refresh(), untilMidnight)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearTimeout(midnight)
    }
  }, [refresh])

  // A focus finished around this fire. Pomodoros already done when this
  // page loaded are the baseline, not new ones.
  const completed = room?.completedPomodoros
  const seenRef = useRef(completed)
  const bonfireId = room?.bonfireId
  const seated = room?.seated ?? false
  useEffect(() => {
    if (completed === undefined || !bonfireId) return
    const prev = seenRef.current ?? completed
    seenRef.current = completed
    if (completed <= prev) return

    if (userId) {
      // complete_phase has already written the log when this state arrives
      void refresh()
    } else if (seated) {
      let count = 0
      for (let n = prev + 1; n <= completed; n++) count = recordGuestPomodoro(bonfireId, n)
      setToday({ pomodoros: count, minutes: 0 })
    }
  }, [completed, bonfireId, seated, userId, refresh])

  return today
}
