import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { BonfireState } from '@/types'
import { selectBonfire } from '@/lib/bonfire'
import { INVITE_DESCRIPTION, inviteImageVersion, inviteTitle } from '@/lib/brand'
import { bonfireTitle } from '@/lib/roomName'
import { BonfireRoom } from '@/components/bonfire/BonfireRoom'

interface PageProps {
  params: Promise<{ id: string }>
}

// Explicit columns: initiator_token is not client-readable.
// Ended bonfires are readable too, so the room can show that the fire has settled.
// cache(): metadata and the page share one read per request.
const getBonfire = cache(async (id: string): Promise<BonfireState | null> => {
  const { data } = await selectBonfire(createClient(), id)
  return data
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const bonfire = await getBonfire(id)
  if (!bonfire) return { title: 'Bonfire' }

  // Only stored values: the initiator's chosen name and the Bonfire name.
  const title = inviteTitle(bonfire.initiator_name, bonfire.name)
  // The image URL changes when what it shows changes, so a rename or new
  // settings is not hidden behind a cached preview of the old one.
  const image = `/api/og?type=invite&bonfire=${encodeURIComponent(bonfire.id)}&v=${inviteImageVersion(bonfire)}`
  const url = `/bonfire/${bonfire.id}`

  return {
    // Same title the room keeps in the tab while the timer is stopped
    title: { absolute: `${bonfireTitle(bonfire)} | Bonfire` },
    description: INVITE_DESCRIPTION,
    alternates: { canonical: url },
    // Temporary rooms: previewable when shared, never indexed
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      siteName: 'Bonfire',
      url,
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
