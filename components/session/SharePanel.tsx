'use client'

import { useState } from 'react'
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

type CopiedKey =
  | 'link'
  | 'discord'
  | 'slack'
  | 'instagram'
  | null

export function SharePanel({ sessionId, sessionName, appUrl }: SharePanelProps) {
  const [copiedKey, setCopiedKey] = useState<CopiedKey>(null)
  const url = getSessionUrl(sessionId, appUrl)

  const triggerCopy = async (key: CopiedKey, text: string) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    }
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: sessionName ? `PomodoroJam: ${sessionName}` : 'PomodoroJam Session',
          text: 'Join my Pomodoro focus session!',
          url,
        })
      } catch {
        // user cancelled or error
      }
    }
  }

  const hasNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const socialLinks = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`Join my PomodoroJam session! 🍅 ${url}`)}`,
      bg: 'bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/20',
      iconColor: '#25D366',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
    {
      key: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Join my focus session!')}`,
      bg: 'bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border-[#0088cc]/20',
      iconColor: '#0088cc',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
    {
      key: 'twitter',
      label: 'Twitter / X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent('Join my focus session 🍅')}&url=${encodeURIComponent(url)}`,
      bg: 'bg-foreground/5 hover:bg-foreground/10 border-border',
      iconColor: 'currentColor',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      bg: 'bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 border-[#0A66C2]/20',
      iconColor: '#0A66C2',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      bg: 'bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border-[#1877F2]/20',
      iconColor: '#1877F2',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  ]

  const copyButtons = [
    {
      key: 'discord' as CopiedKey,
      label: 'Discord',
      copyLabel: 'Copied!',
      text: `🍅 Join my PomodoroJam session!\nFocus together in real-time → ${url}`,
      bg: 'bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border-[#5865F2]/20',
      iconColor: '#5865F2',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
    },
    {
      key: 'slack' as CopiedKey,
      label: 'Slack',
      copyLabel: 'Copied!',
      text: `🍅 *PomodoroJam* — Join my focus session! ${url}`,
      bg: 'bg-[#4A154B]/10 hover:bg-[#4A154B]/20 border-[#4A154B]/20',
      iconColor: '#4A154B',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
      ),
    },
    {
      key: 'instagram' as CopiedKey,
      label: 'Instagram',
      copyLabel: 'Copied!',
      text: url,
      bg: 'bg-[#E1306C]/10 hover:bg-[#E1306C]/20 border-[#E1306C]/20',
      iconColor: '#E1306C',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Section title */}
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Share Session</p>

      {/* URL display bar */}
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
          onClick={() => triggerCopy('link', url)}
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all min-h-[32px] cursor-pointer',
            copiedKey === 'link' ? 'text-green-500' : ''
          )}
          style={
            copiedKey === 'link'
              ? { background: 'var(--green-soft)', border: '1px solid var(--green)', color: 'var(--green)' }
              : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
          }
        >
          {copiedKey === 'link' ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            'Copy'
          )}
        </button>
      </div>

      {/* Social share links — 2-column grid */}
      <div className="grid grid-cols-2 gap-2">
        {socialLinks.map(({ key, label, href, bg, iconColor, icon }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all min-h-[44px]',
              'text-foreground',
              bg
            )}
            style={{ color: iconColor }}
          >
            <span className="flex-shrink-0">{icon}</span>
            <span className="text-foreground text-xs truncate">{label}</span>
          </a>
        ))}

        {/* Copy-to-clipboard buttons for platforms without direct share URLs */}
        {copyButtons.map(({ key, label, copyLabel, text, bg, iconColor, icon }) => (
          <button
            key={key}
            onClick={() => triggerCopy(key, text)}
            title={copiedKey === key ? copyLabel : label}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left min-h-[44px]',
              bg,
              copiedKey === key && 'opacity-80'
            )}
            style={{ color: iconColor }}
          >
            <span className="flex-shrink-0">
              {copiedKey === key ? <Check className="w-4 h-4 text-green-400" /> : icon}
            </span>
            <span className="text-foreground truncate">
              {copiedKey === key ? (
                <span className="text-green-400">Copied!</span>
              ) : (
                label
              )}
            </span>
          </button>
        ))}

        {/* Native Share — only rendered on devices that support it */}
        {hasNativeShare && (
          <button
            onClick={handleNativeShare}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left min-h-[44px]',
              'bg-brand/10 hover:bg-brand/20 border-brand/20 text-brand'
            )}
          >
            <Share2 className="w-4 h-4 flex-shrink-0" />
            <span className="text-foreground truncate">Share via...</span>
          </button>
        )}
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        Anyone with this link can join and watch in real-time
      </p>
    </div>
  )
}
