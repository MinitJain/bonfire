import { describe, it, expect } from 'vitest'
import { characterLook, hashKey, shade } from '@/lib/characters'

describe('characterLook', () => {
  it('is deterministic per presence key', () => {
    expect(characterLook('abc-123')).toEqual(characterLook('abc-123'))
  })

  it('varies across keys', () => {
    const looks = new Set(
      Array.from({ length: 40 }, (_, i) => JSON.stringify(characterLook(`guest-${i}`))),
    )
    expect(looks.size).toBeGreaterThan(30)
    const styles = new Set(Array.from({ length: 40 }, (_, i) => characterLook(`guest-${i}`).hairStyle))
    expect(styles.size).toBe(4)
  })

  it('hashKey is a stable unsigned 32-bit hash', () => {
    expect(hashKey('')).toBe(0x811c9dc5)
    expect(hashKey('bonfire')).toBe(hashKey('bonfire'))
    expect(hashKey('bonfire')).toBeGreaterThanOrEqual(0)
  })
})

describe('shade', () => {
  it('darkens and lightens hex colours', () => {
    expect(shade('#808080', -0.5)).toBe('#404040')
    expect(shade('#000000', 0.5)).toBe('#808080')
    expect(shade('#ffffff', -1)).toBe('#000000')
  })
})
