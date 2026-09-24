'use client'

import { useEffect, useRef } from 'react'

export interface FireSceneProps {
  targetIntensity: number
  isSurging: boolean
  mode: 'focus' | 'short' | 'long'
}

interface FlameConfig {
  id: number
  xOffset: number
  yOffset: number
  baseWidth: number
  baseHeight: number
  floatDur: number
  floatPhase: number
  pulseDur: number
  pulsePhase: number
  flickerDur: number
  flickerPhase: number
  minIntensity: number
  zIndex: number
}

// Sizes are for the 160×180 fire; flame bases sit on the log pile.
const FLAME_CONFIGS: FlameConfig[] = [
  { id: 0, xOffset: 0,   yOffset: 0,  baseWidth: 34, baseHeight: 64, floatDur: 3.5, floatPhase: 0,    pulseDur: 3.0, pulsePhase: 0,    flickerDur: 2.0, flickerPhase: 0,    minIntensity: 0.04, zIndex: 5 },
  { id: 1, xOffset: -16, yOffset: 5,  baseWidth: 25, baseHeight: 48, floatDur: 3.5, floatPhase: 0.85, pulseDur: 3.0, pulsePhase: 1.4,  flickerDur: 2.0, flickerPhase: 1.2,  minIntensity: 0.22, zIndex: 3 },
  { id: 2, xOffset: 16,  yOffset: 5,  baseWidth: 25, baseHeight: 48, floatDur: 3.5, floatPhase: 1.6,  pulseDur: 3.0, pulsePhase: 0.7,  flickerDur: 2.0, flickerPhase: 2.1,  minIntensity: 0.22, zIndex: 3 },
  { id: 3, xOffset: -9,  yOffset: 11, baseWidth: 19, baseHeight: 36, floatDur: 3.5, floatPhase: 2.3,  pulseDur: 3.0, pulsePhase: 2.0,  flickerDur: 2.0, flickerPhase: 0.8,  minIntensity: 0.42, zIndex: 2 },
  { id: 4, xOffset: 9,   yOffset: 11, baseWidth: 19, baseHeight: 36, floatDur: 3.5, floatPhase: 3.05, pulseDur: 3.0, pulsePhase: 2.7,  flickerDur: 2.0, flickerPhase: 1.6,  minIntensity: 0.42, zIndex: 2 },
]

const MODE_MULT: Record<string, number> = { focus: 1, short: 1.6, long: 2.3 }

// Fire ring: stones on an ellipse around the base. Back stones are drawn
// behind the flames, front stones in front of them.
const RING_CX = 80
const RING_CY = 158
const RING_RX = 60
const RING_RY = 15

interface Stone { x: number; y: number; rx: number; ry: number; back: boolean }

const STONES: Stone[] = [0, 32, 66, 98, 130, 162, 196, 228, 262, 294, 326].map((deg, i) => {
  const rad = (deg * Math.PI) / 180
  return {
    x: RING_CX + RING_RX * Math.cos(rad),
    y: RING_CY + RING_RY * Math.sin(rad),
    rx: 6.4 + (i % 3) * 1.3,
    ry: 4.4 + (i % 2) * 0.7,
    back: Math.sin(rad) < 0,
  }
})

function Stones({ back }: { back: boolean }) {
  return (
    <>
      {STONES.filter(s => s.back === back).map((s, i) => (
        <g key={i}>
          <ellipse cx={s.x} cy={s.y + 1.5} rx={s.rx} ry={s.ry} fill="var(--stone-shade)" />
          <ellipse cx={s.x} cy={s.y} rx={s.rx} ry={s.ry - 0.8} fill="var(--stone)" />
          {/* firelight on the faces that look at the fire */}
          <ellipse
            cx={s.x}
            cy={s.y + (back ? 1 : -1.5)}
            rx={s.rx * 0.75}
            ry={(s.ry - 0.8) * 0.55}
            style={{ fill: 'rgb(var(--glow-rgb))', opacity: `calc(${back ? 0.55 : 0.25} * var(--bf-intensity))` }}
          />
        </g>
      ))}
    </>
  )
}

