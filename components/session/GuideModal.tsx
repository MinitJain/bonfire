'use client'

import { useEffect, useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { AMBIENT_SOUNDS } from '@/lib/ambient'

interface GuideModalProps {
  onClose: () => void
}

const shortcuts = [
  { key: 'Space', description: 'Play / Pause (host or jam mode)' },
  { key: '?',     description: 'Open this guide' },
  { key: 'Esc',   description: 'Close panel or overlay' },
]

function GuideSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex items-center justify-between w-full py-4 text-sm font-medium text-left cursor-pointer"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
        <ChevronRight
          className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--text-muted)' }}
        />
      </button>
      {isOpen && (
        <div
          className="pb-5 text-sm leading-relaxed animate-fade-up"
          style={{ color: 'var(--text-secondary)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function GuideContent({ openSection, setOpenSection }: {
  openSection: string | null
  setOpenSection: (id: string | null) => void
}) {
  function toggle(id: string) {
    setOpenSection(openSection === id ? null : id)
  }

  return (
    <div className="flex flex-col">
      <GuideSection title="Solo Mode" isOpen={openSection === 'solo'} onToggle={() => toggle('solo')}>
        <p>Your own private focus room. The timer is fully under your control: start, pause, and skip whenever you need.</p>
        <p className="mt-2">New participants cannot join while Solo mode is active. Switch to Jam or Host mode if you want to collaborate.</p>
      </GuideSection>

      <GuideSection title="Jam Mode" isOpen={openSection === 'jam'} onToggle={() => toggle('jam')}>
        <p>Collaborative focus. Anyone in the room can start, pause, or skip the timer. No hierarchy, full trust.</p>
        <p className="mt-2">Best for study groups or pairs who want shared control. New participants can join via the invite link.</p>
      </GuideSection>

      <GuideSection title="Host Mode" isOpen={openSection === 'host'} onToggle={() => toggle('host')}>
        <p>You lead, others follow. Only the host can control the timer. Participants watch the same countdown in real time.</p>
        <p className="mt-2">Ideal when one person is running a group session or Pomodoro sprint. Guests can still request timer changes and you approve or decline.</p>
      </GuideSection>

      <GuideSection title="Requesting Settings" isOpen={openSection === 'settings'} onToggle={() => toggle('settings')}>
        <p>If you are a participant in Host mode, you can suggest timer changes without disrupting the session.</p>
        <ol className="mt-2 flex flex-col gap-1.5 list-decimal list-inside">
          <li>Open the settings panel (gear icon below the timer).</li>
          <li>Adjust focus duration, break lengths, or rounds.</li>
          <li>Tap <strong style={{ color: 'var(--text-primary)' }}>Send Request</strong>. The host gets a card showing exactly what changed.</li>
          <li>The host accepts or declines. You see the result instantly.</li>
        </ol>
        <p className="mt-2">Requests time out after 30 seconds if the host does not respond.</p>
      </GuideSection>

      <GuideSection title="Noise Library" isOpen={openSection === 'noise'} onToggle={() => toggle('noise')}>
        <p className="mb-3">All sounds are generated locally with the Web Audio API. No files, no network requests.</p>
        <div className="flex flex-col gap-3">
          {AMBIENT_SOUNDS.map(({ type, label, description }) => (
            <div key={type} className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                {label}
              </span>
              <span>{description}</span>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="Keyboard Shortcuts" isOpen={openSection === 'shortcuts'} onToggle={() => toggle('shortcuts')}>
        <dl className="flex flex-col gap-3">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <dt>{description}</dt>
              <dd>
                <kbd
                  className="font-mono text-xs px-2 py-1 rounded-md flex-shrink-0"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {key}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </GuideSection>
    </div>
  )
}

export function GuideModal({ onClose }: GuideModalProps) {
  const [openSection, setOpenSection] = useState<string | null>('solo')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const header = (id: string) => (
    <div
      className="flex items-center justify-between px-6 py-5 flex-shrink-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <h2
        id={id}
        className="font-semibold text-base"
        style={{ color: 'var(--text-primary)' }}
      >
        Guide
      </h2>
      <button
        onClick={onClose}
        aria-label="Close guide"
        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
        style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      {/* Desktop — right sidebar */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title-desktop"
        className="hidden sm:flex flex-col fixed right-0 top-0 bottom-0 w-[400px] animate-slide-in-right"
        style={{
          background: 'var(--bg-elevated)',
          borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {header('guide-title-desktop')}
        <div className="flex-1 overflow-y-auto px-6">
          <GuideContent openSection={openSection} setOpenSection={setOpenSection} />
        </div>
      </aside>

      {/* Mobile — bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title-mobile"
        className="sm:hidden fixed bottom-0 left-0 right-0 rounded-t-3xl animate-slide-up-sheet flex flex-col"
        style={{
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border)',
          maxHeight: '85vh',
          minHeight: '40vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          className="mx-auto mt-3 mb-1 rounded-full flex-shrink-0"
          style={{ width: '40px', height: '4px', background: 'var(--border-strong)' }}
        />
        {header('guide-title-mobile')}
        <div className="flex-1 overflow-y-auto px-6">
          <GuideContent openSection={openSection} setOpenSection={setOpenSection} />
        </div>
      </div>
    </div>
  )
}
