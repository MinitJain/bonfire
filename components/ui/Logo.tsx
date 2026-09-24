import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-3xl',
}

/** The Bonfire wordmark: tracked capitals, the same as Home and the room. */
export function Logo({ className, size = 'md' }: LogoProps) {
  return (
    <span
      className={cn('font-display font-semibold uppercase select-none', sizeClasses[size], className)}
      style={{ color: 'var(--text-primary)', letterSpacing: '0.3em' }}
      aria-label="Bonfire"
    >
      Bonfire
    </span>
  )
}
