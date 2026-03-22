'use client'

import { cn } from '@/lib/utils'
import type { TimerMode } from '@/types'

interface TimerRingProps {
  progress: number // 0 to 1
  mode?: TimerMode
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
}

const modeColors: Record<TimerMode, string> = {
  focus: 'var(--accent)',
  short: 'var(--green)',
  long: 'var(--amber)',
}

const modeTrackColors: Record<TimerMode, string> = {
  focus: 'var(--accent-soft)',
  short: 'var(--green-soft)',
  long: 'var(--amber-soft)',
}

export function TimerRing({
  progress,
  mode = 'focus',
  size = 280,
  strokeWidth = 5,
  className,
  children,
}: TimerRingProps) {
  const r = 45
  const cx = 50
  const cy = 50
  const circumference = 2 * Math.PI * r
  const clampedProgress = Math.max(0, Math.min(1, progress))
  const strokeDashoffset = circumference * (1 - clampedProgress)
  const color = modeColors[mode]
  const trackColor = modeTrackColors[mode]

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ filter: `drop-shadow(0 0 16px ${color}33)` }}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="timer-ring-progress"
        />
      </svg>

      {/* Children centered inside ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
