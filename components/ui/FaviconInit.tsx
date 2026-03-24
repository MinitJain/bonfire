'use client'

import { useEffect } from 'react'
import { resetFavicon } from '@/lib/favicon'

export function FaviconInit() {
  useEffect(() => {
    resetFavicon()
  }, [])
  return null
}
