// Dynamic canvas favicon: the Bonfire mark, or a live countdown in the same style
import { BRAND, FLAME_INNER, FLAME_OUTER } from '@/lib/brand'

const FAVICON_SIZE = 32

// Countdown ring by phase: fire for focus, cool blues for rests
const MODE_COLORS: Record<string, { ring: string; text: string }> = {
  focus: { ring: BRAND.fire, text: BRAND.flameCore },
  short: { ring: '#7FA8C9', text: '#E6EEF6' },
  long:  { ring: '#9DB6CC', text: '#E6EEF6' },
}

// Singleton canvas and link element — reused on every update
let _canvas: HTMLCanvasElement | null = null
let _link: HTMLLinkElement | null = null

function getCanvas(): HTMLCanvasElement {
  if (!_canvas) {
    _canvas = document.createElement('canvas')
    _canvas.width = FAVICON_SIZE
    _canvas.height = FAVICON_SIZE
  }
  return _canvas
}

function getLink(): HTMLLinkElement {
  if (_link && !_link.isConnected) {
    _link = null
  }
  if (!_link) {
    _link = document.createElement('link')
    _link.rel = 'icon'
    _link.type = 'image/png'
    _link.setAttribute('data-dynamic', 'true')
    document.head.appendChild(_link)
  }
  return _link
}

/** The dusk tile every Bonfire favicon sits on (matches app/icon.svg). */
function drawTile(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE)
  ctx.fillStyle = BRAND.dusk
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') ctx.roundRect(0, 0, FAVICON_SIZE, FAVICON_SIZE, 7)
  else ctx.rect(0, 0, FAVICON_SIZE, FAVICON_SIZE)
  ctx.fill()
}

export function updateFavicon(timeLeft: number, mode: string): void {
  if (typeof window === 'undefined') return

  const canvas = getCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const colors = MODE_COLORS[mode] ?? MODE_COLORS.focus
  const mins = Math.floor(timeLeft / 60)

  drawTile(ctx)

  // Thin phase ring
  ctx.beginPath()
  ctx.arc(16, 16, 12.5, 0, 2 * Math.PI)
  ctx.strokeStyle = colors.ring
  ctx.lineWidth = 2
  ctx.stroke()

  // Text — show only minutes for readability (e.g. "25", "4", "0")
  ctx.fillStyle = colors.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = mins >= 10 ? 'bold 13px Arial, sans-serif' : 'bold 16px Arial, sans-serif'
  ctx.fillText(String(mins), 16, 16.5)

  const link = getLink()
  link.href = canvas.toDataURL('image/png')
}

/** The static Bonfire mark: flame on the dusk tile. */
export function resetFavicon(): void {
  if (typeof window === 'undefined') return

  const canvas = getCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx || typeof Path2D === 'undefined') return

  drawTile(ctx)

  ctx.save()
  ctx.scale(FAVICON_SIZE / 64, FAVICON_SIZE / 64)
  const grad = ctx.createLinearGradient(0, 56, 0, 6)
  grad.addColorStop(0, BRAND.fire)
  grad.addColorStop(1, BRAND.ember)
  ctx.fillStyle = grad
  ctx.fill(new Path2D(FLAME_OUTER))
  ctx.fillStyle = BRAND.flameCore
  ctx.fill(new Path2D(FLAME_INNER))
  ctx.restore()

  getLink().href = canvas.toDataURL('image/png')
}
