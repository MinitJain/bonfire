import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { StatsGrid } from '@/components/profile/StatsGrid'
import { WeeklyChart } from '@/components/profile/WeeklyChart'
import { StreakCalendar } from '@/components/profile/StreakCalendar'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface ProfilePageProps {
  params: { username: string }
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name, username, bio')
    .eq('username', params.username)
    .maybeSingle()

  if (!data) {
    return { title: 'Profile Not Found' }
  }

  const name = data.display_name ?? data.username
  return {
    title: name,
    description: data.bio ?? `${name}'s PomodoroJam profile`,
    openGraph: {
      title: `${name} | PomodoroJam`,
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

// Build the 364-cell calendar grid (52 weeks × 7 days, Mon → Sun, oldest first)
function buildCalendarCells(dayMap: Record<string, number>) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // Find the Monday 52 weeks ago
  const start = new Date(today)
  start.setDate(start.getDate() - 364)
  // Rewind to the nearest Monday on or before `start`
  const dow = start.getDay() // 0=Sun…6=Sat
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1))

  const cells: { date: string; minutes: number; isToday: boolean }[] = []
  const cur = new Date(start)
  while (cells.length < 52 * 7) {
    const dateStr = cur.toISOString().slice(0, 10)
    cells.push({
      date: dateStr,
      minutes: dayMap[dateStr] ?? 0,
      isToday: dateStr === todayStr,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return cells
}

// Build last-7-days bars with labels
function buildWeekDays(dayMap: Record<string, number>) {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    return {
      date: dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: dayMap[dateStr] ?? 0,
      isToday: i === 6,
    }
  })
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .maybeSingle()

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

    const { data: logs } = await supabase
      .from('pomodoro_logs')
      .select('duration_minutes, completed_at')
      .eq('user_id', typedProfile.id)
      .gte('completed_at', oneYearAgo.toISOString())

    if (logs) {
      for (const log of logs) {
        const dateStr = log.completed_at.slice(0, 10)
        dayMap[dateStr] = (dayMap[dateStr] ?? 0) + log.duration_minutes
        totalMinutesYear += log.duration_minutes
        totalPomodorosYear += 1
      }
    }
  }

  const weekDays = buildWeekDays(dayMap)
  const calendarCells = buildCalendarCells(dayMap)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-5 sm:px-8 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/"><Logo size="sm" /></Link>
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
          <div
            className="flex flex-col items-center justify-center text-center py-8 rounded-2xl gap-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <span className="text-3xl">🍅</span>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              No focus sessions yet
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Complete a session to start tracking your streaks and focus time.
            </p>
            <Link
              href="/"
              className="mt-1 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Start a session →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
