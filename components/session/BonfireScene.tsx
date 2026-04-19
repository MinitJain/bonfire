'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BonfireSceneProps {
  targetIntensity: number
  isSurging: boolean
  focusCount: number
  participantCount: number
  mode: 'focus' | 'short' | 'long'
}

// ─── Easing ───────────────────────────────────────────────────────────────────

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

// ─── Animation constants ──────────────────────────────────────────────────────

const FLOAT_DURATION = 3.5   // seconds per float cycle
const FLOAT_RANGE    = 0.09  // ±0.09 world units ≈ ±9px at camera dist 3.2
const PULSE_DURATION = 3.0
const PULSE_RANGE    = 0.025 // ±2.5% scale
const BASE_OPACITY   = 0.90
const OPACITY_RANGE  = 0.04

// ─── Log pile configs (deterministic — no Math.random at render) ──────────────

const LOG_CONFIGS = [
  { x:  0.00, y: 0.00, z:  0.00, rotY:  0.30, rotZ:  0.12 },
  { x:  0.00, y: 0.00, z:  0.05, rotY: -0.65, rotZ: -0.10 },
  { x: -0.08, y: 0.12, z:  0.02, rotY:  0.20, rotZ:  0.08 },
  { x:  0.09, y: 0.12, z: -0.02, rotY: -0.40, rotZ: -0.07 },
  { x: -0.05, y: 0.24, z:  0.03, rotY:  0.50, rotZ:  0.10 },
  { x:  0.06, y: 0.24, z: -0.03, rotY: -0.25, rotZ: -0.09 },
  { x: -0.03, y: 0.36, z:  0.01, rotY:  0.15, rotZ:  0.06 },
  { x:  0.04, y: 0.36, z: -0.01, rotY: -0.55, rotZ: -0.08 },
]

// ─── Teardrop flame configs ───────────────────────────────────────────────────
// Five flames: center dominant, two mid, two smaller behind.
// Phase offsets ensure no two flames move/pulse/flicker in sync.

interface FlameConfig {
  x: number; baseY: number; z: number; baseScale: number
  floatPhase: number; pulsePhase: number; opacityPhase: number
  minIntensity: number  // only visible above this threshold — flames unlock progressively
}

// Timer start (~0.28 intensity): only center flame, small.
// Mid flames unlock at 0.35, back flames at 0.58 (via pomodoro surges / participants).
const FLAME_CONFIGS: FlameConfig[] = [
  { x:  0.00, baseY: 0.12, z:  0.02, baseScale: 0.58, floatPhase: 0.00, pulsePhase: 0.00, opacityPhase: 0.00, minIntensity: 0.05 },
  { x: -0.20, baseY: 0.06, z:  0.00, baseScale: 0.44, floatPhase: 0.85, pulsePhase: 1.40, opacityPhase: 1.20, minIntensity: 0.35 },
  { x:  0.20, baseY: 0.06, z:  0.00, baseScale: 0.44, floatPhase: 1.60, pulsePhase: 0.70, opacityPhase: 2.10, minIntensity: 0.35 },
  { x: -0.10, baseY: 0.01, z: -0.07, baseScale: 0.33, floatPhase: 2.30, pulsePhase: 2.00, opacityPhase: 0.80, minIntensity: 0.58 },
  { x:  0.10, baseY: 0.01, z: -0.07, baseScale: 0.33, floatPhase: 3.05, pulsePhase: 2.70, opacityPhase: 1.60, minIntensity: 0.58 },
]

// ─── GLSL shaders ─────────────────────────────────────────────────────────────

// Teardrop flame: UV gradient yellow(base) → orange → red(tip) + left-edge gloss
const FLAME_VS = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const FLAME_FS = /* glsl */`
  varying vec2 vUv;
  uniform float uOpacity;

  void main() {
    // v=0 → hot yellow base, v=1 → cool crimson tip
    vec3 yellow = vec3(1.00, 0.87, 0.08);
    vec3 orange = vec3(1.00, 0.50, 0.05);
    vec3 red    = vec3(0.82, 0.16, 0.02);

    vec3 color = vUv.y < 0.5
      ? mix(yellow, orange, vUv.y * 2.0)
      : mix(orange, red,   (vUv.y - 0.5) * 2.0);

    // Left-edge gloss — 3D depth illusion, light source from left
    float gloss = smoothstep(0.05, 0.28, vUv.x) * (1.0 - smoothstep(0.28, 0.52, vUv.x));
    gloss *= (1.0 - vUv.y * 0.65);
    color = mix(color, vec3(1.0, 0.97, 0.88), gloss * 0.32);

    gl_FragColor = vec4(color, uOpacity);
  }
`

