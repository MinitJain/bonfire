'use client'

import { useToday } from '@/hooks/useToday'

/**
 * Today's pomodoros and minutes for the signed-in viewer, by their local
 * day (the chart below groups days in UTC, which the server can render).
 */
export function TodayStat({ userId }: { userId: string }) {
  const today = useToday({ userId })
  if (!today) return null
  return (
    <p className="text-xs tabular-nums text-[var(--text-muted)]">
      Today:{' '}
      <span className="text-[var(--text-primary)]">
        {today.pomodoros} {today.pomodoros === 1 ? 'pomodoro' : 'pomodoros'}
      </span>
      {' · '}
      {today.minutes} min
    </p>
  )
}
