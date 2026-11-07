import { describe, it, expect } from 'vitest'
import {
  BODY, HAIR, SKIN, characterLook, defaultChoice, hashKey, lookFor, parseChoice, shade,
  type CharacterChoice,
} from '@/lib/characters'

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

describe('character choice', () => {
  const valid: CharacterChoice = {
    build: 'feminine', skin: 2, hairStyle: 'buzz', hairColor: 5,
    outfit: 'hoodie', outfitColor: 7, accessory: 'glasses',
  }

  it('defaultChoice reproduces the generated look', () => {
    for (let i = 0; i < 30; i++) {
      const key = `guest-${i}`
      expect(lookFor(key, defaultChoice(key))).toEqual(characterLook(key))
    }
  })

  it('lookFor without a choice is the generated look', () => {
    expect(lookFor('k', null)).toEqual(characterLook('k'))
  })

  it('lookFor applies every picked trait from the palettes', () => {
    const look = lookFor('k', valid)
    expect(look).toMatchObject({
      build: 'feminine', skin: SKIN[2], hairStyle: 'buzz', hair: HAIR[5],
      outfit: 'hoodie', body: BODY[7], accessory: 'glasses',
    })
  })

  it('parseChoice accepts a valid choice and drops unknown keys', () => {
    expect(parseChoice(valid)).toEqual(valid)
    expect(parseChoice({ ...valid, extra: '<script>' })).toEqual(valid)
  })

  it.each([
    ['null', null],
    ['a string', 'feminine'],
    ['an array', [valid]],
    ['an unknown build', { ...valid, build: 'robot' }],
    ['an out-of-range index', { ...valid, skin: SKIN.length }],
    ['a negative index', { ...valid, hairColor: -1 }],
    ['a fractional index', { ...valid, outfitColor: 1.5 }],
    ['an index as a string', { ...valid, skin: '2' }],
    ['a missing trait', { ...valid, accessory: undefined }],
    ['a css colour instead of an index', { ...valid, outfitColor: 'red; background:url(x)' }],
  ])('parseChoice rejects %s', (_, value) => {
    expect(parseChoice(value)).toBeNull()
  })
})
