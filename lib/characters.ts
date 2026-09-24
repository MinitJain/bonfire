/**
 * Deterministic character appearance derived from a participant's presence key.
 * The same person looks the same on every client and across refreshes.
 */

export type HairStyle = 'short' | 'long' | 'bun' | 'beanie'
export type Accessory = 'none' | 'scarf' | 'headphones'

export interface CharacterLook {
  body: string
  legs: string
  skin: string
  hair: string
  hairStyle: HairStyle
  hat: string
  accessory: Accessory
  accent: string
}

// Muted, slightly dusty tones that sit well on the pale blue scene
const BODY = ['#7C93B0', '#8FA68E', '#B98B73', '#9C8FB0', '#C2A36B', '#6F8F91', '#A77F6C', '#8290A8']
const LEGS = ['#4A5668', '#5B5048', '#3F4C5A', '#5A5F52', '#4B4458']
const SKIN = ['#F1CBA8', '#E3B08A', '#C98E67', '#9E6C4C', '#F5D9C0', '#B47A56']
const HAIR = ['#2E2622', '#5A3B28', '#8A5A36', '#C9A16A', '#3B3F4A', '#A5533A']
const HAT = ['#D9824F', '#6E86A6', '#C9A04F', '#8E6E8F', '#6F9A86']
const ACCENT = ['#E7A04F', '#D9824F', '#E5C06A', '#C96F55']
const HAIR_STYLES: HairStyle[] = ['short', 'long', 'bun', 'beanie', 'short', 'long']
const ACCESSORIES: Accessory[] = ['none', 'scarf', 'none', 'headphones', 'scarf', 'none']

/** FNV-1a 32-bit */
export function hashKey(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function pick<T>(list: readonly T[], h: number, salt: number): T {
  // Mix the salt in so each trait varies independently
  const mixed = Math.imul(h ^ (salt * 0x9e3779b1), 0x85ebca6b) >>> 0
  return list[mixed % list.length]
}

export function characterLook(key: string): CharacterLook {
  const h = hashKey(key)
  return {
    body: pick(BODY, h, 1),
    legs: pick(LEGS, h, 2),
    skin: pick(SKIN, h, 3),
    hair: pick(HAIR, h, 4),
    hairStyle: pick(HAIR_STYLES, h, 5),
    hat: pick(HAT, h, 6),
    accessory: pick(ACCESSORIES, h, 7),
    accent: pick(ACCENT, h, 8),
  }
}

/** Darken (amount < 0) or lighten (amount > 0) a #rrggbb colour. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const channel = (c: number) => {
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount
    return Math.max(0, Math.min(255, Math.round(v)))
  }
  const r = channel((n >> 16) & 255)
  const g = channel((n >> 8) & 255)
  const b = channel(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
