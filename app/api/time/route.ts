import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Server wall clock, for estimating how far a client's clock is off. */
export function GET() {
  return NextResponse.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } })
}
