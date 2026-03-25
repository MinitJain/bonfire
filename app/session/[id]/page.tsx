import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Session } from '@/types'
import { SessionProvider } from '@/components/session/SessionProvider'
import { SessionErrorBoundary } from '@/components/session/SessionErrorBoundary'

interface SessionPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: SessionPageProps): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('sessions')
    .select('title, host_name, settings')
    .eq('id', params.id)
    .single()

  const hostName = data?.host_name ?? 'Someone'
  const focusMins: number = (data?.settings as { focus?: number } | null)?.focus ?? 25
  const ogTitle = `${hostName} invited you to PomodoroJam 🍅`
  const ogDesc = `Join ${hostName}'s ${focusMins}-min focus session. Open the link to join.`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pomodoro-jam.vercel.app'

  return {
    title: `${hostName}'s focus session`,
    description: ogDesc,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      images: [
        {
          url: `${appUrl}/api/og?type=invite&host=${encodeURIComponent(hostName)}&focus=${focusMins}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDesc,
    },
  }
}

export default async function SessionPage({ params }: SessionPageProps) {
  const supabase = createClient()

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = "no rows returned" — genuine not-found; anything else is a server error
    throw new Error('Failed to load session')
  }
  if (!session) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const typedSession = session as Session

  // Fetch current user's profile for display name and avatar
  let userProfile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single()
    userProfile = data
  }

  const isHost = user?.id === typedSession.host_id

  return (
    <SessionErrorBoundary>
      <SessionProvider
        session={typedSession}
        userId={user?.id ?? null}
        isHost={isHost}
        username={userProfile?.username ?? user?.email?.split('@')[0] ?? null}
        avatarUrl={userProfile?.avatar_url ?? null}
      />
    </SessionErrorBoundary>
  )
}
