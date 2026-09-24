/**
 * Small illustrated desk objects scattered around the home viewport.
 * Outer wrapper: position + rotation. Inner element: gentle drift.
 * Pale blue, with a few warm accents.
 */

const STROKE = { stroke: 'var(--obj-stroke)', strokeWidth: 1.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

function Notebook() {
  return (
    <svg width="92" height="110" viewBox="0 0 80 96" fill="none">
      <rect x="12" y="6" width="58" height="84" rx="6" fill="var(--obj-fill)" {...STROKE} />
      <rect x="26" y="22" width="32" height="15" rx="3" fill="var(--obj-fill-2)" {...STROKE} />
      <path d="M31 28h22M31 32h14" {...STROKE} />
      {[14, 24, 34, 44, 54, 64, 74].map(y => (
        <path key={y} d={`M8 ${y}c0-3 7-3 7 0s-7 3-7 0`} fill="var(--obj-fill-2)" {...STROKE} />
      ))}
      <path d="M56 88v8l4-3 4 3v-8" fill="var(--obj-warm)" />
    </svg>
  )
}

function Pencil() {
  return (
    <svg width="22" height="112" viewBox="0 0 20 110" fill="none">
      <rect x="4" y="1" width="12" height="7" rx="2.5" fill="var(--obj-warm)" />
      <rect x="4" y="7" width="12" height="7" fill="var(--obj-fill)" {...STROKE} />
      <rect x="4" y="14" width="12" height="74" fill="var(--obj-fill-2)" {...STROKE} />
      <path d="M8 14v74M12 14v74" stroke="var(--obj-stroke)" strokeWidth="0.8" opacity="0.6" />
      <path d="M4 88h12l-6 18z" fill="var(--obj-fill)" {...STROKE} />
      <path d="M8.2 100.5h3.6L10 106z" fill="var(--obj-stroke)" />
    </svg>
  )
}

function Headphones() {
  return (
    <svg width="104" height="96" viewBox="0 0 104 96" fill="none">
      <path d="M16 60C16 30 32 12 52 12s36 18 36 48" stroke="var(--obj-stroke)" strokeWidth="6" strokeLinecap="round" />
      <path d="M16 60C16 30 32 12 52 12s36 18 36 48" stroke="var(--obj-fill-2)" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="6" y="52" width="20" height="32" rx="10" fill="var(--obj-fill)" {...STROKE} />
      <rect x="78" y="52" width="20" height="32" rx="10" fill="var(--obj-fill)" {...STROKE} />
      <rect x="21" y="57" width="6" height="22" rx="3" fill="var(--obj-warm)" opacity="0.85" />
      <rect x="77" y="57" width="6" height="22" rx="3" fill="var(--obj-warm)" opacity="0.85" />
    </svg>
  )
}

function Mug() {
  return (
    <svg width="84" height="92" viewBox="0 0 84 92" fill="none">
      <g className="bf-steam">
        <path d="M28 22c-4-5 4-8 0-14M38 20c-4-5 4-8 0-14M48 22c-4-5 4-8 0-14" {...STROKE} opacity="0.8" />
      </g>
      <path d="M58 44h6a10 10 0 0 1 0 20h-6" {...STROKE} strokeWidth={2} />
      <path d="M14 32h46v40a12 12 0 0 1-12 12H26a12 12 0 0 1-12-12z" fill="var(--obj-fill-2)" {...STROKE} />
      <ellipse cx="37" cy="32" rx="23" ry="5" fill="var(--obj-fill)" {...STROKE} />
      <ellipse cx="37" cy="33" rx="18" ry="3" fill="var(--obj-warm)" opacity="0.55" />
      <path d="M22 56h30" stroke="var(--obj-warm)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

function Books() {
  return (
    <svg width="120" height="84" viewBox="0 0 120 84" fill="none">
      <rect x="10" y="56" width="100" height="20" rx="3" fill="var(--obj-fill)" {...STROKE} />
      <path d="M18 62h78M18 70h78" stroke="var(--obj-stroke)" strokeWidth="0.8" opacity="0.5" />
      <rect x="22" y="36" width="84" height="20" rx="3" fill="var(--obj-fill-2)" {...STROKE} />
      <rect x="30" y="36" width="8" height="20" fill="var(--obj-warm)" opacity="0.8" />
      <rect x="16" y="16" width="80" height="20" rx="3" fill="var(--obj-fill)" {...STROKE} />
      <path d="M26 22h40M26 28h28" {...STROKE} opacity="0.7" />
    </svg>
  )
}

function Paper() {
  return (
    <svg width="76" height="92" viewBox="0 0 76 92" fill="none">
      <path d="M10 6h40l16 16v62a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" fill="var(--obj-fill-2)" {...STROKE} />
      <path d="M50 6v12a4 4 0 0 0 4 4h12" fill="var(--obj-fill)" {...STROKE} />
      <rect x="14" y="34" width="7" height="7" rx="1.5" {...STROKE} />
      <path d="M15.5 37.5l2 2 3.5-4" stroke="var(--obj-warm)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 38h28" {...STROKE} />
      <rect x="14" y="50" width="7" height="7" rx="1.5" {...STROKE} />
      <path d="M26 54h22" {...STROKE} />
      <rect x="14" y="66" width="7" height="7" rx="1.5" {...STROKE} />
      <path d="M26 70h26" {...STROKE} />
    </svg>
  )
}

const OBJECTS = [
  { name: 'notebook', Comp: Notebook, rot: -10, w: 92, delay: 0 },
  { name: 'pencil', Comp: Pencil, rot: 28, w: 22, delay: -2.2 },
  { name: 'headphones', Comp: Headphones, rot: 9, w: 104, delay: -4.5 },
  { name: 'mug', Comp: Mug, rot: -4, w: 84, delay: -1.3 },
  { name: 'books', Comp: Books, rot: 3, w: 120, delay: -6.1 },
  { name: 'paper', Comp: Paper, rot: 8, w: 76, delay: -3.4 },
] as const

export function HomeObjects() {
  return (
    <div aria-hidden="true">
      {OBJECTS.map(({ name, Comp, rot, w, delay }) => (
        <div
          key={name}
          className={`bf-obj bf-obj--${name}`}
          style={{ '--rot': `${rot}deg`, '--w': w } as React.CSSProperties}
        >
          <div className="bf-obj-drift" style={{ animationDelay: `${delay}s` }}>
            <Comp />
          </div>
        </div>
      ))}
    </div>
  )
}
