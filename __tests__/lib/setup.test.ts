import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_SETUP,
  getGuestName,
  getStoredSetup,
  getSuggestedName,
  restsFor,
  storeDisplayName,
  storeSetup,
} from '@/lib/bonfire'

// Same in-memory localStorage the other lib tests use
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
  localStorageMock.clear()
})

describe('restsFor', () => {
  it('pairs focus lengths with rests', () => {
    expect(restsFor(25)).toEqual({ short: 5, long: 15 })
    expect(restsFor(30)).toEqual({ short: 5, long: 15 })
    expect(restsFor(45)).toEqual({ short: 10, long: 20 })
    expect(restsFor(60)).toEqual({ short: 10, long: 20 })
    expect(restsFor(90)).toEqual({ short: 15, long: 30 })
  })
})

describe('home setup storage', () => {
  it('defaults to 25 minutes and 4 rounds', () => {
    expect(getStoredSetup()).toEqual(DEFAULT_SETUP)
    expect(DEFAULT_SETUP).toEqual({ focus: 25, rounds: 4 })
  })
  it('round-trips a valid setup', () => {
    storeSetup({ focus: 50, rounds: 3 })
    expect(getStoredSetup()).toEqual({ focus: 50, rounds: 3 })
  })
  it('ignores out-of-range or corrupt values', () => {
    localStorage.setItem('bonfire_setup', JSON.stringify({ focus: 500, rounds: 0 }))
    expect(getStoredSetup()).toEqual(DEFAULT_SETUP)
    localStorage.setItem('bonfire_setup', '{not json')
    expect(getStoredSetup()).toEqual(DEFAULT_SETUP)
  })
})

describe('guest identity', () => {
  it('is generated once and kept', () => {
    const first = getGuestName()
    expect(first).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/)
    expect(getGuestName()).toBe(first)
  })
  it('suggests the last chosen name before the guest name', () => {
    const guest = getGuestName()
    expect(getSuggestedName()).toBe(guest)
    storeDisplayName('Mira')
    expect(getSuggestedName()).toBe('Mira')
  })
})
