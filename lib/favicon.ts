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

  // Text
  ctx.fillStyle = colors.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (mins >= 10) {
    ctx.font = 'bold 14px monospace'
    ctx.fillText(String(mins), 16, 16)
  } else if (mins > 0) {
    ctx.font = 'bold 10px monospace'
    ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, 16, 16)
  } else {
    ctx.font = 'bold 11px monospace'
    ctx.fillText(`:${String(secs).padStart(2, '0')}`, 16, 16)
  }

  const link = getLink()
  link.href = canvas.toDataURL('image/png')
}

export function resetFavicon(): void {
  if (typeof window === 'undefined') return

  const canvas = getCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE)

  // Red circle background
  ctx.beginPath()
  ctx.arc(16, 16, 15, 0, 2 * Math.PI)
  ctx.fillStyle = '#e8472a'
  ctx.fill()

  // Thin ring
  ctx.beginPath()
  ctx.arc(16, 16, 14, 0, 2 * Math.PI)
  ctx.strokeStyle = '#c23820'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Tomato emoji — canvas uses system emoji fonts, always renders correctly
  ctx.font = '18px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🍅', 16, 17)

  const link = getLink()
  link.href = canvas.toDataURL('image/png')
}
