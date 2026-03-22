import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
}

export function Logo({ className, size = 'md' }: LogoProps) {
  return (
    <span
      className={cn('font-display font-bold tracking-tight select-none', sizeClasses[size], className)}
      aria-label="PomodoroJam"
    >
      <span style={{ color: 'var(--text-primary)' }}>Pomodoro</span>
      <span style={{ color: 'var(--accent)' }}>Jam</span>
    </span>
  )
}
