'use client'

import { motion } from 'motion/react'
import { rise, stagger } from '@/lib/motion'

import Link from 'next/link'
import type { BonfirePhase } from '@/types'
import { CampfireCircle } from '@/components/bonfire/CampfireCircle'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface SettledSceneProps {
  phase: BonfirePhase
  completedPomodoros: number
}

/** An ended bonfire: embers, no one around, and a way to light another. */
export function SettledScene({ phase, completedPomodoros }: SettledSceneProps) {
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
        <motion.div className="bf-message" variants={stagger(0.3, 0.12)} initial="hidden" animate="show">
          <motion.h1 className="bf-message-title" variants={rise}>The fire has settled</motion.h1>
          <motion.p className="bf-message-body" variants={rise}>
            {completedPomodoros > 0
              ? `${completedPomodoros} ${completedPomodoros === 1 ? 'pomodoro' : 'pomodoros'} around this fire. Thank you for sitting together.`
              : 'Thank you for sitting together.'}
          </motion.p>
          <motion.div variants={rise}><Link href="/" className="bf-btn-primary">light a new bonfire</Link></motion.div>
        </motion.div>
      </main>
    </div>
  )
}
