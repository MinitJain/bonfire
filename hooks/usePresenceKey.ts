'use client'

import { useEffect, useState } from 'react'

const GUEST_KEY = 'pomodoro_guest_id'

/**
 * Stable presence key: the user id when signed in, otherwise a per-browser
 * guest id. null until known on the client (the channel waits for it).
 */
export function usePresenceKey(userId: string | null): string | null {
  const [key, setKey] = useState<string | null>(userId)

  useEffect(() => {
    if (userId) {
      setKey(userId)
      return
    }
    try {
      let guestId = localStorage.getItem(GUEST_KEY)
      if (!guestId) {
        guestId = crypto.randomUUID()
        localStorage.setItem(GUEST_KEY, guestId)
      }
      setKey(guestId)
    } catch {
      setKey(crypto.randomUUID())
    }
  }, [userId])

  return key
}
