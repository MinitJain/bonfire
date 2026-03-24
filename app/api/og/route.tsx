import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name = (searchParams.get('name') ?? '').slice(0, 50)
  const sessionId = (searchParams.get('session') ?? '').slice(0, 60)
  const type = searchParams.get('type') ?? ''
  const username = (searchParams.get('username') ?? '').slice(0, 30)
  const pomodoros = parseInt(searchParams.get('pomodoros') ?? '0', 10) || 0
  const streak = parseInt(searchParams.get('streak') ?? '0', 10) || 0
  const hours = parseInt(searchParams.get('hours') ?? '0', 10) || 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pomodoro-jam.vercel.app'
  const displayUrl = appUrl.replace(/^https?:\/\//, '')

  if (type === 'stats') {
    return new ImageResponse(
      (
        <div style={{ background: '#0F0F0D', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', position: 'relative' }}>
          <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,85,51,0.1) 0%, transparent 65%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          <div style={{ fontSize: '20px', color: '#666', marginBottom: '8px' }}>🍅 PomodoroJam</div>
          <div style={{ fontSize: '40px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>{username}</div>
          <div style={{ fontSize: '16px', color: '#888', marginBottom: '48px' }}>Focus stats</div>
          <div style={{ display: 'flex', gap: '40px' }}>
            {[
              { value: String(pomodoros), label: 'Pomodoros' },
              { value: `${hours}h`, label: 'Focus time' },
              { value: `${streak}d`, label: 'Streak' },
            ].map(({ value, label }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '52px', fontWeight: '800', color: '#FF5533' }}>{value}</span>
                <span style={{ fontSize: '16px', color: '#666' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0F0F0D',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background radial glow */}
        <div
          style={{
            position: 'absolute',
            width: '700px',
            height: '700px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,85,51,0.12) 0%, transparent 65%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Tomato SVG icon */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 100 100"
          style={{ marginBottom: '32px' }}
        >
          {/* Stem */}
          <rect x="47" y="8" width="6" height="16" rx="3" fill="#4CAF50" />
          <path d="M50 14 Q60 5 70 10" stroke="#4CAF50" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Body */}
          <circle cx="50" cy="58" r="36" fill="#FF5533" />
          {/* Shine */}
          <ellipse cx="38" cy="44" rx="9" ry="6" fill="rgba(255,255,255,0.25)" />
        </svg>

        {/* Wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0px',
            fontSize: '56px',
            fontWeight: '800',
            letterSpacing: '-1px',
            marginBottom: '20px',
          }}
        >
          <span style={{ color: '#FFFFFF' }}>Pomodoro</span>
          <span style={{ color: '#FF5533' }}>Jam</span>
        </div>

        {/* Session name or default tagline */}
        <div
          style={{
            fontSize: sessionId && name ? '36px' : '28px',
            fontWeight: sessionId && name ? '700' : '400',
            color: sessionId && name ? '#FFFFFF' : '#888888',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: '1.3',
            marginBottom: '12px',
            padding: '0 40px',
          }}
        >
          {sessionId && name
            ? name
            : 'The shared focus timer. Start a session, share the link.'}
        </div>

        {/* Sub-label when showing a session */}
        {sessionId && (
          <div
            style={{
              fontSize: '20px',
              color: '#666666',
              marginBottom: '0px',
            }}
          >
            Join this focus session
          </div>
        )}

        {/* URL at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            fontSize: '18px',
            color: '#444444',
            fontFamily: 'monospace',
            letterSpacing: '0.03em',
          }}
        >
          {displayUrl}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
