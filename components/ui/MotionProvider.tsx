'use client'

import { MotionConfig } from 'motion/react'

/** Every Motion animation follows the visitor's reduced-motion setting. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
