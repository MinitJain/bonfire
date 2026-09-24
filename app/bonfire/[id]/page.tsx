import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { BonfireState } from '@/types'
import { BONFIRE_COLUMNS } from '@/lib/bonfire'
import { INVITE_DESCRIPTION, inviteTitle } from '@/lib/brand'
import { BonfireRoom } from '@/components/bonfire/BonfireRoom'

interface PageProps {
  params: Promise<{ id: string }>
}

// Explicit columns: initiator_token is not client-readable.
// Ended bonfires are readable too, so the room can show that the fire has settled.
// cache(): metadata and the page share one read per request.
const getBonfire = cache(async (id: string): Promise<BonfireState | null> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bonfires')
    .select(BONFIRE_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as BonfireState
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const bonfire = await getBonfire(id)
  if (!bonfire) return { title: 'Bonfire' }

  // Only stored values: the initiator's chosen name and the Bonfire name.
  const title = inviteTitle(bonfire.initiator_name, bonfire.name)
  const image = `/api/og?type=invite&bonfire=${encodeURIComponent(bonfire.id)}`

  return {
    title: { absolute: bonfire.name ? `${bonfire.name} | Bonfire` : 'Bonfire' },
    description: INVITE_DESCRIPTION,
    openGraph: {
      title,
      description: INVITE_DESCRIPTION,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: INVITE_DESCRIPTION,
      images: [image],
    },
  }
}

export default async function BonfirePage({ params }: PageProps) {
  const { id } = await params
  const bonfire = await getBonfire(id)

  if (!bonfire) {
    notFound()
  }

  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let displayName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .maybeSingle()

    displayName =
      profile?.display_name ??
      profile?.username ??
      (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null)
  }

  return (
    <BonfireRoom
      key={bonfire.id}
      initial={bonfire}
      userId={user?.id ?? null}
      displayName={displayName}
    />
  )
}
