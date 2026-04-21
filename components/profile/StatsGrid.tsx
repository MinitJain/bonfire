import { Timer, Flame, Trophy, Clock } from 'lucide-react'
import type { Profile } from '@/types'
import { toDayKey } from '@/lib/date'
import { cn } from '@/lib/utils'

// Returns 0 if the streak hasn't been continued recently enough to still be alive.
// Uses a 2-day UTC window to accommodate all timezones (UTC-12 to UTC+14):
// a user in UTC+14 stores last_active_date as their local date which can be
// 1 day ahead of server UTC, so we check >= 2 days ago UTC.
function effectiveStreak(currentStreak: number, lastActiveDate: string | null): number {
  if (currentStreak === 0 || !lastActiveDate) return currentStreak
  const twoDaysAgo = toDayKey(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
  return lastActiveDate >= twoDaysAgo ? currentStreak : 0
}

interface StatsGridProps {
  profile: Profile
  className?: string
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  suffix?: string
  highlight?: boolean
}

function StatCard({ icon, label, value, suffix, highlight }: StatCardProps) {
  return (
    <div
      className="p-5 rounded-2xl flex flex-col gap-3 transition-all duration-200"
      style={{
        background: highlight ? 'var(--accent-soft)' : 'var(--bg-elevated)',
        border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: highlight ? 'var(--accent)' : 'var(--bg-secondary)' }}
      >
        <span style={{ color: highlight ? '#fff' : 'var(--text-muted)' }}>{icon}</span>
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span
            className="font-display font-bold tabular-nums"
            style={{
              fontSize: '2.5rem',
              lineHeight: 1,
              color: highlight ? 'var(--accent)' : 'var(--text-primary)',
            }}
          >
            {value}
          </span>
          {suffix && (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {suffix}
            </span>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
      </div>
    </div>
  )
}

export function StatsGrid({ profile, className }: StatsGridProps) {
  const focusHours = Math.floor(profile.total_focus_minutes / 60)
  const streak = effectiveStreak(profile.current_streak, profile.last_active_date)

  if (profile.total_pomodoros === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-center', className)}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          No focus sessions yet. Start a session to begin tracking your stats.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      <StatCard
        icon={<Timer className="w-4 h-4" />}
        label="Pomodoros"
        value={profile.total_pomodoros}
        highlight={profile.total_pomodoros > 0}
      />
      <StatCard
        icon={<Clock className="w-4 h-4" />}
        label="Focus Hours"
        value={focusHours}
        suffix="hrs"
      />
      <StatCard
        icon={<Flame className="w-4 h-4" />}
        label="Current Streak"
        value={streak}
        suffix="days"
        highlight={streak > 0}
      />
      <StatCard
        icon={<Trophy className="w-4 h-4" />}
        label="Best Streak"
        value={profile.longest_streak}
        suffix="days"
      />
    </div>
  )
}
