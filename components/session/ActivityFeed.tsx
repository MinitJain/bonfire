'use client'

import type { ActivityItem } from '@/types'

interface ActivityFeedProps {
  items: ActivityItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) return null

  return (
    <div
      className="fixed bottom-6 right-4 sm:bottom-8 sm:right-6 z-40 flex flex-col-reverse gap-2 pointer-events-none max-w-[300px]"
      aria-live="polite"
      aria-atomic="false"
    >
      {items.map(item => (
        <div
          key={item.id}
          className="activity-item px-3.5 py-2.5 rounded-xl text-xs leading-snug font-medium"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {item.text}
        </div>
      ))}
    </div>
  )
}