/** Flame silhouette with a pointed tip, in the flame's own pixel box. */
function flamePath(w: number, h: number): string {
  const f = (n: number) => n.toFixed(1)
  return `path('M${f(w * 0.5)} 0 C${f(w * 0.58)} ${f(h * 0.22)} ${f(w)} ${f(h * 0.42)} ${f(w)} ${f(h * 0.7)} ` +
    `C${f(w)} ${f(h * 0.9)} ${f(w * 0.78)} ${f(h)} ${f(w * 0.5)} ${f(h)} ` +
    `C${f(w * 0.22)} ${f(h)} 0 ${f(h * 0.9)} 0 ${f(h * 0.7)} ` +
    `C0 ${f(h * 0.42)} ${f(w * 0.42)} ${f(h * 0.22)} ${f(w * 0.5)} 0 Z')`
}

function Log({ angle, y }: { angle: number; y: number }) {
  return (
    <g transform={`rotate(${angle} 80 ${y + 5})`}>
      <rect x="42" y={y} width="76" height="11" rx="5.5" fill="var(--log)" />
      <rect x="46" y={y + 1.2} width="66" height="3" rx="1.5" fill="var(--log-top)" opacity="0.8" />
      <ellipse cx="117" cy={y + 5.5} rx="3.2" ry="5.5" fill="var(--log-end)" />
      <ellipse cx="117" cy={y + 5.5} rx="1.5" ry="2.8" fill="var(--log)" opacity="0.35" />
    </g>
  )
}

interface EmberConfig {
  xOffset: number
  delay: number
  duration: number
  size: number
}

const EMBER_CONFIGS: EmberConfig[] = [
  { xOffset: -3, delay: 0,   duration: 3.0, size: 2.5 },
  { xOffset: 2,  delay: 0.7, duration: 2.6, size: 2   },
  { xOffset: -1, delay: 1.4, duration: 3.3, size: 2.7 },
  { xOffset: 4,  delay: 2.0, duration: 2.8, size: 1.8 },
  { xOffset: -5, delay: 2.6, duration: 3.1, size: 2.2 },
]

const KEYFRAMES_CSS = `
  @keyframes bf-float {
    0%, 100% { transform: translate(-50%, 0) scaleY(1) scaleX(1); }
    50%      { transform: translate(-50%, -4px) scaleY(1.04) scaleX(0.96); }
  }
  @keyframes bf-pulse {
    0%, 100% { transform: translate(-50%, 0) scale(1); }
    50%      { transform: translate(-50%, 0) scale(1.03); }
  }
  @keyframes bf-flicker {
    0%   { opacity: 0.88; }
    25%  { opacity: 0.93; }
    55%  { opacity: 0.84; }
    100% { opacity: 0.88; }
  }
  @keyframes bf-ember-rise {
    0%   { transform: translate(-50%, 0); opacity: 0; }
    12%  { opacity: 0.7; }
    75%  { opacity: 0.25; }
    100% { transform: translate(calc(-50% + 4px), -80px); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bf-flame-inner {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`

let _injected = false
function injectKeyframes() {
  if (_injected || typeof document === 'undefined') return
  _injected = true
  const el = document.createElement('style')
  el.textContent = KEYFRAMES_CSS
  document.head.appendChild(el)
}

