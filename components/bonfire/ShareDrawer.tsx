'use client'

import { useEffect, useState } from 'react'
import { bonfireUrl } from '@/lib/bonfire'
import { INVITE_DESCRIPTION, inviteTitle } from '@/lib/brand'

interface ShareDrawerProps {
  bonfireId: string
  joinCode: string
  /** Stored on the Bonfire: the creator's chosen name and the optional Bonfire name. */
  initiatorName: string | null
  bonfireName: string | null
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  }
}

export function ShareDrawer({ bonfireId, joinCode, initiatorName, bonfireName }: ShareDrawerProps) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const url = bonfireUrl(bonfireId)

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === 'function')
  }, [])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 1800)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async (what: 'link' | 'code') => {
    if (await copyText(what === 'link' ? url : joinCode)) setCopied(what)
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ title: inviteTitle(initiatorName, bonfireName), text: INVITE_DESCRIPTION, url })
    } catch {
      /* dismissed */
    }
  }

  return (
    <div>
      <p className="bf-pop-title">Invite someone to the fire</p>

      <div className="bf-pop-section">
        <span className="bf-pop-label">Join code</span>
        <div className="flex items-center justify-between gap-3">
          <span className="bf-code">{joinCode}</span>
          <button type="button" className="bf-text-btn" onClick={() => void copy('code')}>
            {copied === 'code' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="bf-pop-section">
        <span className="bf-pop-label">Link</span>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-sm" style={{ color: 'var(--text-secondary)' }}>
            {url.replace(/^https?:\/\//, '')}
          </span>
          <button type="button" className="bf-text-btn shrink-0" onClick={() => void copy('link')}>
            {copied === 'link' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {canNativeShare && (
        <div className="bf-pop-section">
          <button type="button" className="bf-btn-secondary w-full" onClick={() => void nativeShare()}>
            Share…
          </button>
        </div>
      )}
      <p className="bf-pop-hint" aria-live="polite">
        {copied ? `${copied === 'link' ? 'Link' : 'Code'} copied.` : 'Up to six people can gather.'}
      </p>
    </div>
  )
}
