import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Session } from '@/types'
import { SessionProvider } from '@/components/session/SessionProvider'

interface SessionPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: SessionPageProps): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('sessions')
    .select('title')
    .eq('id', params.id)
    .single()

  const sessionName = data?.title ?? 'Focus Session'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pomodoro-jam.vercel.app'

  return {
    title: sessionName,
    openGraph: {
      title: `${sessionName} | PomodoroJam`,
      images: [
        {
          url: `/api/og?session=${encodeURIComponent(params.id)}&name=${encodeURIComponent(sessionName)}`,
          width: 1200,
          height: 630,
        },
      ],
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

  if (error || !session) {
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
    <SessionProvider
      session={typedSession}
      userId={user?.id ?? null}
      isHost={isHost}
      username={userProfile?.username ?? user?.email?.split('@')[0] ?? null}
      avatarUrl={userProfile?.avatar_url ?? null}
    />
  )
}
