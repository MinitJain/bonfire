'use client'

import { useEffect, useState } from 'react'
import { Edit3, Calendar, Share2 } from 'lucide-react'
import type { Profile } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { EditProfileModal } from '@/components/profile/EditProfileModal'

interface ProfileCardProps {
  profile: Profile
  isOwnProfile?: boolean
}

export function ProfileCard({ profile, isOwnProfile }: ProfileCardProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentProfile, setCurrentProfile] = useState(profile)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setCurrentProfile(profile) }, [profile])

  const displayName = currentProfile.display_name ?? currentProfile.username
  const joinDate = new Date(currentProfile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <div
        className="flex flex-col sm:flex-row items-start gap-6 p-6 rounded-2xl"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Avatar
          src={currentProfile.avatar_url}
          name={displayName}
          size="xl"
          className="flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className="font-display font-bold text-xl sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                {displayName}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                @{currentProfile.username}
              </p>
            </div>

            {isOwnProfile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer flex-shrink-0"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    minHeight: '44px',
                  }}
                  aria-label="Edit profile"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                {currentProfile.total_pomodoros > 0 && (
                  <button
                    onClick={() => {
                      const params = new URLSearchParams({
                        type: 'stats',
                        username: currentProfile.display_name ?? currentProfile.username,
                        pomodoros: String(currentProfile.total_pomodoros),
                        streak: String(currentProfile.current_streak),
                        hours: String(Math.round(currentProfile.total_focus_minutes / 60)),
                      })
                      const url = `${window.location.origin}/api/og?${params}`
                      navigator.clipboard?.writeText(url).then(() => {
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }).catch(err => console.error('Clipboard write failed:', err))
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer flex-shrink-0"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', minHeight: '44px' }}
                    aria-label="Share stats"
                  >
                    <Share2 className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Share'}
                  </button>
                )}
              </div>
            )}
          </div>

          {currentProfile.bio && (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {currentProfile.bio}
            </p>
          )}

          <div
            className="flex items-center gap-1.5 mt-3 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Joined {joinDate}</span>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          profile={currentProfile}
          onClose={() => setShowEditModal(false)}
          onSave={updated => {
            setCurrentProfile(prev => ({ ...prev, ...updated }))
            setShowEditModal(false)
          }}
        />
      )}
    </>
  )
}
