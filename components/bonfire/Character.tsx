'use client'

import { useId } from 'react'
import { shade, type CharacterLook, type HairStyle, type Accessory } from '@/lib/characters'
import type { SeatPose } from '@/lib/seats'

/**
 * A small seated figure, drawn so it faces the fire:
 *  - side: fire to their right (mirrored for seats on the right of the fire)
 *  - front: fire below them on screen (the far side of the circle), we see their face
 *  - back: fire above them on screen (the near side), we see their back
 *
 * A warm rim light falls on the fire-facing side and a cool shadow on the other.
 * The light is a gradient masked to the figure's silhouette, so it follows
 * whatever hair and accessory variation the person has.
 */

interface Paint {
  body: string
  bodyShade: string
  legs: string
  skin: string
  hair: string
  hat: string
  hatBand: string
  accent: string
  ink: string
  shoe: string
  phones: string
}

interface PartsProps {
  p: Paint
  hair: HairStyle
  accessory: Accessory
}

const INK = '#2A3140'
const SHOE = '#2E3440'
const PHONES = '#3B4252'

// ─── Side (facing right) ───────────────────────────────────────

function SideHair({ p, hair }: { p: Paint; hair: HairStyle }) {
  const short = (
    <path
      d="M13.5 22C13 14 19 11 24 12C29 12.5 31.5 16 31 18.5C27.5 16.5 23 17 20.5 20.5C19.5 22 18.5 25 16 26C14.5 25 13.7 23.5 13.5 22Z"
      fill={p.hair}
    />
  )
  if (hair === 'long') {
    return (
      <>
        <path d="M13.8 20C12.4 27 12.8 33.5 14.8 38.5L20.6 37.4C19.4 32 19.6 26.5 20.8 21.5Z" fill={p.hair} />
        {short}
      </>
    )
  }
  if (hair === 'bun') {
    return (
      <>
        <circle cx="15" cy="14.5" r="4.2" fill={p.hair} />
        {short}
      </>
    )
  }
  if (hair === 'beanie') {
    return (
      <>
        <path d="M13.8 22C13.8 25 15 26.5 16.5 26.8C17.8 24.5 18 22.5 17.6 21Z" fill={p.hair} />
        <path d="M13 21.5C12.6 13 18.5 10 23 10C28 10 32.3 13.5 32 19.2Z" fill={p.hat} />
        <path d="M12.6 20.2L32.3 17.9L32.7 21.3L13 23.8Z" fill={p.hatBand} />
        <circle cx="21" cy="9.2" r="2.6" fill={p.hat} />
      </>
    )
  }
  return short
}

function SideParts({ p, hair, accessory }: PartsProps) {
  return (
    <>
      {/* leg, knee up towards the fire */}
      <path d="M19 55.5L33.5 49L36.5 61" stroke={p.legs} strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="38.6" cy="62.4" rx="4.2" ry="2.3" fill={p.shoe} />
      {/* torso */}
      <path d="M11 57.5C9 47 10.2 36 17 31C22 27.8 28.2 30 30.2 36C32.2 42 32 50 30.4 57.5Z" fill={p.body} />
      {/* arm resting on the knee */}
      <path d="M22.5 36C26.5 42 29.5 46 33.6 48.6" stroke={p.bodyShade} strokeWidth="5.4" strokeLinecap="round" fill="none" />
      <circle cx="35" cy="49.2" r="2.6" fill={p.skin} />
      {accessory === 'scarf' && (
        <>
          <path d="M16 30C20 32.6 26 32.2 29.2 29.6L29.7 33.2C26 35.8 20 36.2 16.4 33.6Z" fill={p.accent} />
          <path d="M18.2 33.4L16.6 40.5L20 40.6L20.8 34.2Z" fill={p.accent} />
        </>
      )}
      {/* head */}
      <circle cx="22" cy="22" r="8.5" fill={p.skin} />
      <circle cx="30.2" cy="23.4" r="1.4" fill={p.skin} />
      <path d="M26.2 21.6q1.2 .9 2.4 0" stroke={p.ink} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <SideHair p={p} hair={hair} />
      {accessory === 'headphones' && hair !== 'beanie' && (
        <>
          <path d="M14.2 20.5C14.2 10.8 29.8 10.8 29.8 18.5" stroke={p.phones} strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="19.8" cy="22.8" rx="3" ry="4" fill={p.phones} />
        </>
      )}
    </>
  )
}

// ─── Front (facing the viewer, fire in front of them) ─────────

