import { describe, it, expect, vi } from 'vitest'

// Inline the write queue logic (mirrors SessionProvider's enqueueSessionUpdate)
function makeWriteQueue() {
  let queue = Promise.resolve()
  const enqueue = (fn: () => Promise<void>) => {
    queue = queue.catch(() => undefined).then(fn)
    return queue
  }
  return { enqueue, getQueue: () => queue }
}

describe('write queue serialization', () => {
  it('runs tasks in order regardless of individual duration', async () => {
    const order: string[] = []
    const { enqueue } = makeWriteQueue()

    // 'start' takes 50ms, 'pause' 10ms, 'reset' 5ms
    // Without queue: pause and reset would finish first
    enqueue(() => new Promise(r => setTimeout(() => { order.push('start'); r() }, 50)))
    enqueue(() => new Promise(r => setTimeout(() => { order.push('pause'); r() }, 10)))
    enqueue(() => new Promise(r => setTimeout(() => { order.push('reset'); r() }, 5)))

    await new Promise(r => setTimeout(r, 100))
    expect(order).toEqual(['start', 'pause', 'reset'])
  })

  it('continues processing after a failed task', async () => {
    const order: string[] = []
    const { enqueue, getQueue } = makeWriteQueue()

    enqueue(() => Promise.reject(new Error('DB error')))
    enqueue(() => Promise.resolve().then(() => order.push('after-error')))

    await getQueue().catch(() => undefined)
    // Give microtasks time to flush
    await new Promise(r => setTimeout(r, 10))
    expect(order).toContain('after-error')
  })

  it('last enqueued task reflects final state', async () => {
    const writes: Record<string, unknown>[] = []
    const { enqueue, getQueue } = makeWriteQueue()

    const mockUpdate = (patch: Record<string, unknown>) =>
      enqueue(async () => { writes.push(patch) })

    mockUpdate({ running: true })
    mockUpdate({ running: false, time_left: 900 })
    mockUpdate({ running: false, time_left: 0, mode: 'short' })

    await getQueue()
    expect(writes).toHaveLength(3)
    expect(writes[writes.length - 1]).toMatchObject({ running: false, mode: 'short' })
  })
})
