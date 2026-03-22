'use client'

import { useEffect, useRef } from 'react'
import { X, Link2, Twitter, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SharePanel } from '@/components/session/SharePanel'
import { nativeShare } from '@/lib/share'
import { cn } from '@/lib/utils'

interface ShareDrawerProps {
  sessionId: string
  sessionName?: string | null
  isOpen: boolean
  onClose: () => void
}

export function ShareDrawer({ sessionId, sessionName, isOpen, onClose }: ShareDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Trap focus
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus()
    }
  }, [isOpen])

  const handleNativeShare = async () => {
    const handled = await nativeShare(sessionId, sessionName)
    if (!handled) {
      // Fall back to copy behavior handled in SharePanel
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Share session"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto',
          'bg-surface border border-border rounded-t-2xl shadow-2xl',
          'transition-transform duration-300 ease-out',
          'focus:outline-none',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-2" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-muted" />
            <h2 className="font-semibold text-foreground">Share Session</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <SharePanel sessionId={sessionId} sessionName={sessionName} />

          {/* Native share (mobile) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              variant="outline"
              size="md"
              onClick={handleNativeShare}
              className="w-full mt-3 flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share via...
            </Button>
          )}
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-safe-area-bottom" />
      </div>
    </>
  )
}
