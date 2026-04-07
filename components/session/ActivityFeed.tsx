'use client'

import type { ActivityItem } from '@/types'

interface ActivityFeedProps {
  items: ActivityItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) return null

  return (
    <div
      className="fixed top-20 left-4 sm:top-auto sm:bottom-6 sm:left-6 z-40 flex flex-col gap-2 sm:flex-col-reverse pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {items.map(item => (
        <div
          key={item.id}
          className="activity-item max-w-[280px] px-3.5 py-2 rounded-xl text-xs leading-snug"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-md)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  )
}
