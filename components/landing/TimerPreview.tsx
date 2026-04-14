'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Pause } from 'lucide-react'
import { TimerRing } from '@/components/timer/TimerRing'

const TOTAL = 25 * 60

const FAKE_PARTICIPANTS = [
  { color: '#FF5533', label: 'A', crown: true },
  { color: '#2DBF8A', label: 'B' },
  { color: '#8B5CF6', label: 'C' },
]

interface TimerPreviewProps {
  onStartSession?: () => Promise<string | null>
}

export function TimerPreview({ onStartSession }: TimerPreviewProps) {
  const [timeLeft, setTimeLeft] = useState(TOTAL)
  const [running, setRunning] = useState(false)
  const [visible, setVisible] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); setRunning(true) }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { setRunning(false); return TOTAL } return prev - 1 })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')

  const handleCardClick = async () => {
    if (isStarting || !onStartSession) return
    setIsStarting(true)
    try {
      const id = await onStartSession()
      if (!id) return
      if ('startViewTransition' in document) {
        ;(document as any).startViewTransition(() => router.push(`/session/${id}`))
      } else {
        router.push(`/session/${id}`)
      }
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <section
      className="px-5 sm:px-8 py-12 sm:py-16 w-full flex flex-col items-center"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>
        See it in action
      </p>

      <div
        ref={ref}
        onClick={handleCardClick}
        className="vt-timer-card relative w-full max-w-xs flex flex-col items-center gap-6 p-6 sm:p-8 rounded-3xl"
        style={{
          background: 'var(--bg-elevated)',
          border: `1px solid ${isStarting ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: isStarting ? '0 0 0 3px rgba(255,85,51,0.18), var(--shadow-lg)' : 'var(--shadow-md)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1), border-color 0.2s ease, box-shadow 0.2s ease',
          cursor: onStartSession ? 'pointer' : 'default',
        }}
      >
        {/* Loading overlay */}
        {isStarting && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-3xl"
            style={{ background: 'rgba(15,15,13,0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          >
            <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '2.5px solid rgba(255,85,51,0.2)', borderTopColor: 'var(--accent)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Starting your room...</p>
          </div>
        )}

        {/* Mode tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl w-full" style={{ background: 'var(--bg-secondary)' }}>
          {['Focus', 'Short', 'Long'].map((m, i) => (
            <div
              key={m}
              className="flex-1 text-center py-1.5 rounded-lg text-xs font-medium"
              style={i === 0
                ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }
                : { color: 'var(--text-muted)' }}
            >
              {m}
            </div>
          ))}
        </div>

        {/* Timer ring */}
        <TimerRing progress={timeLeft / TOTAL} mode="focus" size={200}>
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono font-bold text-5xl tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {mins}:{secs}
            </span>
            <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Focus</span>
          </div>
        </TimerRing>

        {/* Single play/pause button */}
        <button
          onClick={e => { e.stopPropagation(); setRunning(v => !v) }}
          aria-label={running ? 'Pause timer' : 'Play timer'}
          className="w-16 h-16 flex items-center justify-center rounded-full transition-all cursor-pointer"
          style={{ background: 'var(--accent)', color: '#fff', boxShadow: 'var(--shadow-md)' }}
        >
          {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>

        {/* Participants */}
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-1.5">
            {FAKE_PARTICIPANTS.map(({ color, label, crown }) => (
              <div key={label} className="relative">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2"
                  style={{ background: color } as React.CSSProperties}
                >
                  {label}
                </div>
                {crown && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-[7px]" style={{ background: 'var(--accent)' }}>
                    👑
                  </div>
                )}
              </div>
            ))}
          </div>
          <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: 'var(--green)' }} />
            3 focusing
          </span>
        </div>
      </div>

      {onStartSession && (
        <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Click to start your own room
        </p>
      )}
    </section>
  )
}
