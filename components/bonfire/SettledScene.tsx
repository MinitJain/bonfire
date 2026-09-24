'use client'

import Link from 'next/link'
import type { BonfirePhase } from '@/types'
import { CampfireCircle } from '@/components/bonfire/CampfireCircle'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface SettledSceneProps {
  phase: BonfirePhase
}

/** An ended bonfire: embers, no one around, and a way to light another. */
export function SettledScene({ phase }: SettledSceneProps) {
  return (
    <div className="bf-stage">
      <div className="bf-corner bf-corner-left">
        <Link href="/" className="bf-wordmark-sm">Bonfire</Link>
      </div>
      <div className="bf-corner bf-corner-right">
        <ThemeToggle variant="quiet" />
      </div>
      <main className="bf-stage-main">
        <CampfireCircle intensity={0.08} isSurging={false} phase={phase} participants={[]} />
        <div className="bf-message">
          <p className="bf-message-title">The fire has settled</p>
          <p className="bf-message-body">Thank you for sitting together.</p>
          <Link href="/" className="bf-btn-primary">light a new bonfire</Link>
        </div>
      </main>
    </div>
  )
}
