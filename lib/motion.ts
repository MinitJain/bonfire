import type { Transition, Variants } from 'motion/react'

/** Soft, slightly bouncy: selections, indicators, keys. */
export const SPRING: Transition = { type: 'spring', stiffness: 520, damping: 34, mass: 0.8 }
/** Slower settle for panels and page sections. */
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 260, damping: 30 }

/** Key press feel shared by buttons. */
export const PRESS = { whileHover: { y: -2 }, whileTap: { y: 1, scale: 0.97 }, transition: SPRING } as const

/** Parent that reveals its children one after another. */
export const stagger = (delayChildren = 0.05, staggerChildren = 0.06): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
})

/** Child of `stagger`: rises and fades in. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: SPRING_SOFT },
}

/** Popovers and menus. */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: -6 },
  show: { opacity: 1, scale: 1, y: 0, transition: SPRING },
  exit: { opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.12 } },
}
