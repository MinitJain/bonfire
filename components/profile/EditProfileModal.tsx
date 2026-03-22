'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Profile } from '@/types'
import { Button } from '@/components/ui/Button'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

interface EditProfileModalProps {
  profile: Profile
  onClose: () => void
  onSave: (updated: Partial<Profile>) => void
}

export function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const { updateProfile } = useProfile(profile.id)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const updates = {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      }
      await updateProfile(updates)
      onSave(updates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Edit Profile"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="displayName" className="text-sm font-medium text-foreground-muted">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={profile.username}
              maxLength={50}
              className={cn(
                'px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-foreground text-sm',
                'placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand',
                'transition-all duration-200'
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="text-sm font-medium text-foreground-muted">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              maxLength={200}
              rows={3}
              className={cn(
                'px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-foreground text-sm',
                'placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand',
                'transition-all duration-200 resize-none'
              )}
            />
            <p className="text-xs text-muted text-right">{bio.length}/200</p>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
