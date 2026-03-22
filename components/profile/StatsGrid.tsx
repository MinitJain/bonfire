import { Timer, Flame, Trophy, Clock } from 'lucide-react'
import type { Profile } from '@/types'
import { cn } from '@/lib/utils'

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
  const focusHours = Math.round(profile.total_focus_minutes / 60)

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
        value={profile.current_streak}
        suffix="days"
        highlight={profile.current_streak > 0}
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
