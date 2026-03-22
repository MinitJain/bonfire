'use client'

import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'pj_seen_mode_tip'

interface ModeTipBubbleProps {
  externalDismiss: boolean
}

export function ModeTipBubble({ externalDismiss }: ModeTipBubbleProps) {
  const [mounted, setMounted] = useState(false)
  const [animIn, setAnimIn] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const dismissedRef = useRef(false)

  // Show after 1200ms if not seen before
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY)) return
    const t = setTimeout(() => {
      // If externally dismissed before timeout fired, don't show
      if (dismissedRef.current) return
      setMounted(true)
      setTimeout(() => setAnimIn(true), 50)
    }, 1200)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    localStorage.setItem(STORAGE_KEY, '1')
    setFadingOut(true)
    setTimeout(() => setMounted(false), 200)
  }

  // External dismiss (Host/Jam button clicked) — works whether bubble is visible or not yet
  useEffect(() => {
    if (!externalDismiss) return
    dismissedRef.current = true
    localStorage.setItem(STORAGE_KEY, '1') // persist even if bubble never showed
    if (mounted) dismiss()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalDismiss, mounted])

  // Outside click
  useEffect(() => {
    if (!mounted) return
    function handleClick(e: MouseEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        dismiss()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key
  useEffect(() => {
    if (!mounted) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null

  return (
    <div
      ref={bubbleRef}
      style={{
        position: 'fixed',
        bottom: '130px',
        left: '50%',
        transform: animIn && !fadingOut
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(8px)',
        opacity: animIn && !fadingOut ? 1 : 0,
        transition: fadingOut
          ? 'opacity 200ms ease'
          : 'opacity 400ms ease, transform 400ms ease',
        zIndex: 60,
        maxWidth: '320px',
        width: 'calc(100vw - 48px)',
      }}
    >
      {/* Bubble */}
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg)',
          padding: '16px',
          position: 'relative',
        }}
      >
        <p
          className="font-semibold text-sm mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          What&apos;s the difference?
        </p>

        <div className="flex flex-col gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              Host
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Only you can start, pause, or skip. Everyone else follows along in sync.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--green)' }}>
              ⚡ Jam Mode
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Everyone in the session controls the timer together — like a group decision.
            </p>
          </div>
        </div>

        <button
          onClick={dismiss}
          className="w-full py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          Got it
        </button>

        {/* Downward arrow pointing at toggle row below */}
        <div
          style={{
            position: 'absolute',
            bottom: '-9px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '9px solid transparent',
            borderRight: '9px solid transparent',
            borderTop: '9px solid var(--border)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-7px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid var(--bg-elevated)',
          }}
        />
      </div>
    </div>
  )
}
