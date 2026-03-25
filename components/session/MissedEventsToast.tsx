'use client'

interface MissedEventsToastProps {
  events: string[]
  onDismiss: () => void
}

export function MissedEventsToast({ events, onDismiss }: MissedEventsToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-4 sm:left-6 z-50 flex flex-col pointer-events-auto animate-fade-up"
      style={{ maxWidth: '280px' }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded-t-xl text-xs font-medium"
        style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', borderBottom: 'none', color: 'var(--accent)' }}
      >
        <span>While you were away</span>
        <button onClick={onDismiss} aria-label="Dismiss" className="ml-2 cursor-pointer opacity-70 hover:opacity-100 transition-opacity" style={{ color: 'var(--accent)' }}>×</button>
      </div>
      <div className="flex flex-col rounded-b-xl overflow-hidden" style={{ border: '1px solid var(--border)', borderTop: 'none', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-md)', backdropFilter: 'blur(8px)' }}>
        {events.map((text, i) => (
          <div key={text} className="px-3.5 py-1.5 text-xs leading-snug" style={{ color: 'var(--text-secondary)', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}
