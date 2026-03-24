'use client'

import { Check, X } from 'lucide-react'
import type { SettingsChangeRequest } from '@/types'
import type { SessionSettings } from './SettingsPanel'

interface SettingsRequestCardProps {
  request: SettingsChangeRequest
  currentSettings: SessionSettings
  timerRunning: boolean
  onAccept: () => void
  onReject: () => void
}

export function SettingsRequestCard({
  request,
  currentSettings,
  timerRunning,
  onAccept,
  onReject,
}: SettingsRequestCardProps) {
  const name = request.requester_name ?? 'A participant'

  const diffs: { label: string; from: string; to: string }[] = []
  if (request.focus !== currentSettings.durations.focus)
    diffs.push({ label: 'Focus', from: `${currentSettings.durations.focus}m`, to: `${request.focus}m` })
  if (request.short !== currentSettings.durations.short)
    diffs.push({ label: 'Short break', from: `${currentSettings.durations.short}m`, to: `${request.short}m` })
  if (request.long !== currentSettings.durations.long)
    diffs.push({ label: 'Long break', from: `${currentSettings.durations.long}m`, to: `${request.long}m` })
  if (request.rounds !== currentSettings.rounds)
    diffs.push({ label: 'Rounds', from: `${currentSettings.rounds}`, to: `${request.rounds}` })
  if (request.autoStartBreaks !== currentSettings.autoStartBreaks)
    diffs.push({ label: 'Auto-start breaks', from: currentSettings.autoStartBreaks ? 'On' : 'Off', to: request.autoStartBreaks ? 'On' : 'Off' })
  if (request.autoStartPomodoros !== currentSettings.autoStartPomodoros)
    diffs.push({ label: 'Auto-start pomodoros', from: currentSettings.autoStartPomodoros ? 'On' : 'Off', to: request.autoStartPomodoros ? 'On' : 'Off' })

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl p-4 animate-scale-in"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
        <span style={{ color: 'var(--accent)' }}>{name}</span> is requesting settings changes
      </p>

      {diffs.length > 0 ? (
        <div className="flex flex-col gap-1.5 mb-4">
          {diffs.map(({ label, from, to }) => (
            <div key={label} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{from}</span>
                {' → '}
                <strong>{to}</strong>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>No changes from current settings.</p>
      )}

      {timerRunning && (
        <p className="text-xs mb-3 text-center" style={{ color: 'var(--text-muted)' }}>
          Pause the timer to accept
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        >
          <X className="w-4 h-4" style={{ color: '#ef4444' }} />
          Reject
        </button>
        <button
          onClick={onAccept}
          disabled={timerRunning}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        >
          <Check className="w-4 h-4" style={{ color: '#22c55e' }} />
          Accept
        </button>
      </div>
    </div>
  )
}
