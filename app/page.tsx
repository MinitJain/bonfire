import { createClient } from '@/lib/supabase/server'
import { HomeClient } from '@/components/home/HomeClient'

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
  const { count, error: countError } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('running', true)
    .neq('session_mode', 'solo')
    .gt('last_active_at', ninetySecondsAgo)
  const activeSessionCount = countError ? 0 : (count ?? 0)

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <HomeClient user={user} profileUsername={profileUsername} activeSessionCount={activeSessionCount} />
    </main>
  )
}