function FrontHair({ p, hair }: { p: Paint; hair: HairStyle }) {
  const fringe = (
    <path d="M21 21C21 13 25.5 10.8 30 10.8C35 10.8 39 14 39 20.5C36 17.2 32.4 16.4 29.4 17.8C26.4 19.2 23.4 19.6 21 21Z" fill={p.hair} />
  )
  if (hair === 'long') {
    return (
      <>
        <path d="M21.2 18.5C19 26 19.2 33 21 37L24.4 36C23.2 30.5 23.2 25 23.8 20.5Z" fill={p.hair} />
        <path d="M38.8 18.5C41 26 40.8 33 39 37L35.6 36C36.8 30.5 36.8 25 36.2 20.5Z" fill={p.hair} />
        {fringe}
      </>
    )
  }
  if (hair === 'bun') {
    return (
      <>
        <circle cx="30" cy="10.6" r="4.2" fill={p.hair} />
        {fringe}
      </>
    )
  }
  if (hair === 'beanie') {
    return (
      <>
        <path d="M20.6 20.5C20.6 12.2 25 9.4 30 9.4C35 9.4 39.4 12.2 39.4 20.5Z" fill={p.hat} />
        <rect x="20" y="18.2" width="20" height="3.8" rx="1.9" fill={p.hatBand} />
        <circle cx="30" cy="8.4" r="2.6" fill={p.hat} />
      </>
    )
  }
  return fringe
}

function FrontParts({ p, hair, accessory }: PartsProps) {
  return (
    <>
      {/* crossed legs */}
      <path d="M9 60C11 52.4 20 50.4 30 53.2C40 50.4 49 52.4 51 60C45 63.6 15 63.6 9 60Z" fill={p.legs} />
      {/* torso */}
      <path d="M17 56.5C15.5 45 18 35 30 33C42 35 44.5 45 43 56.5Z" fill={p.body} />
      {/* arms to the lap */}
      <path d="M20.5 40C18.6 47 20.2 52 25 54" stroke={p.bodyShade} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M39.5 40C41.4 47 39.8 52 35 54" stroke={p.bodyShade} strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="26.2" cy="54.2" r="2.5" fill={p.skin} />
      <circle cx="33.8" cy="54.2" r="2.5" fill={p.skin} />
      {accessory === 'scarf' && (
        <path d="M22 32C26 35 34 35 38 32L38.5 35.6C34 38.6 26 38.6 21.5 35.6Z" fill={p.accent} />
      )}
      {/* head, eyes closed, calm */}
      <circle cx="30" cy="22" r="9" fill={p.skin} />
      <path d="M25.4 23.2q1.5 1.1 3 0M31.6 23.2q1.5 1.1 3 0" stroke={p.ink} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <FrontHair p={p} hair={hair} />
      {accessory === 'headphones' && hair !== 'beanie' && (
        <>
          <path d="M20.6 22C20.6 9.6 39.4 9.6 39.4 22" stroke={p.phones} strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="20.6" cy="23" rx="2.6" ry="3.8" fill={p.phones} />
          <ellipse cx="39.4" cy="23" rx="2.6" ry="3.8" fill={p.phones} />
        </>
      )}
    </>
  )
}

// ─── Back (facing away from the viewer, towards the fire) ─────

function BackHair({ p, hair }: { p: Paint; hair: HairStyle }) {
  const cap = (
    <path d="M21 23C20 14 25 11.4 30 11.4C35 11.4 40 14 39 23C38 28 35 30.4 30 30.4C25 30.4 22 28 21 23Z" fill={p.hair} />
  )
  if (hair === 'long') {
    return <path d="M20.6 22C20 13 25 11 30 11C35 11 40 13 39.4 22L40.4 38.5C35 40.4 25 40.4 19.6 38.5Z" fill={p.hair} />
  }
  if (hair === 'bun') {
    return (
      <>
        {cap}
        <circle cx="30" cy="14.6" r="4.4" fill={p.hair} />
      </>
    )
  }
  if (hair === 'beanie') {
    return (
      <>
        {cap}
        <path d="M20.6 20.5C20.6 12.2 25 9.4 30 9.4C35 9.4 39.4 12.2 39.4 20.5Z" fill={p.hat} />
        <rect x="20" y="18.2" width="20" height="3.8" rx="1.9" fill={p.hatBand} />
        <circle cx="30" cy="8.4" r="2.6" fill={p.hat} />
      </>
    )
  }
  return cap
}