// Shared UV-pass vertex for ground glow + completion glow
const GLOW_VS = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Ground warm glow (amber radial)
const GLOW_FS = /* glsl */`
  varying vec2 vUv;
  uniform float uIntensity;
  void main() {
    float dist  = length(vUv - 0.5) * 2.0;
    float glow  = (1.0 - smoothstep(0.0, 1.0, dist)) * uIntensity;
    vec3  color = mix(vec3(0.6, 0.15, 0.0), vec3(1.0, 0.45, 0.05), glow);
    gl_FragColor = vec4(color, glow * 0.75);
  }
`

// Completion pulse: gold radial burst
const COMPLETION_FS = /* glsl */`
  varying vec2 vUv;
  uniform float uOpacity;
  void main() {
    float dist = length(vUv - 0.5) * 2.0;
    float ring = 1.0 - smoothstep(0.0, 1.0, dist);
    gl_FragColor = vec4(1.0, 0.84, 0.0, ring * uOpacity); // #FFD700 gold
  }
`

// Ember point sprites (same round-particle shader as before)
const EMBER_VS = /* glsl */`
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3  aColor;
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor; vAlpha = aAlpha;
    vec4 mvp = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvp.z);
    gl_Position  = projectionMatrix * mvp;
  }
`
const EMBER_FS = /* glsl */`
  varying vec3  vColor;
  varying float vAlpha;
  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, dist) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`

// ─── Teardrop shape geometry factory ─────────────────────────────────────────
// Two cubic beziers — one per side — produce a clean symmetric teardrop.
// Tip at top (0, 0.56), rounded base (0, −0.36).
// THREE.ShapeGeometry auto-maps UVs to bounding box:
//   v=0 → bottom (yellow/base), v=1 → top (red/tip)  ✓

function createTeardropShape(): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0, 0.56)
  s.bezierCurveTo( 0.30,  0.36,  0.32, -0.10,  0.0, -0.36)
  s.bezierCurveTo(-0.32, -0.10, -0.30,  0.36,  0.0,  0.56)
  return s
}

// ─── SingleFlame ──────────────────────────────────────────────────────────────
// Each flame owns its ShaderMaterial (separate uOpacity uniform per instance).
// Shares geometry with siblings. All animation via useFrame ref mutation — no setState.

function SingleFlame({
  config,
  intensityRef,
  isSurgingRef,
  modeRef,
  geometry,
}: {
  config: FlameConfig
  intensityRef: React.MutableRefObject<number>
  isSurgingRef: React.MutableRefObject<boolean>
  modeRef: React.MutableRefObject<'focus' | 'short' | 'long'>
  geometry: THREE.ShapeGeometry
}) {
  const meshRef  = useRef<THREE.Mesh>(null)
  const timeRef  = useRef(Math.random() * 100) // random start so flames don't sync on mount
  const surgeRef = useRef(0)

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   FLAME_VS,
    fragmentShader: FLAME_FS,
    uniforms:       { uOpacity: { value: 0.9 } },
    transparent:    true,
    depthWrite:     false,
    side:           THREE.DoubleSide,
  }), [])

  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    timeRef.current += delta
    const t         = timeRef.current
    const intensity = intensityRef.current

    mesh.visible = intensity > config.minIntensity

    // Slow float + pulse during breaks — fire breathes lazily at rest
    const m             = modeRef.current
    const floatDuration = m === 'long' ? 8.0 : m === 'short' ? 5.5 : FLOAT_DURATION
    const pulseDuration = m === 'long' ? 7.0 : m === 'short' ? 5.0 : PULSE_DURATION

    // Vertical float — sine wave, staggered phase per flame
    const floatY = Math.sin(2 * Math.PI * (t + config.floatPhase) / floatDuration) * FLOAT_RANGE

    // Scale pulse — sine wave, different phase
    const pulseScale = 1.0 + Math.sin(2 * Math.PI * (t + config.pulsePhase) / pulseDuration) * PULSE_RANGE

    // Completion surge — fast ramp up, slow decay
    if (isSurgingRef.current) {
      surgeRef.current = Math.min(surgeRef.current + delta * 5, 1)
    } else {
      surgeRef.current = Math.max(surgeRef.current - delta * 1.0, 0)
    }
    const surgeBoost = 1.0 + easeOutCubic(surgeRef.current) * 0.10

    // Opacity flicker — slower cycle, subtle range
    const opacity = (BASE_OPACITY + Math.sin(2 * Math.PI * (t * 1.5 + config.opacityPhase) / 2.0) * OPACITY_RANGE)
      * Math.min(intensity * 2.5, 1)

    const finalScale = config.baseScale * pulseScale * surgeBoost * (0.25 + intensity * 0.75)

    mesh.position.set(config.x, config.baseY + floatY, config.z)
    mesh.scale.set(finalScale, finalScale * 1.15, 1) // 15% taller than wide — more flame-like
    mesh.rotation.x = -0.28 // tilt toward camera (~16°)

    material.uniforms.uOpacity.value = Math.max(0, opacity)
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
}

