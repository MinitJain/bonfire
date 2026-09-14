'use client'

import { useEffect, useRef } from 'react'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BonfireSceneProps {
  targetIntensity: number
  isSurging: boolean
  focusCount: number
  participantCount: number
  mode: 'focus' | 'short' | 'long'
}

// ─── Flame configs ────────────────────────────────────────────────────────────
// Five flames: center dominant, two mid, two smaller behind.
// Phase offsets ensure no two flames move/pulse/flicker in sync.
// Progressive unlock: center at 0.05, mid at 0.35, back at 0.58.

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

const FLAME_CONFIGS: FlameConfig[] = [
  { id: 0, xOffset: 0,  yOffset: 0,  baseWidth: 28, baseHeight: 52, floatDur: 3.5, floatPhase: 0,    pulseDur: 3.0, pulsePhase: 0,    flickerDur: 2.0, flickerPhase: 0,    minIntensity: 0.05, zIndex: 5 },
  { id: 1, xOffset: -14, yOffset: 6,  baseWidth: 22, baseHeight: 40, floatDur: 3.5, floatPhase: 0.85, pulseDur: 3.0, pulsePhase: 1.4,  flickerDur: 2.0, flickerPhase: 1.2,  minIntensity: 0.35, zIndex: 3 },
  { id: 2, xOffset: 14,  yOffset: 6,  baseWidth: 22, baseHeight: 40, floatDur: 3.5, floatPhase: 1.6,  pulseDur: 3.0, pulsePhase: 0.7,  flickerDur: 2.0, flickerPhase: 2.1,  minIntensity: 0.35, zIndex: 3 },
  { id: 3, xOffset: -8,  yOffset: 12, baseWidth: 17, baseHeight: 30, floatDur: 3.5, floatPhase: 2.3,  pulseDur: 3.0, pulsePhase: 2.0,  flickerDur: 2.0, flickerPhase: 0.8,  minIntensity: 0.58, zIndex: 2 },
  { id: 4, xOffset: 8,   yOffset: 12, baseWidth: 17, baseHeight: 30, floatDur: 3.5, floatPhase: 3.05, pulseDur: 3.0, pulsePhase: 2.7,  flickerDur: 2.0, flickerPhase: 1.6,  minIntensity: 0.58, zIndex: 2 },
]

// ─── Mode-dependent animation multipliers ─────────────────────────────────────

const MODE_MULT: Record<string, number> = { focus: 1, short: 1.6, long: 2.3 }

// ─── Log configs ──────────────────────────────────────────────────────────────

interface LogConfig {
  x: number
  y: number
  rotation: number
  wPct: number
  hPx: number
  color: string
}

const LOG_CONFIGS: LogConfig[] = [
  { x: 0,  y: 0,  rotation: 8,  wPct: 92, hPx: 13, color: '#1C0A02' },
  { x: 1,  y: 0,  rotation: -5, wPct: 95, hPx: 14, color: '#1C0A02' },
  { x: -5, y: 11, rotation: 6,  wPct: 80, hPx: 12, color: '#241005' },
  { x: 6,  y: 11, rotation: -4, wPct: 82, hPx: 12, color: '#241005' },
  { x: -3, y: 22, rotation: 8,  wPct: 68, hPx: 11, color: '#241005' },
  { x: 4,  y: 22, rotation: -4, wPct: 70, hPx: 11, color: '#241005' },
  { x: -2, y: 32, rotation: 3,  wPct: 56, hPx: 10, color: '#241005' },
  { x: 2,  y: 32, rotation: -6, wPct: 58, hPx: 10, color: '#241005' },
]

// ─── Ember configs ────────────────────────────────────────────────────────────

interface EmberConfig {
  xOffset: number
  delay: number
  duration: number
  size: number
}

const EMBER_CONFIGS: EmberConfig[] = [
  { xOffset: -4, delay: 0,   duration: 3.0, size: 3   },
  { xOffset: 3,  delay: 0.7, duration: 2.6, size: 2.5 },
  { xOffset: -1, delay: 1.4, duration: 3.3, size: 3.2 },
  { xOffset: 5,  delay: 2.0, duration: 2.8, size: 2   },
  { xOffset: -6, delay: 2.6, duration: 3.1, size: 2.7 },
]

// ─── CSS Keyframes (injected once) ────────────────────────────────────────────

const KEYFRAMES_CSS = `
  @keyframes bf-float {
    0%, 100% { transform: translate(-50%, 0) scaleY(1) scaleX(1); }
    50%      { transform: translate(-50%, -5px) scaleY(1.04) scaleX(0.96); }
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
    12%  { opacity: 0.75; }
    75%  { opacity: 0.3; }
    100% { transform: translate(calc(-50% + 5px), -90px); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bf-flame-inner {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`

let _injectedStyles = false
function injectKeyframes() {
  if (_injectedStyles || typeof document === 'undefined') return
  _injectedStyles = true
  const el = document.createElement('style')
  el.textContent = KEYFRAMES_CSS
  document.head.appendChild(el)
}

