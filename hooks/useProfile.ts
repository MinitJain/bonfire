'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import type { Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'

const ProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  total_pomodoros: z.number(),
  total_focus_minutes: z.number(),
  current_streak: z.number(),
  longest_streak: z.number(),
  last_active_date: z.string().nullable(),
  created_at: z.string(),
})

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: string | null
  updateProfile: (updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url'>>) => Promise<void>
  refetch: () => Promise<void>
}

export function useProfile(userId: string | null): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError
      const parsed = ProfileSchema.safeParse(data)
      if (!parsed.success) {
        console.error('Profile shape mismatch:', parsed.error.flatten())
        throw new Error('Unexpected profile data from database')
      }
      setProfile(parsed.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateProfile = useCallback(
    async (updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url'>>) => {
      if (!userId) return

      setLoading(true)
      setError(null)

      try {
        const { data, error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .single()

        if (updateError) throw updateError
        const parsed = ProfileSchema.safeParse(data)
        if (!parsed.success) {
          console.error('Profile shape mismatch after update:', parsed.error.flatten())
          throw new Error('Unexpected profile data from database')
        }
        setProfile(parsed.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update profile')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [userId, supabase]
  )

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  }
}
