'use client'

import { Crown, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { Participant } from '@/types'

interface ParticipantListProps {
  participants: Participant[]
  className?: string
}

export function ParticipantList({ participants, className }: ParticipantListProps) {
  const maxVisible = 5
  const visible = participants.slice(0, maxVisible)
  const overflow = participants.length - maxVisible

  if (participants.length === 0) {
    return (
      <div
        className={cn('flex items-center gap-2 text-sm', className)}
        style={{ color: 'var(--text-muted)' }}
      >
        <Users className="w-4 h-4" />
        <span>Waiting for others...</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center" style={{ marginLeft: '0' }}>
        {visible.map((participant, i) => (
          <div
            key={participant.user_id}
            className="relative group"
            title={participant.username ?? 'Anonymous'}
            style={{ marginLeft: i === 0 ? 0 : '-8px', zIndex: visible.length - i }}
          >
            <div
              className="rounded-full transition-transform hover:scale-110 hover:z-20 relative"
              style={{
                outline: `2px solid var(--bg-elevated)`,
                borderRadius: '50%',
              }}
            >
              <Avatar
                src={participant.avatar_url}
                name={participant.username}
                size="sm"
              />
            </div>
            {participant.is_host && (
              <div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <Crown className="w-2.5 h-2.5 text-white" />
              </div>
            )}

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
              <div
                className="px-2 py-1 rounded-lg text-xs whitespace-nowrap"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {participant.username ?? 'Anonymous'}
                {participant.is_host && (
                  <span className="ml-1" style={{ color: 'var(--accent)' }}>(host)</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {overflow > 0 && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
            style={{
              background: 'var(--bg-secondary)',
              outline: `2px solid var(--bg-elevated)`,
              marginLeft: '-8px',
              color: 'var(--text-muted)',
            }}
            title={`${overflow} more`}
          >
            +{overflow}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: 'var(--green)' }}
        />
        <span>
          {participants.length} {participants.length === 1 ? 'person' : 'people'}
        </span>
      </div>
    </div>
  )
}
