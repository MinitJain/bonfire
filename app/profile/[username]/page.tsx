import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { StatsGrid } from '@/components/profile/StatsGrid'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface ProfilePageProps {
  params: { username: string }
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name, username, bio')
    .eq('username', params.username)
    .single()

  if (!data) {
    return { title: 'Profile Not Found' }
  }

  const name = data.display_name ?? data.username
  return {
    title: name,
    description: data.bio ?? `${name}'s PomodoroJam profile`,
    openGraph: {
      title: `${name} | PomodoroJam`,
      images: [
        {
          url: `/api/og?name=${encodeURIComponent(name + "'s Profile")}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .single()

  if (error || !profile) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const typedProfile = profile as Profile
  const isOwnProfile = user?.id === typedProfile.id

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-5 sm:px-8 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <ThemeToggle />
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <ProfileCard profile={typedProfile} isOwnProfile={isOwnProfile} />
        <div className="mt-6">
          <StatsGrid profile={typedProfile} />
        </div>
      </div>
    </div>
  )
}
