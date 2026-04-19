'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeeklyChart } from '@/components/profile/WeeklyChart'
import { StreakCalendar } from '@/components/profile/StreakCalendar'
import { Avatar } from '@/components/ui/Avatar'
import { toDayKey } from '@/lib/date'

interface TodayStats {
  pomodoros: number
  minutes: number
  sessions: number
}

interface LifetimeStats {
  total_pomodoros: number
  total_focus_minutes: number
  current_streak: number
  longest_streak: number
  display_name: string | null
  bio: string | null
}

interface DayBar {
  date: string
  label: string
  minutes: number
  isToday: boolean
}

interface CalendarCell {
  date: string
  minutes: number
}

function buildWeekDays(dayMap: Record<string, number>): DayBar[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = toDayKey(d)
    return {
      date: dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: dayMap[dateStr] ?? 0,
      isToday: i === 6,
    }
  })
}

function buildCalendarCells(dayMap: Record<string, number>): CalendarCell[] {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 371)
  const dow = start.getDay()
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1))
  const cells: CalendarCell[] = []
  const cur = new Date(start)
  while (cells.length < 53 * 7) {
    const dateStr = toDayKey(cur)
    cells.push({ date: dateStr, minutes: dayMap[dateStr] ?? 0 })
    cur.setDate(cur.getDate() + 1)
  }
  return cells
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return '0m'
  if (minutes < 60) return `${minutes}m`
  return `${(minutes / 60).toFixed(1)}h`
}

interface StatsTabProps {
  userId: string | null
  username: string | null
  avatarUrl: string | null
}

export function StatsTab({ userId, username, avatarUrl }: StatsTabProps) {
  const supabase = useMemo(() => createClient(), [])
  const [today, setToday] = useState<TodayStats | null>(null)
  const [lifetime, setLifetime] = useState<LifetimeStats | null>(null)
  const [dayMap, setDayMap] = useState<Record<string, number>>({})
  const [yearStats, setYearStats] = useState({ totalMinutes: 0, totalPomodoros: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    Promise.all([
      supabase
        .from('pomodoro_logs')
        .select('duration_minutes, completed_at, session_id')
        .eq('user_id', userId)
        .gte('completed_at', oneYearAgo.toISOString()),
      supabase
        .from('profiles')
        .select('total_pomodoros, total_focus_minutes, current_streak, longest_streak, display_name, bio')
        .eq('id', userId)
        .single(),
    ]).then(([{ data: logs }, { data: profile }]) => {
      if (logs) {
        const todayStr = toDayKey(new Date())
        const map: Record<string, number> = {}
        let totalMinutes = 0
        let totalPomodoros = 0
        let todayPomodoros = 0
        let todayMinutes = 0
        const todaySessions = new Set<string>()

        for (const log of logs) {
          const dateStr = toDayKey(log.completed_at)
          map[dateStr] = (map[dateStr] ?? 0) + log.duration_minutes
          totalMinutes += log.duration_minutes
          totalPomodoros += 1
          if (dateStr === todayStr) {
            todayPomodoros += 1
            todayMinutes += log.duration_minutes
            if (log.session_id) todaySessions.add(log.session_id)
          }
        }

        setDayMap(map)
        setYearStats({ totalMinutes, totalPomodoros })
        setToday({ pomodoros: todayPomodoros, minutes: todayMinutes, sessions: todaySessions.size })
      }
      if (profile) setLifetime(profile as LifetimeStats)
      setLoading(false)
    })
  }, [userId, supabase])

  const weekDays = useMemo(() => buildWeekDays(dayMap), [dayMap])
  const calendarCells = useMemo(() => buildCalendarCells(dayMap), [dayMap])

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sign in to see your stats</p>
      </div>
    )
  }

  const todayPills = [
    { label: 'POMODOROS', value: loading ? '...' : String(today?.pomodoros ?? 0) },
    { label: 'FOCUS MIN', value: loading ? '...' : String(today?.minutes ?? 0) },
    { label: 'SESSIONS', value: loading ? '...' : String(today?.sessions ?? 0) },
    { label: 'DURATION', value: loading ? '...' : formatDuration(today?.minutes ?? 0) },
  ]

  const lifetimePills = [
    { label: 'TOTAL POMODOROS', value: loading ? '...' : String(lifetime?.total_pomodoros ?? 0) },
    { label: 'TOTAL FOCUS HOURS', value: loading ? '...' : (lifetime ? (lifetime.total_focus_minutes / 60).toFixed(1) : '0') },
    { label: 'CURRENT STREAK', value: loading ? '...' : `${lifetime?.current_streak ?? 0} Days` },
    { label: 'LONGEST STREAK', value: loading ? '...' : `${lifetime?.longest_streak ?? 0} Days` },
  ]

  return (
    <div className="flex flex-col xl:flex-row gap-5 w-full px-4 py-5 overflow-y-auto">
      {/* Left column */}
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        {/* Today header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Today</h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{todayLabel}</span>
        </div>

        {/* Today stat pills */}
        <div className="grid grid-cols-4 gap-2">
          {todayPills.map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-1 p-3 rounded-xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                {label}
              </span>
              <span className="text-xl font-bold tabular-nums leading-tight" style={{ color: 'var(--accent)' }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Weekly Momentum */}
        <WeeklyChart days={weekDays} />

        {/* Lifetime Mastery */}
        <div
          className="p-4 rounded-2xl flex flex-col gap-3"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Lifetime Mastery</h3>
          <div className="grid grid-cols-2 gap-2">
            {lifetimePills.map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col gap-1 p-3 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                  {label}
                </span>
                <span className="text-lg font-bold tabular-nums leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Heatmap */}
        <StreakCalendar
          cells={calendarCells}
          totalMinutesYear={yearStats.totalMinutes}
          totalPomodorosYear={yearStats.totalPomodoros}
        />
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-4 xl:w-64 shrink-0">
        {/* Profile card */}
        <div
          className="flex flex-col items-center gap-3 p-5 rounded-2xl text-center"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <Avatar src={avatarUrl} name={username} size="xl" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {lifetime?.display_name ?? username ?? 'You'}
            </p>
            {lifetime?.bio && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {lifetime.bio}
              </p>
            )}
          </div>
        </div>

        {/* Tasks placeholder */}
        <div
          className="flex flex-col gap-3 p-4 rounded-2xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Focus Tasks</h3>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              Coming soon
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Task tracking arrives in an upcoming update.
          </p>
        </div>
      </div>
    </div>
  )
}
