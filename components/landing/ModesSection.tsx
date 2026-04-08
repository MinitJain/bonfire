'use client'

import { useRef, useState, useEffect } from 'react'

const CIRCUMFERENCE = 251.3

interface ModeConfig {
  id: string
  title: string
  tagline: string
  desc: string
  color: string
  colorRgb: string
  timerText: string
  ringFill: number
  dotColors: string[]
  dotDelays: number[]
  watcherText: string
  cardDelay: number
}

const modes: ModeConfig[] = [
  {
    id: 'host',
    title: 'Host',
    tagline: 'You control the clock',
    desc: 'Start, pause, and skip. Everyone else syncs to your timer in real time.',
    color: '#FF5533',
    colorRgb: '255, 85, 51',
    timerText: '24:13',
    ringFill: 0.75,
    dotColors: ['#FF5533', '#9B9B8E', '#9B9B8E', '#9B9B8E'],
    dotDelays: [0, 200, 360, 500],
    watcherText: '3 watching',
    cardDelay: 0,
  },
  {
    id: 'jam',
    title: 'Jam',
    tagline: 'Everyone drives',
    desc: 'Any participant can start, pause, or skip. Full collaboration, no gatekeeper.',
    color: '#F0A050',
    colorRgb: '240, 160, 80',
    timerText: '18:45',
    ringFill: 0.40,
    dotColors: ['#FF5533', '#F0A050', '#2DBF8A', '#9B9B8E'],
    dotDelays: [0, 140, 270, 390],
    watcherText: '4 jamming',
    cardDelay: 130,
  },
  {
    id: 'solo',
    title: 'Solo',
    tagline: 'Just you',
    desc: 'A private session — no sharing, no watchers. Pure, distraction-free focus.',
    color: '#2DBF8A',
    colorRgb: '45, 191, 138',
    timerText: '04:58',
    ringFill: 0.90,
    dotColors: ['#2DBF8A'],
    dotDelays: [0],
    watcherText: 'Private',
    cardDelay: 260,
  },
]

function ModeCard({ mode, visible }: { mode: ModeConfig; visible: boolean }) {
  const ringTarget = CIRCUMFERENCE * (1 - mode.ringFill)
  const ringOffset = visible ? ringTarget : CIRCUMFERENCE

  return (
    <div
      className="relative rounded-2xl overflow-hidden group"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderTop: `2px solid rgba(${mode.colorRgb}, 0.55)`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: [
          `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${mode.cardDelay}ms`,
          `transform 0.65s cubic-bezier(0.16,1,0.3,1) ${mode.cardDelay}ms`,
          'box-shadow 0.25s ease',
          'border-color 0.25s ease',
        ].join(', '),
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-4px)'
        el.style.boxShadow = `0 0 0 1px rgba(${mode.colorRgb},0.2), 0 24px 64px rgba(${mode.colorRgb},0.12), var(--shadow-lg)`
        el.style.borderColor = `rgba(${mode.colorRgb},0.5)`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = ''
        el.style.borderColor = 'var(--border)'
      }}
    >
      {/* Inner top highlight — gives a "lit" sheen */}
      <div
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{ background: `linear-gradient(180deg, rgba(${mode.colorRgb},0.06) 0%, transparent 100%)` }}
      />

      {/* Hover ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse 90% 50% at 50% 0%, rgba(${mode.colorRgb},0.06), transparent)`,
          transition: 'opacity 0.4s ease',
        }}
      />

      {/* Shimmer sweep on hover */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: 'inherit' }}>
        <div
          className="absolute inset-y-0 w-20 opacity-0 group-hover:opacity-100"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(${mode.colorRgb},0.06), transparent)`,
            transition: 'opacity 0.3s ease',
            animation: 'shimmer-sweep 1.4s ease forwards',
          }}
        />
      </div>

      <div className="relative p-6">
        {/* Card header */}
        <div className="mb-5">
          <h3 className="font-bold text-xl mb-1" style={{ color: 'var(--text-primary)' }}>
            {mode.title}
          </h3>
          <p className="text-sm font-medium" style={{ color: mode.color }}>
            {mode.tagline}
          </p>
        </div>

        {/* Mini session preview */}
        <div className="flex flex-col items-center mb-5">
          {/* Timer ring */}
          <div className="relative mb-3">
            <svg width="96" height="96" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="5" />
              {/* Glow layer */}
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke={mode.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 50 50)"
                style={{
                  opacity: 0.18,
                  filter: 'blur(4px)',
                  transition: `stroke-dashoffset 2s cubic-bezier(0.4,0,0.2,1) ${mode.cardDelay + 400}ms`,
                }}
              />
              {/* Progress ring */}
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke={mode.color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 50 50)"
                style={{
                  transition: `stroke-dashoffset 2s cubic-bezier(0.4,0,0.2,1) ${mode.cardDelay + 400}ms`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="font-mono font-bold text-base tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {mode.timerText}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>focus</span>
            </div>
          </div>

          {/* Participant dots */}
          <div className="flex items-center gap-1.5">
            {mode.dotColors.map((dotColor, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full"
                style={{
                  background: dotColor,
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'scale(1)' : 'scale(0)',
                  transition: [
                    `opacity 0.35s cubic-bezier(0.34,1.56,0.64,1) ${mode.cardDelay + 700 + mode.dotDelays[i]}ms`,
                    `transform 0.35s cubic-bezier(0.34,1.56,0.64,1) ${mode.cardDelay + 700 + mode.dotDelays[i]}ms`,
                  ].join(', '),
                  boxShadow: i === 0 ? `0 0 8px rgba(${mode.colorRgb},0.5)` : undefined,
                }}
              />
            ))}
            <span
              className="text-xs ml-1"
              style={{
                color: 'var(--text-muted)',
                opacity: visible ? 1 : 0,
                transition: `opacity 0.4s ease ${mode.cardDelay + 950}ms`,
              }}
            >
              {mode.watcherText}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {mode.desc}
        </p>
      </div>

      {/* Bottom accent line on hover */}
      <div
        className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${mode.colorRgb},0.6), transparent)`,
          transition: 'opacity 0.35s ease',
        }}
      />
    </div>
  )
}

export function ModesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="px-5 sm:px-8 py-16 sm:py-24 max-w-5xl mx-auto w-full">
      <h2
        className="font-display font-bold text-2xl sm:text-3xl mb-10 text-center"
        style={{
          color: 'var(--text-primary)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        How do you want to focus?
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {modes.map(mode => (
          <ModeCard key={mode.id} mode={mode} visible={visible} />
        ))}
      </div>
    </section>
  )
}
