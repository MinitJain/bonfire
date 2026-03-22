// Dynamic canvas favicon — updates the browser tab icon with live countdown

const FAVICON_SIZE = 32

const MODE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  focus: { bg: '#e8472a', text: '#ffffff', ring: '#c23820' },
  short: { bg: '#2abe8a', text: '#ffffff', ring: '#1d9e75' },
  long:  { bg: '#f5a623', text: '#ffffff', ring: '#d4891e' },
}

export function updateFavicon(timeLeft: number, mode: string): void {
  if (typeof window === 'undefined') return

  const canvas = document.createElement('canvas')
  canvas.width = FAVICON_SIZE
  canvas.height = FAVICON_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const colors = MODE_COLORS[mode] ?? MODE_COLORS.focus
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

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

  const dataUrl = canvas.toDataURL('image/png')
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-dynamic]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    link.setAttribute('data-dynamic', 'true')
    document.head.appendChild(link)
  }
  link.href = dataUrl
}

export function resetFavicon(): void {
  if (typeof window === 'undefined') return
  document.querySelector('link[rel="icon"][data-dynamic]')?.remove()
}
