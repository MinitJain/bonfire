/**
 * Play a tick sound using the Web Audio API.
 */
export function playTickSound(): void {
  if (typeof window === 'undefined') return
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  } catch {
    // Audio not available
  }
}

/**
 * Play a completion sound using the Web Audio API.
 */
export function playCompleteSound(): void {
  if (typeof window === 'undefined') return
  try {
    const ctx = new AudioContext()

    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15)
      gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.15)
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.15 + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4)

      oscillator.start(ctx.currentTime + i * 0.15)
      oscillator.stop(ctx.currentTime + i * 0.15 + 0.4)
    })
  } catch {
    // Audio not available
  }
}

/**
 * Request browser notification permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }
  if (Notification.permission === 'granted') {
    return true
  }
  if (Notification.permission === 'denied') {
    return false
  }
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

/**
 * Show a browser notification.
 */
export function showNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    new Notification(title, {
      body,
      icon: '/apple-touch-icon.png',
      badge: '/apple-touch-icon.png',
    })
  } catch {
    // Notifications not available
  }
}