// ─── BonfireScene (main export) ───────────────────────────────────────────────
// CSS-only animation. React sets CSS custom properties when props change;
// CSS transitions and keyframes handle everything else. No rAF, no per-frame JS.

export function BonfireScene({ targetIntensity, isSurging, focusCount, mode }: BonfireSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const logCount = Math.min(2 + focusCount, 8)
  const modeMult = MODE_MULT[mode] ?? 1

  useEffect(() => { injectKeyframes() }, [])

  // Sync props -> CSS custom properties. Transitions handle smoothing.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const s = el.style

    const intensity = Math.max(0, Math.min(1, targetIntensity))

    // Surge: map boolean directly to 0/1, CSS transition handles easing
    s.setProperty('--bf-surge', isSurging ? '1' : '0')

    // Flame scale: intensity ramp * surge boost (surge adds up to 10%)
    const scale = (1.0 + (isSurging ? 0.10 : 0)) * (0.25 + intensity * 0.75)
    s.setProperty('--bf-scale', String(scale))

    // Ground glow tracks intensity
    s.setProperty('--bf-glow-opacity', String(intensity * 0.7))
    s.setProperty('--bf-glow-scale', String(0.5 + intensity * 0.5))

    // Per-flame intensity (CSS computes visibility + fade per flame)
    s.setProperty('--bf-intensity', String(intensity))

    // Animation durations scaled by mode
    s.setProperty('--bf-mode-mult', String(modeMult))
  })

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        width: '100%',
        height: 'clamp(140px, 26vh, 260px)',
        position: 'relative',
        overflow: 'hidden',
        '--bf-intensity': '0',
        '--bf-scale': '0.25',
        '--bf-surge': '0',
        '--bf-glow-opacity': '0',
        '--bf-glow-scale': '0.5',
        '--bf-mode-mult': '1',
        transition: '0.3s',
      } as React.CSSProperties}
    >
      {/* Ground glow - warm amber radial beneath fire */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '50%',
          width: '80%',
          height: '60%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(200, 60, 10, 0.6) 0%, rgba(180, 40, 5, 0.3) 40%, transparent 70%)',
          opacity: 'var(--bf-glow-opacity)',
          transform: 'translate(-50%, 50%) scale(var(--bf-glow-scale))',
          transition: 'opacity 0.3s, transform 0.3s',
          pointerEvents: 'none',
        }}
      />

      {/* Completion glow - gold burst driven by --bf-surge with CSS transition */}
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '50%',
          width: '100%',
          height: '80%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(255, 215, 0, 0.9) 0%, rgba(255, 200, 0, 0.4) 30%, transparent 70%)',
          opacity: 'calc(var(--bf-surge) * 0.38)',
          transform: 'translate(-50%, 50%) scale(calc(0.3 + var(--bf-surge) * 2.9))',
          transition: 'opacity 0.8s ease-in, opacity 2s 0.1s ease-out, transform 0.8s ease-in, transform 2s 0.1s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Log pile - only re-renders when focusCount changes */}
      <div style={{ position: 'absolute', bottom: '12%', left: '50%', transform: 'translate(-50%, 0)', width: '90px', height: '50px' }}>
        {LOG_CONFIGS.slice(0, logCount).map((log, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: log.y + '%',
              width: log.wPct + '%',
              height: log.hPx + 'px',
              backgroundColor: log.color,
              borderRadius: '4px',
              transform: 'translate(-50%, 0) rotate(' + log.rotation + 'deg)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          />
        ))}
      </div>

      {/* Flames */}
      <div style={{ position: 'absolute', bottom: '22%', left: '50%', transform: 'translate(-50%, 0)', width: '80px', height: '100px' }}>
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
                transition: 'opacity 0.2s, transform 0.25s',
              }}
            >
              {/* Inner flame element - float/pulse/flicker animations live here,
                  separated from the scale transform to avoid CSS conflicts */}
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
                {/* Teardrop flame body */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                    background: 'linear-gradient(to top, #FF6B0B 0%, #FF9A1A 35%, #FFD700 70%, #FFF4CC 100%)',
                    filter: 'blur(1px)',
                  }}
                />
                {/* Inner bright core */}
                <div
                  style={{
                    position: 'absolute',
                    left: '25%',
                    bottom: '5%',
                    width: '50%',
                    height: '55%',
                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                    background: 'radial-gradient(ellipse at center bottom, #FFFDE8 0%, #FFD700 60%, transparent 100%)',
                    filter: 'blur(2px)',
                    opacity: 0.85,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Embers */}
      <div style={{ position: 'absolute', bottom: '25%', left: '50%', transform: 'translate(-50%, 0)', width: '40px', height: '120px', pointerEvents: 'none' }}>
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
              boxShadow: '0 0 3px 1px rgba(255, 180, 70, 0.6)',
              opacity: 0,
              animation: `bf-ember-rise ${ember.duration}s ease-out ${ember.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