// ─── TeardropFlames ───────────────────────────────────────────────────────────
// Shared geometry, 5 independent mesh instances.

function TeardropFlames({
  intensityRef,
  isSurgingRef,
  modeRef,
}: {
  intensityRef: React.MutableRefObject<number>
  isSurgingRef: React.MutableRefObject<boolean>
  modeRef: React.MutableRefObject<'focus' | 'short' | 'long'>
}) {
  const geometry = useMemo(() => new THREE.ShapeGeometry(createTeardropShape(), 24), [])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      {FLAME_CONFIGS.map((cfg, i) => (
        <SingleFlame
          key={i}
          config={cfg}
          intensityRef={intensityRef}
          isSurgingRef={isSurgingRef}
          modeRef={modeRef}
          geometry={geometry}
        />
      ))}
    </group>
  )
}

// ─── Embers ───────────────────────────────────────────────────────────────────
// 5 max. Slow upward drift in narrow column. Soft gold. Barely visible — ambient only.

interface EmberData {
  positions: Float32Array; velocities: Float32Array
  colors: Float32Array; sizes: Float32Array
  alphas: Float32Array; lifetimes: Float32Array; maxLifetimes: Float32Array
}

function Embers({ intensityRef }: { intensityRef: React.MutableRefObject<number> }) {
  const MAX       = 5
  const ptsRef    = useRef<THREE.Points>(null)
  const smoothRef = useRef(0)

  const { geometry, material, ed } = useMemo(() => {
    const positions    = new Float32Array(MAX * 3)
    const velocities   = new Float32Array(MAX * 3)
    const colors       = new Float32Array(MAX * 3)
    const sizes        = new Float32Array(MAX)
    const alphas       = new Float32Array(MAX)
    const lifetimes    = new Float32Array(MAX)
    const maxLifetimes = new Float32Array(MAX)

    for (let i = 0; i < MAX; i++) {
      maxLifetimes[i]      = 2.0 + Math.random() * 1.0
      lifetimes[i]         = Math.random() * maxLifetimes[i] // staggered initial spawn
      positions[i * 3 + 1] = -20
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aColor',   new THREE.BufferAttribute(colors,    3))
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1))
    geo.setAttribute('aAlpha',   new THREE.BufferAttribute(alphas,    1))

    const mat = new THREE.ShaderMaterial({
      vertexShader:   EMBER_VS,
      fragmentShader: EMBER_FS,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    })

    const ed: EmberData = { positions, velocities, colors, sizes, alphas, lifetimes, maxLifetimes }
    return { geometry: geo, material: mat, ed }
  }, [])

  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  useFrame((_, delta) => {
    if (!ptsRef.current) return
    smoothRef.current += (intensityRef.current - smoothRef.current) * Math.min(delta * 1.5, 1)
    const intensity = smoothRef.current

    for (let i = 0; i < MAX; i++) {
      ed.lifetimes[i] -= delta

      if (ed.lifetimes[i] <= 0) {
        if (intensity < 0.12) {
          ed.positions[i * 3 + 1] = -20; ed.alphas[i] = 0; ed.sizes[i] = 0
          continue
        }
        // Spawn in tight column above flame tips
        ed.positions[i * 3]     = (Math.random() - 0.5) * 0.22
        ed.positions[i * 3 + 1] = 0.50 + Math.random() * 0.28
        ed.positions[i * 3 + 2] = (Math.random() - 0.5) * 0.06

        // Slow upward, near-zero horizontal drift
        ed.velocities[i * 3]     = (Math.random() - 0.5) * 0.03
        ed.velocities[i * 3 + 1] = 0.16 + Math.random() * 0.10 // ~16–26px/sec
        ed.velocities[i * 3 + 2] = 0

        ed.maxLifetimes[i] = 2.0 + Math.random() * 1.0
        ed.lifetimes[i]    = ed.maxLifetimes[i]
        continue
      }

      ed.positions[i * 3]     += ed.velocities[i * 3]     * delta
      ed.positions[i * 3 + 1] += ed.velocities[i * 3 + 1] * delta

      const ratio = ed.lifetimes[i] / ed.maxLifetimes[i]

      // Soft gold, slight white tint when freshly spawned
      ed.colors[i * 3]     = 1.0
      ed.colors[i * 3 + 1] = 0.65 + ratio * 0.25
      ed.colors[i * 3 + 2] = ratio * 0.12

      const fadeIn  = Math.min(1.0, (ed.maxLifetimes[i] - ed.lifetimes[i]) / 0.25)
      ed.alphas[i]  = fadeIn * ratio * 0.70
      ed.sizes[i]   = 0.04 + ratio * 0.025
    }

    ;(geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute('aColor')   as THREE.BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute('aSize')    as THREE.BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute('aAlpha')   as THREE.BufferAttribute).needsUpdate = true
  })

  return <points ref={ptsRef} geometry={geometry} material={material} frustumCulled={false} />
}

