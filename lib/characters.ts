/**
 * Deterministic character appearance derived from a participant's presence key.
 * The same person looks the same on every client and across refreshes.
 */

export const BUILDS = ['neutral', 'feminine', 'masculine'] as const
export const HAIR_STYLE_OPTIONS = ['short', 'long', 'bun', 'buzz', 'beanie'] as const
export const OUTFITS = ['sweater', 'hoodie', 'jacket'] as const
export const ACCESSORY_OPTIONS = ['none', 'scarf', 'headphones', 'glasses'] as const

export type Build = (typeof BUILDS)[number]
export type HairStyle = (typeof HAIR_STYLE_OPTIONS)[number]
export type Outfit = (typeof OUTFITS)[number]
export type Accessory = (typeof ACCESSORY_OPTIONS)[number]

export interface CharacterLook {
  body: string
  legs: string
  skin: string
  hair: string
  hairStyle: HairStyle
  hat: string
  accessory: Accessory
  accent: string
  build: Build
  outfit: Outfit
}

// Muted, slightly dusty tones that sit well on the pale blue scene
export const BODY = ['#7C93B0', '#8FA68E', '#B98B73', '#9C8FB0', '#C2A36B', '#6F8F91', '#A77F6C', '#8290A8']
const LEGS = ['#4A5668', '#5B5048', '#3F4C5A', '#5A5F52', '#4B4458']
export const SKIN = ['#F1CBA8', '#E3B08A', '#C98E67', '#9E6C4C', '#F5D9C0', '#B47A56']
export const HAIR = ['#2E2622', '#5A3B28', '#8A5A36', '#C9A16A', '#3B3F4A', '#A5533A']
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

function pickIndex(length: number, h: number, salt: number): number {
  // Mix the salt in so each trait varies independently
  const mixed = Math.imul(h ^ (salt * 0x9e3779b1), 0x85ebca6b) >>> 0
  return mixed % length
}

function pick<T>(list: readonly T[], h: number, salt: number): T {
  return list[pickIndex(list.length, h, salt)]
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
    build: 'neutral',
    outfit: 'sweater',
  }
}

/**
 * What a person picked in the character customizer. Colours are palette
 * indices so a saved or broadcast choice can only ever draw palette colours.
 */
export interface CharacterChoice {
  build: Build
  skin: number
  hairStyle: HairStyle
  hairColor: number
  outfit: Outfit
  outfitColor: number
  accessory: Accessory
}

/** The choice that reproduces someone's generated look, so the editor starts from it. */
export function defaultChoice(key: string): CharacterChoice {
  const h = hashKey(key)
  const accessory = pick(ACCESSORIES, h, 7)
  return {
    build: 'neutral',
    skin: pickIndex(SKIN.length, h, 3),
    hairStyle: pick(HAIR_STYLES, h, 5),
    hairColor: pickIndex(HAIR.length, h, 4),
    outfit: 'sweater',
    outfitColor: pickIndex(BODY.length, h, 1),
    accessory,
  }
}

/** Look for a participant: their choice when they made one, the generated look otherwise. */
export function lookFor(key: string, choice: CharacterChoice | null): CharacterLook {
  const base = characterLook(key)
  if (!choice) return base
  return {
    ...base,
    build: choice.build,
    skin: SKIN[choice.skin],
    hairStyle: choice.hairStyle,
    hair: HAIR[choice.hairColor],
    outfit: choice.outfit,
    body: BODY[choice.outfitColor],
    accessory: choice.accessory,
  }
}

const isIndex = (v: unknown, length: number): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < length
const isOneOf = <T extends string>(v: unknown, list: readonly T[]): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v)

/**
 * Validate a choice from an untrusted source (another client's presence,
 * localStorage, the database). Anything malformed is null, never partial.
 */
export function parseChoice(value: unknown): CharacterChoice | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (
    !isOneOf(v.build, BUILDS) ||
    !isIndex(v.skin, SKIN.length) ||
    !isOneOf(v.hairStyle, HAIR_STYLE_OPTIONS) ||
    !isIndex(v.hairColor, HAIR.length) ||
    !isOneOf(v.outfit, OUTFITS) ||
    !isIndex(v.outfitColor, BODY.length) ||
    !isOneOf(v.accessory, ACCESSORY_OPTIONS)
  ) return null
  return {
    build: v.build,
    skin: v.skin,
    hairStyle: v.hairStyle,
    hairColor: v.hairColor,
    outfit: v.outfit,
    outfitColor: v.outfitColor,
    accessory: v.accessory,
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