function BackParts({ p, hair, accessory }: PartsProps) {
  return (
    <>
      {/* elbows peeking out, arms around knees in front */}
      <ellipse cx="15.6" cy="50" rx="2.8" ry="5" fill={p.bodyShade} />
      <ellipse cx="44.4" cy="50" rx="2.8" ry="5" fill={p.bodyShade} />
      {/* back */}
      <path d="M16 58C14.5 46 17.5 35 30 33C42.5 35 45.5 46 44 58Z" fill={p.body} />
      {accessory === 'scarf' && (
        <path d="M21.5 32C26 34.6 34 34.6 38.5 32L38.5 35.6C34 37.6 26 37.6 21.5 35.6Z" fill={p.accent} />
      )}
      <circle cx="30" cy="22" r="9" fill={p.skin} />
      <BackHair p={p} hair={hair} />
      {accessory === 'headphones' && hair !== 'beanie' && (
        <>
          <path d="M20.6 22C20.6 9.6 39.4 9.6 39.4 22" stroke={p.phones} strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="20.4" cy="23" rx="2.4" ry="3.8" fill={p.phones} />
          <ellipse cx="39.6" cy="23" rx="2.4" ry="3.8" fill={p.phones} />
        </>
      )}
    </>
  )
}

// ─── Character ─────────────────────────────────────────────────

const PARTS = { side: SideParts, front: FrontParts, back: BackParts }

// Where the fire is relative to the figure decides the light direction:
// side → from the right, front → from below, back → from above.
const LIGHT = {
  side: { x1: 0, y1: 0, x2: 1, y2: 0, stops: [['cool', 0.34, 0], ['cool', 0, 0.45], ['glow', 0, 0.55], ['glow', 0.85, 1]] },
  front: { x1: 0, y1: 0, x2: 0, y2: 1, stops: [['cool', 0.26, 0], ['cool', 0, 0.38], ['glow', 0, 0.48], ['glow', 0.62, 1]] },
  back: { x1: 0, y1: 0, x2: 0, y2: 1, stops: [['glow', 0.7, 0], ['glow', 0, 0.42], ['cool', 0, 0.55], ['cool', 0.34, 1]] },
} as const

const WHITE: Paint = {
  body: '#fff', bodyShade: '#fff', legs: '#fff', skin: '#fff', hair: '#fff', hat: '#fff',
  hatBand: '#fff', accent: '#fff', ink: 'transparent', shoe: '#fff', phones: '#fff',
}

interface CharacterProps {
  look: CharacterLook
  pose: SeatPose
}

export function Character({ look, pose }: CharacterProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const view = pose === 'front' ? 'front' : pose === 'back' ? 'back' : 'side'
  const Parts = PARTS[view]
  const light = LIGHT[view]

  const paint: Paint = {
    body: look.body,
    bodyShade: shade(look.body, -0.14),
    legs: look.legs,
    skin: look.skin,
    hair: look.hair,
    hat: look.hat,
    hatBand: shade(look.hat, -0.2),
    accent: look.accent,
    ink: INK,
    shoe: SHOE,
    phones: PHONES,
  }

  return (
    <svg className="bf-character" width="56" height="64" viewBox="0 0 60 68" aria-hidden="true">
      <defs>
        <linearGradient id={`rim-${id}`} x1={light.x1} y1={light.y1} x2={light.x2} y2={light.y2}>
          {light.stops.map(([tone, opacity, offset], i) => (
            <stop
              key={i}
              offset={offset}
              style={{
                stopColor: tone === 'glow' ? 'rgb(var(--glow-rgb))' : 'rgb(var(--cool-rgb))',
                stopOpacity: opacity,
              }}
            />
          ))}
        </linearGradient>
        <mask id={`sil-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="60" height="68">
          <Parts p={WHITE} hair={look.hairStyle} accessory={look.accessory} />
        </mask>
      </defs>

      <g transform={pose === 'side-left' ? 'translate(60 0) scale(-1 1)' : undefined}>
        {/* contact shadow and the log they sit on */}
        <ellipse cx="30" cy="65.2" rx="21" ry="2.4" style={{ fill: 'rgba(var(--cool-rgb), 0.18)' }} />
        {view === 'side' ? (
          <>
            <rect x="5" y="55.5" width="31" height="9" rx="4.5" fill="var(--log)" />
            <ellipse cx="35.2" cy="60" rx="2.8" ry="4.5" fill="var(--log-end)" />
          </>
        ) : (
          <rect x="12" y="57.5" width="36" height="8" rx="4" fill="var(--log)" />
        )}

        <g className="bf-breathe">
          <Parts p={paint} hair={look.hairStyle} accessory={look.accessory} />
          <rect
            className="bf-rim"
            x="0"
            y="0"
            width="60"
            height="68"
            fill={`url(#rim-${id})`}
            mask={`url(#sil-${id})`}
          />
        </g>
      </g>
    </svg>
  )
}
