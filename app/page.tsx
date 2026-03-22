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

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <LandingClient user={user} profileUsername={profileUsername} />
    </main>
  )
}
