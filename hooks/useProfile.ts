'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'

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
      setProfile(data as Profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }, [userId])

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
        setProfile(data as Profile)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update profile')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  }
}
