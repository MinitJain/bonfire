/**
 * The timer is anchored to server timestamps (started_at is the database's
 * clock), so remaining time must be measured against the server's clock
 * too. A laptop running 20 seconds fast would otherwise show 20 seconds
 * less than everyone else and ask the server to end the phase early.
 *
 * The offset is estimated once per page load from /api/time, corrected for
 * half the round trip. Until it is known (or if it cannot be measured) the
 * local clock is used, which is the previous behaviour.
 */

let offsetMs = 0
let syncing: Promise<void> | null = null

export function serverNow(): number {
  return Date.now() + offsetMs
}

/** offset = server time at the midpoint of the request - local time then. */
export function estimateOffset(sentAt: number, serverTime: number, receivedAt: number): number {
  return serverTime - (sentAt + (receivedAt - sentAt) / 2)
}

export function syncServerClock(): Promise<void> {
  if (syncing) return syncing
  syncing = (async () => {
    try {
      const sentAt = Date.now()
      const res = await fetch('/api/time', { cache: 'no-store' })
      const receivedAt = Date.now()
      const { now } = (await res.json()) as { now?: unknown }
      // A slow round trip makes the estimate unreliable; keep the local clock
      if (typeof now === 'number' && receivedAt - sentAt < 5000) {
        offsetMs = estimateOffset(sentAt, now, receivedAt)
      }
    } catch {
      /* local clock it is */
    }
  })()
  return syncing
}
