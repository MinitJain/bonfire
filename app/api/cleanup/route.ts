import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error, count } = await supabase
    .from('sessions')
    .delete({ count: 'exact' })
    .lt('last_active_at', sevenDaysAgo)

  if (error) {
    console.error('[cleanup] Failed to delete sessions:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  console.log('[cleanup] Deleted', count, 'stale sessions')
  return Response.json({ deleted: count ?? 0 })
}
