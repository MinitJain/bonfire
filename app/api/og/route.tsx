import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'
import { BRAND, FLAME_INNER, FLAME_OUTER, INVITE_DESCRIPTION, inviteTitle } from '@/lib/brand'

export const runtime = 'edge'

const VALID_TYPES = new Set(['', 'stats', 'invite'])
const BONFIRE_ID = /^[a-z0-9]{8}$/
const SESSION_ID = /^[a-z0-9]{8}$/
const SIZE = { width: 1200, height: 630 }
const CACHE = { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' }

function clampInt(value: string | null, max = 999999): number {
  const n = parseInt(value ?? '0', 10)
  return isNaN(n) || n < 0 ? 0 : Math.min(n, max)
}

/**
 * Read public columns with the anon key. Invitation text is built only from
 * stored values, never from URL parameters, so it cannot be spoofed.
 */
async function readRow<T>(table: 'bonfires' | 'sessions', id: string, columns: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}&select=${columns}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) return null
  const rows = (await res.json()) as T[]
  return rows[0] ?? null
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <defs>
        <linearGradient id="f" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={BRAND.fire} />
          <stop offset="1" stopColor={BRAND.ember} />
        </linearGradient>
      </defs>
      <path d={FLAME_OUTER} fill="url(#f)" />
      <path d={FLAME_INNER} fill={BRAND.flameCore} />
    </svg>
  )
}

function Card({ children, footer }: { children: React.ReactNode; footer: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(180deg, ${BRAND.paleTop} 0%, ${BRAND.pale} 70%)`,
        fontFamily: 'sans-serif',
        position: 'relative',
        color: BRAND.slate,
      }}
    >
      {/* warm light pooled under the mark */}
      <div
        style={{
          position: 'absolute',
          top: '120px',
          left: '450px',
          width: '300px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(246,150,70,0.28), rgba(246,150,70,0))',
        }}
      />
      {children}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          fontSize: '18px',
          letterSpacing: '0.34em',
          color: BRAND.slateSoft,
        }}
      >
        {footer}
      </div>
    </div>
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? ''
    if (!VALID_TYPES.has(type)) {
      return new Response('Invalid type', { status: 400 })
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bonfirefocus.vercel.app'
    const displayUrl = appUrl.replace(/^https?:\/\//, '')

    if (type === 'invite') {
      const bonfireId = searchParams.get('bonfire') ?? ''
      const sessionId = searchParams.get('session') ?? ''
      let title = inviteTitle(null, null)
      let detail: string = INVITE_DESCRIPTION

      if (BONFIRE_ID.test(bonfireId)) {
        const row = await readRow<{ name: string | null; initiator_name: string | null; focus_duration: number; short_duration: number; long_duration: number }>(
          'bonfires', bonfireId, 'name,initiator_name,focus_duration,short_duration,long_duration',
        )
        if (row) {
          title = inviteTitle(row.initiator_name, row.name)
          detail = `${Math.round(row.focus_duration / 60)} · ${Math.round(row.short_duration / 60)} · ${Math.round(row.long_duration / 60)}`
        }
      } else if (SESSION_ID.test(sessionId)) {
        // v1 rooms: same lookup-by-id approach; the preview stays equivalent.
        const row = await readRow<{ host_name: string | null; settings: { focus?: number } | null }>(
          'sessions', sessionId, 'host_name,settings',
        )
        if (row) {
          title = inviteTitle(row.host_name, null)
          detail = `${row.settings?.focus ?? 25} minute focus`
        }
      }

      return new ImageResponse(
        (
          <Card footer="BONFIRE">
            <Mark size={120} />
            <div style={{ marginTop: '36px', fontSize: '54px', fontWeight: 600, maxWidth: '1000px', textAlign: 'center', lineHeight: 1.2 }}>
              {title}
            </div>
            <div style={{ marginTop: '18px', fontSize: '26px', color: BRAND.slateSoft }}>
              {INVITE_DESCRIPTION}
            </div>
            {detail !== INVITE_DESCRIPTION && (
              <div style={{ marginTop: '14px', fontSize: '22px', color: BRAND.slateSoft, letterSpacing: '0.08em' }}>
                {detail}
              </div>
            )}
          </Card>
        ),
        { ...SIZE, headers: CACHE },
      )
    }

    if (type === 'stats') {
      const username = (searchParams.get('username') ?? '').slice(0, 30)
      const pomodoros = clampInt(searchParams.get('pomodoros'))
      const streak = clampInt(searchParams.get('streak'))
      const hours = clampInt(searchParams.get('hours'))
      return new ImageResponse(
        (
          <Card footer={displayUrl.toUpperCase()}>
            <Mark size={72} />
            <div style={{ marginTop: '20px', fontSize: '44px', fontWeight: 600 }}>{username}</div>
            <div style={{ marginTop: '6px', fontSize: '20px', color: BRAND.slateSoft }}>Focus stats</div>
            <div style={{ display: 'flex', gap: '56px', marginTop: '40px' }}>
              {[
                { value: String(pomodoros), label: 'Pomodoros' },
                { value: `${hours}h`, label: 'Focus time' },
                { value: `${streak}d`, label: 'Streak' },
              ].map(({ value, label }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '56px', fontWeight: 600, color: BRAND.fire }}>{value}</span>
                  <span style={{ fontSize: '18px', color: BRAND.slateSoft }}>{label}</span>
                </div>
              ))}
            </div>
          </Card>
        ),
        { ...SIZE, headers: CACHE },
      )
    }

    // Default card (site, and profile pages which pass a page name)
    const name = (searchParams.get('name') ?? '').slice(0, 50)
    return new ImageResponse(
      (
        <Card footer={displayUrl.toUpperCase()}>
          <Mark size={120} />
          <div style={{ marginTop: '34px', fontSize: '60px', fontWeight: 600, letterSpacing: '0.3em', paddingLeft: '0.3em' }}>
            BONFIRE
          </div>
          <div style={{ marginTop: '18px', fontSize: '28px', color: BRAND.slateSoft }}>
            {name || BRAND.tagline.toLowerCase()}
          </div>
        </Card>
      ),
      { ...SIZE, headers: CACHE },
    )
  } catch (err) {
    console.error('[og] Image generation failed:', err)
    return new Response('Image generation failed', { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
