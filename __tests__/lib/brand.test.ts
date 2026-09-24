import { describe, it, expect } from 'vitest'
import { inviteTitle, INVITE_DESCRIPTION, markSvg, FLAME_OUTER } from '@/lib/brand'

describe('inviteTitle', () => {
  it('names the Bonfire when it has one', () => {
    expect(inviteTitle('Alex', 'Deep Work')).toBe('Alex is inviting you to Deep Work')
  })
  it('falls back to "a Bonfire"', () => {
    expect(inviteTitle('Alex', null)).toBe('Alex is inviting you to a Bonfire')
    expect(inviteTitle('Alex', '   ')).toBe('Alex is inviting you to a Bonfire')
  })
  it('falls back to "Someone" and normalises whitespace and length', () => {
    expect(inviteTitle(null, null)).toBe('Someone is inviting you to a Bonfire')
    expect(inviteTitle('  Mira   Lee ', 'x'.repeat(60))).toBe(`Mira Lee is inviting you to ${'x'.repeat(40)}`)
  })
  it('uses the agreed description', () => {
    expect(INVITE_DESCRIPTION).toBe('Sit together. Do your own work.')
  })
})

describe('markSvg', () => {
  it('contains the shared flame path', () => {
    expect(markSvg()).toContain(FLAME_OUTER)
  })
})
