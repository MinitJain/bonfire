/**
 * The one Bonfire identity: a flame mark, the palette, and invitation copy.
 * Used by the favicon (static and dynamic), app icons, OG images and metadata.
 * app/icon.svg is a static copy of the same mark; keep them in sync.
 */

export const BRAND = {
  name: 'Bonfire',
  tagline: 'A quiet place to focus together.',
  dusk: '#1B2636',       // mark background / dark surfaces
  duskDeep: '#141C28',   // dark theme background
  pale: '#EDF2F7',       // light theme background
  paleTop: '#E2EAF3',
  slate: '#22324A',      // text on pale
  slateSoft: '#53657B',
  fire: '#E07A2E',       // primary orange
  ember: '#F6A24E',
  flameCore: '#FFE3A6',
} as const

/** Flame mark paths in a 64×64 box. */
export const FLAME_OUTER =
  'M32 6C36 16 48 24 48 38C48 48 41 56 32 56C23 56 16 48 16 38C16 30 21 25 24 19C25 25 28 28 30 29C29 22 30 13 32 6Z'
export const FLAME_INNER =
  'M32 28C35 34 40 38 40 44C40 50 36 53 32 53C28 53 24 50 24 44C24 39 29 35 32 28Z'

/** Standalone SVG of the mark on a rounded dusk tile (favicon / icons). */
export function markSvg({ rounded = true }: { rounded?: boolean } = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="f" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${BRAND.fire}"/>
      <stop offset="1" stop-color="${BRAND.ember}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="${BRAND.dusk}"/>
  <path d="${FLAME_OUTER}" fill="url(#f)"/>
  <path d="${FLAME_INNER}" fill="${BRAND.flameCore}"/>
</svg>`
}

export const INVITE_DESCRIPTION = BRAND.tagline

const clean = (value: string | null | undefined, max = 40) => {
  const v = (value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  return v.length > 0 ? v : null
}

/**
 * "Alex is inviting you to Deep Work" / "Alex is inviting you to a Bonfire".
 * Built only from values stored on the Bonfire (initiator_name, name).
 */
export function inviteTitle(initiatorName: string | null | undefined, bonfireName: string | null | undefined): string {
  const who = clean(initiatorName) ?? 'Someone'
  const what = clean(bonfireName) ?? 'a Bonfire'
  return `${who} is inviting you to ${what}`
}
