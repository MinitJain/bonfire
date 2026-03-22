import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Restrict `next` to safe relative paths only to prevent open redirects.
  // Block // (protocol-relative) and /\ (backslash bypass used by some browsers).
  const rawNext = searchParams.get('next') ?? '/'
  const next = /^\/(?![\\/])/.test(rawNext) ? rawNext : '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectTo = `${next}${next.includes('?') ? '&' : '?'}welcome=1`
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectTo}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectTo}`)
      } else {
        return NextResponse.redirect(`${origin}${redirectTo}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