export function FireScene({ targetIntensity, isSurging, mode }: FireSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const modeMult = MODE_MULT[mode] ?? 1

  useEffect(() => { injectKeyframes() }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const s = el.style
    const intensity = Math.max(0, Math.min(1, targetIntensity))

    s.setProperty('--bf-surge', isSurging ? '1' : '0')
    s.setProperty('--bf-scale', String((1 + (isSurging ? 0.08 : 0)) * (0.35 + intensity * 0.75)))
    s.setProperty('--bf-intensity', String(intensity))
    s.setProperty('--bf-mode-mult', String(modeMult))
  })

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="bf-fire-scene"
      style={{
        width: '160px',
        height: '180px',
        position: 'relative',
        '--bf-intensity': '0.5',
        '--bf-scale': '0.7',
        '--bf-surge': '0',
        '--bf-mode-mult': '1',
      } as React.CSSProperties}
    >
      {/* Ember bed: warmth pooled under the logs, brighter for a moment when a focus completes */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '150px',
          width: '96px',
          height: '26px',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(closest-side, rgba(255, 196, 110, 0.95), rgba(var(--glow-rgb), 0.55) 45%, rgba(var(--glow-rgb), 0) 100%)',
          opacity: 'calc(0.35 + var(--bf-intensity) * 0.6 + var(--bf-surge) * 0.25)',
          transition: 'opacity 1s ease',
        }}
      />

      <svg width="160" height="180" viewBox="0 0 160 180" style={{ position: 'absolute', inset: 0 }}>
        <Stones back />
        <Log angle={-11} y={144} />
        <Log angle={12} y={144} />
      </svg>

      {/* Flames (engine unchanged: CSS variables drive scale, fade and speed) */}
      <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translate(-50%, 0)', width: '96px', height: '128px' }}>
        {FLAME_CONFIGS.map((flame) => {
          const thresholdFade = `max(0, min(1, (var(--bf-intensity) - ${flame.minIntensity}) / 0.15))`
          return (
            <div
              key={flame.id}
              style={{
                position: 'absolute',
                left: 'calc(50% + ' + flame.xOffset + 'px)',
                bottom: flame.yOffset + 'px',
                width: flame.baseWidth + 'px',
                height: flame.baseHeight + 'px',
                zIndex: flame.zIndex,
                transformOrigin: 'center bottom',
                opacity: `calc(${thresholdFade})`,
                transform: 'translate(-50%, 0) scale(var(--bf-scale))',
                transition: 'opacity 0.6s, transform 0.8s ease',
              }}
            >
              <div
                className="bf-flame-inner"
                style={{
                  position: 'absolute',
                  inset: 0,
                  transformOrigin: 'center bottom',
                  animation: [
                    `bf-float calc(${flame.floatDur}s * var(--bf-mode-mult)) ease-in-out calc(${-flame.floatPhase}s * var(--bf-mode-mult)) infinite`,
                    `bf-pulse calc(${flame.pulseDur}s * var(--bf-mode-mult)) ease-in-out calc(${-flame.pulsePhase}s * var(--bf-mode-mult)) infinite`,
                    `bf-flicker calc(${flame.flickerDur}s * var(--bf-mode-mult)) ease-in-out calc(${-flame.flickerPhase}s * var(--bf-mode-mult)) infinite`,
                  ].join(', '),
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: flamePath(flame.baseWidth, flame.baseHeight),
                    background: 'linear-gradient(to top, #EE5E18 0%, #FF8A2A 30%, #FFBE48 66%, #FFE7A8 100%)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '26%',
                    bottom: '6%',
                    width: '48%',
                    height: '52%',
                    borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%',
                    background: 'radial-gradient(ellipse at center bottom, #FFF8DC 0%, #FFD36A 60%, transparent 100%)',
                    filter: 'blur(1.5px)',
                    opacity: 0.9,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <svg width="160" height="180" viewBox="0 0 160 180" style={{ position: 'absolute', inset: 0, zIndex: 6 }}>
        <Stones back={false} />
      </svg>

      {/* Embers */}
      <div style={{ position: 'absolute', bottom: '44px', left: '50%', transform: 'translate(-50%, 0)', width: '40px', height: '110px', pointerEvents: 'none', zIndex: 7 }}>
        {EMBER_CONFIGS.map((ember, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 'calc(50% + ' + ember.xOffset + 'px)',
              bottom: '30%',
              width: ember.size + 'px',
              height: ember.size + 'px',
              borderRadius: '50%',
              backgroundColor: '#FFB84D',
              boxShadow: '0 0 3px 1px rgba(255, 180, 70, 0.5)',
              opacity: 0,
              animation: `bf-ember-rise ${ember.duration}s ease-out ${ember.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
