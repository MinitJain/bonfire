import { describe, it, expect } from 'vitest'
import { bonfireTitle, fireName, generateAnonName } from '@/lib/roomName'

const seq = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('generateAnonName', () => {
  it('is "Adjective Creature" in title case', () => {
    expect(generateAnonName()).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
  })
  it('is reproducible for the same random source', () => {
    expect(generateAnonName(seq(0.1, 0.9))).toBe(generateAnonName(seq(0.1, 0.9)))
  })
  it('never indexes past the word lists', () => {
    expect(generateAnonName(() => 0.999999)).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
  })
})

describe('fireName / bonfireTitle', () => {
  it("names an unnamed Bonfire after its initiator", () => {
    expect(fireName('Quiet Fox')).toBe("Quiet Fox's fire")
    expect(fireName('  Mira   Lee ')).toBe("Mira Lee's fire")
  })
  it('falls back when there is no initiator name', () => {
    expect(fireName('')).toBe('A bonfire')
    expect(fireName(null)).toBe('A bonfire')
  })
  it('prefers the chosen Bonfire name', () => {
    expect(bonfireTitle({ name: 'Deep Work', initiator_name: 'Quiet Fox' })).toBe('Deep Work')
    expect(bonfireTitle({ name: '  ', initiator_name: 'Quiet Fox' })).toBe("Quiet Fox's fire")
    expect(bonfireTitle({ name: null, initiator_name: 'Quiet Fox' })).toBe("Quiet Fox's fire")
  })
})
