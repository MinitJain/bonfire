import { createClient } from '@/lib/supabase/server'
import { LandingClient } from '@/components/landing/LandingClient'

export default async function HomePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profileUsername: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
    profileUsername = profile?.username ?? null
  }

  const ninetySecondsAgo = new Date(Date.now() - 90_000).toISOString()
  const { count: activeSessionCount } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('running', true)
    .gt('last_active_at', ninetySecondsAgo)

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <LandingClient user={user} profileUsername={profileUsername} activeSessionCount={activeSessionCount ?? 0} />
    </main>
  )
}