// ─── CompletionGlow ───────────────────────────────────────────────────────────
// Gold radial burst that expands outward when a pomodoro completes (isSurging rises).
// Triggered on rising edge of isSurgingRef; plays once over 1.5s then resets.

function CompletionGlow({ isSurgingRef }: { isSurgingRef: React.MutableRefObject<boolean> }) {
  const meshRef   = useRef<THREE.Mesh>(null)
  const prevSurge = useRef(false)
  const animTime  = useRef(-1) // −1 = inactive
  const DURATION  = 1.5

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   GLOW_VS,
    fragmentShader: COMPLETION_FS,
    uniforms:       { uOpacity: { value: 0 } },
    transparent:    true,
    depthWrite:     false,
    blending:       THREE.AdditiveBlending,
    side:           THREE.DoubleSide,
  }), [])

  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    // Rising-edge detection — start animation when isSurging flips true
    const surging = isSurgingRef.current
    if (surging && !prevSurge.current) animTime.current = 0
    prevSurge.current = surging

    if (animTime.current < 0) {
      material.uniforms.uOpacity.value = 0
      return
    }

    animTime.current += delta
    const t = Math.min(animTime.current / DURATION, 1)

    if (t >= 1) {
      animTime.current = -1
      material.uniforms.uOpacity.value = 0
      mesh.scale.setScalar(0.1)
      return
    }

    // Opacity: peak at 25% → fade out
    const opacity = t < 0.25
      ? easeOutCubic(t / 0.25) * 0.38
      : (1 - easeOutCubic((t - 0.25) / 0.75)) * 0.38

    // Radius grows 0.4 → 3.2 world units
    const radius = 0.4 + easeOutCubic(t) * 2.8

    material.uniforms.uOpacity.value = opacity
    mesh.scale.set(radius, radius, 1)
  })

  return (
    <mesh ref={meshRef} position={[0, -0.14, -0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.1, 0.1, 1]}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

// ─── LogPile ──────────────────────────────────────────────────────────────────

function LogPile({ logCount }: { logCount: number }) {
  const count = Math.min(Math.max(logCount, 2), 8)
  return (
    <group position={[0, -0.12, 0]}>
      {LOG_CONFIGS.slice(0, count).map((cfg, i) => (
        <mesh key={i} position={[cfg.x, cfg.y, cfg.z]} rotation={[Math.PI / 2, cfg.rotY, cfg.rotZ]}>
          <cylinderGeometry args={[0.038, 0.052, 0.95, 8]} />
          <meshStandardMaterial color={i < 2 ? '#1C0A02' : '#241005'} roughness={0.95} metalness={0} />
        </mesh>
      ))}
    </group>
  )
}

// ─── GroundGlow ───────────────────────────────────────────────────────────────

function GroundGlow({ intensityRef }: { intensityRef: React.MutableRefObject<number> }) {
  const smoothRef = useRef(0)
  const material  = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   GLOW_VS,
    fragmentShader: GLOW_FS,
    uniforms:       { uIntensity: { value: 0 } },
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), [])
  useEffect(() => () => material.dispose(), [material])
  useFrame((_, delta) => {
    smoothRef.current += (intensityRef.current - smoothRef.current) * Math.min(delta * 1.8, 1)
    material.uniforms.uIntensity.value = smoothRef.current
  })
  return (
    <mesh position={[0, -0.15, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.5, 2.5]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

// ─── FireLight ────────────────────────────────────────────────────────────────
// PointLight at fire heart, flickers with multi-frequency sine sum. Illuminates logs.

function FireLight({ intensityRef }: { intensityRef: React.MutableRefObject<number> }) {
  const lightRef  = useRef<THREE.PointLight>(null)
  const smoothRef = useRef(0)
  const timeRef   = useRef(0)

  useFrame((_, delta) => {
    if (!lightRef.current) return
    timeRef.current += delta
    smoothRef.current += (intensityRef.current - smoothRef.current) * Math.min(delta * 2, 1)
    const flicker =
      1.0
      + Math.sin(timeRef.current *  7.3) * 0.06
      + Math.sin(timeRef.current * 13.7) * 0.04
      + Math.sin(timeRef.current *  3.1) * 0.03
    lightRef.current.intensity = smoothRef.current * 4.5 * flicker
    lightRef.current.color.setRGB(1.0, 0.40 + smoothRef.current * 0.18, 0.05)
  })

  return <pointLight ref={lightRef} position={[0, 0.4, 0.3]} distance={4.0} decay={2} castShadow={false} />
}

// ─── CameraSetup ──────────────────────────────────────────────────────────────

function CameraSetup({ modeRef }: { modeRef: React.MutableRefObject<'focus' | 'short' | 'long'> }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 1.2, 3.2)
    camera.lookAt(0, 0.3, 0)
  }, [camera])
  useFrame((_, delta) => {
    // Pull camera back during breaks — breathing room, fire feels smaller/calmer
    const targetZ = modeRef.current === 'long' ? 4.2 : modeRef.current === 'short' ? 3.7 : 3.2
    camera.position.z += (targetZ - camera.position.z) * Math.min(delta * 0.6, 1)
    camera.lookAt(0, 0.3, 0)
  })
  return null
}

