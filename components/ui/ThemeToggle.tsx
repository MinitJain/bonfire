'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div
        className={cn('w-9 h-9 rounded-lg', className)}
        aria-hidden="true"
      />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'w-9 h-9 flex items-center justify-center rounded-lg',
        'border transition-all duration-200 cursor-pointer',
        'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
        'bg-[color:var(--bg-secondary)] hover:bg-[color:var(--bg-elevated)]',
        'border-[color:var(--border)] hover:border-[color:var(--border-strong)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/50',
        className
      )}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
