'use client'

import { useEffect, useRef, useState } from 'react'
import { Link2, Check, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SharePanelProps {
  sessionId: string
  sessionName?: string | null
  appUrl?: string
}

function getSessionUrl(sessionId: string, appUrl?: string): string {
  const base =
    appUrl ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://pomodoro-jam.vercel.app')
  return `${base}/session/${sessionId}`
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.left = '-999999px'
    document.body.appendChild(el)
    el.focus()
    el.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(el)
      return true
    } catch {
      document.body.removeChild(el)
      return false
    }
  }
}

export function SharePanel({ sessionId, sessionName, appUrl }: SharePanelProps) {
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const url = getSessionUrl(sessionId, appUrl)

  useEffect(() => () => clearTimeout(copyTimerRef.current), [])

  const handleCopy = async () => {
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopied(true)
      clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: sessionName ? `PomodoroJam: ${sessionName}` : 'PomodoroJam Room',
          text: 'Join my focus room!',
          url,
        })
      } catch {
        // user cancelled or error
      }
    }
  }

  const hasNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        Share Room
      </p>

      {/* URL bar */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl min-w-0"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        <span
          className="text-xs truncate flex-1 font-mono min-w-0"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
        >
          {url}
        </span>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all min-h-[32px] cursor-pointer"
          style={
            copied
              ? { background: 'var(--green-soft)', border: '1px solid var(--green)', color: 'var(--green)' }
              : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
          }
        >
          {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : 'Copy'}
        </button>
      </div>

      {/* Native share */}
      {hasNativeShare && (
        <button
          onClick={handleNativeShare}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer w-full"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <Share2 className="w-4 h-4" />
          Share via...
        </button>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        Anyone with this link can join in real-time
      </p>
    </div>
  )
}