// ─── BonfireScene (main export) ───────────────────────────────────────────────
// Dynamic-imported with ssr:false from SessionProvider — never server-rendered.

export function BonfireScene({ targetIntensity, isSurging, focusCount, mode }: BonfireSceneProps) {
  const intensityRef = useRef(targetIntensity)
  const isSurgingRef = useRef(isSurging)
  const modeRef      = useRef(mode)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => { intensityRef.current = targetIntensity }, [targetIntensity])
  useEffect(() => { isSurgingRef.current = isSurging }, [isSurging])
  useEffect(() => { modeRef.current = mode }, [mode])

  // Wait for real pixel dimensions before mounting Canvas.
  // r3f reads size via ResizeObserver; mounting at 0×0 means it never resizes correctly.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const tryReady = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) setReady(true)
    }
    tryReady()
    const ro = new ResizeObserver(tryReady)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const logCount = Math.min(2 + focusCount, 8)

  return (
    <div ref={containerRef} aria-hidden="true" style={{ width: '100%', height: 'clamp(140px, 26vh, 260px)', position: 'relative' }}>
      {ready && (
        <Canvas
          camera={{ fov: 42, near: 0.1, far: 50 }}
          gl={{
            alpha:           true,
            antialias:       true, // teardrop edges benefit from AA; was false in particle version
            powerPreference: 'high-performance',
          }}
          dpr={[1, Math.min(window.devicePixelRatio, 2)]}
          style={{ background: 'transparent', width: '100%', height: '100%', display: 'block' }}
        >
          <ambientLight intensity={0.08} />
          <CameraSetup    modeRef={modeRef} />
          <FireLight      intensityRef={intensityRef} />
          <GroundGlow     intensityRef={intensityRef} />
          <CompletionGlow isSurgingRef={isSurgingRef} />
          <LogPile        logCount={logCount} />
          <TeardropFlames intensityRef={intensityRef} isSurgingRef={isSurgingRef} modeRef={modeRef} />
          <Embers         intensityRef={intensityRef} />
        </Canvas>
      )}
    </div>
  )
}
