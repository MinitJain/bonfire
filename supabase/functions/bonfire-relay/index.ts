/**
 * bonfire-relay Edge Function
 *
 * Receives POST requests from pg_net (database trigger) with the full
 * bonfire row as JSON. Publishes the authoritative state to the
 * Supabase Realtime broadcast channel so all connected clients receive it.
 *
 * This is the database-originated publication mechanism:
 *   DB change → pg_net HTTP POST → this function → Realtime broadcast → clients
 *
 * Clients NEVER broadcast canonical state. Only this function publishes.
 *
 * Required secrets (set via `supabase secrets set`):
 *   SUPABASE_URL       - Project URL (e.g. https://xyz.supabase.co)
 *   SERVICE_ROLE_KEY   - Service role key for Realtime broadcast
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[bonfire-relay] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Parse the bonfire row from pg_net POST body
    const bonfire = await req.json()

    if (!bonfire || !bonfire.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: missing bonfire id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Create a Supabase client with service role privileges
    // to publish to the Realtime broadcast channel
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Publish the authoritative bonfire state to the Realtime channel.
    // All clients subscribed to bonfire:{id} receive this broadcast.
    const channel = supabase.channel(`bonfire:${bonfire.id}`)

    const result = await channel.send({
      type: 'broadcast',
      event: 'state_update',
      payload: bonfire,
    })

    if (result !== 'ok') {
      console.error(`[bonfire-relay] Broadcast failed for bonfire ${bonfire.id}: ${result}`)
    }

    // Cleanup: remove the channel after publishing
    await supabase.removeChannel(channel)

    return new Response(
      JSON.stringify({ ok: true, bonfire_id: bonfire.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[bonfire-relay] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
