import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSessionId } from '@/lib/session'
import { TIMER_DURATIONS } from '@/lib/timer'
import { z } from 'zod'

// In-memory rate limiter: 10 sessions per IP per minute
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT) return true
  timestamps.push(now)
  rateLimitMap.set(ip, timestamps)
  return false
}

const CreateSessionSchema = z.object({
  title: z.string().max(100).optional(),
  jam_mode: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many sessions created. Please wait.' }, { status: 429 })
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let body: unknown = {}
    try { body = await request.json() } catch { /* empty body — treat as {} */ }
    const parsed = CreateSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Try to get the profile display name if signed in
    let hostName = 'Guest'
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .maybeSingle()
      if (profile) {
        hostName = profile.display_name ?? profile.username ?? 'Guest'
      }
    }

    const sessionId = generateSessionId()
    const focusDuration = TIMER_DURATIONS.focus

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        host_id: user?.id ?? null,
        host_name: hostName,
        title: parsed.data.title ?? 'Focus Session',
        status: 'waiting',
        mode: 'focus',
        time_left: focusDuration,
        total_time: focusDuration,
        running: false,
        pomos_done: 0,
        settings: { focus: 25, short: 5, long: 15, rounds: 4, allowGuestShare: true },
        jam_mode: parsed.data.jam_mode ?? false,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create session:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (err) {
    console.error('Session creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Session fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Session fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
