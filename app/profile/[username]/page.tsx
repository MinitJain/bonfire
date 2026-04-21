import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { StatsGrid } from '@/components/profile/StatsGrid'
import { WeeklyChart } from '@/components/profile/WeeklyChart'
import { StreakCalendar } from '@/components/profile/StreakCalendar'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { toDayKey } from '@/lib/date'

const getProfile = cache(async (username: string) => {
  const supabase = createClient()
  return supabase.from('profiles').select('*').eq('username', username).maybeSingle()
})

interface ProfilePageProps {
  params: { username: string }
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { data } = await getProfile(params.username)

  if (!data) {
    return { title: 'Profile Not Found' }
  }

  const name = data.display_name ?? data.username
  return {
    title: name,
    description: data.bio ?? `${name}'s Bonfire profile`,
    openGraph: {
      title: `${name} | Bonfire`,
      images: [
        {
          url: `/api/og?name=${encodeURIComponent(name + "'s Profile")}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}

// UTC midnight for a given UTC year/month/day offset
function utcDay(offsetDays = 0): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays))
}

// Build the 371-cell calendar grid (53 weeks × 7 days, Mon → Sun, oldest first).
// Anchors the grid end on the Sunday on-or-after today so today is always a cell.
// Without this, going back a fixed 371 days from today leaves today off the grid
// on all days except Sunday.
function buildCalendarCells(dayMap: Record<string, number>) {
  const today = utcDay(0)
  const todayDow = today.getUTCDay() // 0=Sun…6=Sat
  // Days until the next Sunday (0 if today is already Sunday)
  const daysToSunday = todayDow === 0 ? 0 : 7 - todayDow
  const gridEnd = utcDay(daysToSunday)

  // Go back 53*7 - 1 days from grid end to find approximate start
  const start = new Date(gridEnd)
  start.setUTCDate(start.getUTCDate() - (53 * 7 - 1))
  // Rewind to nearest Monday on or before start
  const dow = start.getUTCDay()
  start.setUTCDate(start.getUTCDate() - (dow === 0 ? 6 : dow - 1))

  const cells: { date: string; minutes: number }[] = []
  const cur = new Date(start)
  while (cells.length < 53 * 7) {
    const dateStr = toDayKey(cur)
    cells.push({ date: dateStr, minutes: dayMap[dateStr] ?? 0 })
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return cells
}

// Build last-7-days bars with labels
// All date arithmetic is in UTC to match toDayKey output.
function buildWeekDays(dayMap: Record<string, number>) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = utcDay(i - 6)
    const dateStr = toDayKey(d)
    return {
      date: dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      minutes: dayMap[dateStr] ?? 0,
      isToday: i === 6,
    }
  })
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = createClient()

  const { data: profile, error } = await getProfile(params.username)

  if (error) throw error
  if (!profile) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const typedProfile = profile as Profile
  const isOwnProfile = user?.id === typedProfile.id

  // Fetch pomodoro logs for own profile (RLS blocks others)
  let dayMap: Record<string, number> = {}
  let totalMinutesYear = 0
  let totalPomodorosYear = 0

  if (isOwnProfile) {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const { data: logs, error: logsError } = await supabase
      .from('pomodoro_logs')
      .select('duration_minutes, completed_at')
      .eq('user_id', typedProfile.id)
      .gte('completed_at', oneYearAgo.toISOString())

    if (logsError) console.error('[ProfilePage] Failed to fetch pomodoro_logs:', logsError)
    if (logs) {
      for (const log of logs) {
        const dateStr = toDayKey(log.completed_at)
        dayMap[dateStr] = (dayMap[dateStr] ?? 0) + log.duration_minutes
        totalMinutesYear += log.duration_minutes
        totalPomodorosYear += 1
      }
    }
  }

  const weekDays = buildWeekDays(dayMap)
  const calendarCells = buildCalendarCells(dayMap)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-[var(--border)]">
        <Link href="/" aria-label="Home"><Logo size="sm" /></Link>
        <ThemeToggle />
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
        <ProfileCard profile={typedProfile} isOwnProfile={isOwnProfile} />

        <StatsGrid profile={typedProfile} />

        {/* Analytics dashboard — only for own profile */}
        {isOwnProfile && typedProfile.total_pomodoros > 0 && (
          <>
            <WeeklyChart days={weekDays} />
            <StreakCalendar
              cells={calendarCells}
              totalMinutesYear={totalMinutesYear}
              totalPomodorosYear={totalPomodorosYear}
            />
          </>
        )}

        {/* CTA for own profile with no sessions yet */}
        {isOwnProfile && typedProfile.total_pomodoros === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-8 rounded-2xl gap-3 bg-[var(--bg-elevated)] border border-[var(--border)]">
            <span className="text-3xl">🍅</span>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No focus rooms yet
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Complete a room to start tracking your streaks and focus time.
            </p>
            <Link
              href="/"
              className="mt-1 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent)] text-white"
            >
              Start a room →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
