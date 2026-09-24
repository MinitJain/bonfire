import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  BONFIRE_COLUMNS,
  DEFAULT_FOCUS_SECONDS,
  DEFAULT_LONG_SECONDS,
  DEFAULT_ROUNDS_BEFORE_LONG,
  DEFAULT_SHORT_SECONDS,
} from '@/lib/bonfire'

const CreateBonfireSchema = z.object({
  initiator_name: z.string().trim().min(1).max(40).optional(),
  focus_duration: z.number().int().min(60).max(7200).optional(),
  short_duration: z.number().int().min(30).max(1800).optional(),
  long_duration: z.number().int().min(60).max(3600).optional(),
  rounds_before_long: z.number().int().min(1).max(12).optional(),
  session_mode: z.enum(['focus', 'jam']).optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      /* empty body */
    }
    const parsed = CreateBonfireSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    let initiatorName = 'Someone'
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .maybeSingle()
      if (profile) {
        initiatorName = profile.display_name ?? profile.username ?? 'Someone'
      }
    } else if (parsed.data.initiator_name) {
      initiatorName = parsed.data.initiator_name
    }

    const { data, error } = await supabase.rpc('create_bonfire' as never, {
      p_initiator_name: initiatorName,
      p_focus_duration: parsed.data.focus_duration ?? DEFAULT_FOCUS_SECONDS,
      p_short_duration: parsed.data.short_duration ?? DEFAULT_SHORT_SECONDS,
      p_long_duration: parsed.data.long_duration ?? DEFAULT_LONG_SECONDS,
      p_rounds_before_long: parsed.data.rounds_before_long ?? DEFAULT_ROUNDS_BEFORE_LONG,
      p_session_mode: parsed.data.session_mode ?? 'focus',
    } as never)

    if (error) {
      console.error('Failed to create bonfire:', error)
      return NextResponse.json({ error: 'Failed to create bonfire' }, { status: 500 })
    }

    const bonfire = data as { id: string; initiator_token: string }

    return NextResponse.json(
      { id: bonfire.id, initiator_token: bonfire.initiator_token },
      { status: 201 },
    )
  } catch (err) {
    console.error('Bonfire creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Bonfire ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('bonfires')
      .select(BONFIRE_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Bonfire fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch bonfire' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Bonfire not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Bonfire fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
