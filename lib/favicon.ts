// Dynamic canvas favicon — updates the browser tab icon with live countdown

const FAVICON_SIZE = 32

const MODE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  focus: { bg: '#e8472a', text: '#ffffff', ring: '#c23820' },
  short: { bg: '#2abe8a', text: '#ffffff', ring: '#1d9e75' },
  long:  { bg: '#f5a623', text: '#ffffff', ring: '#d4891e' },
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

export function updateFavicon(timeLeft: number, mode: string): void {
  if (typeof window === 'undefined') return

  const canvas = getCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const colors = MODE_COLORS[mode] ?? MODE_COLORS.focus
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE)

  // Background circle
  ctx.beginPath()
  ctx.arc(16, 16, 15, 0, 2 * Math.PI)
  ctx.fillStyle = colors.bg
  ctx.fill()

  // Thin ring
  ctx.beginPath()
  ctx.arc(16, 16, 14, 0, 2 * Math.PI)
  ctx.strokeStyle = colors.ring
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Text — show only minutes for readability (e.g. "25", "4", "0")
  ctx.fillStyle = colors.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = mins >= 10 ? 'bold 15px Arial, sans-serif' : 'bold 18px Arial, sans-serif'
  ctx.fillText(String(mins), 16, 16)

  const link = getLink()
  link.href = canvas.toDataURL('image/png')
}

export function resetFavicon(): void {
  if (typeof window === 'undefined') return

  const canvas = getCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE)

  // Radial gradient: dark center → deep red edge
  const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 15)
  grad.addColorStop(0, '#1a0000')
  grad.addColorStop(1, '#c0200f')

  ctx.beginPath()
  ctx.arc(16, 16, 15, 0, 2 * Math.PI)
  ctx.fillStyle = grad
  ctx.fill()

  // Shiny highlight ring
  ctx.beginPath()
  ctx.arc(16, 16, 14, 0, 2 * Math.PI)
  ctx.strokeStyle = 'rgba(255, 100, 50, 0.5)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Fire emoji — large, centered
  ctx.font = '20px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🔥', 16, 16)

  getLink().href = canvas.toDataURL('image/png')
}
