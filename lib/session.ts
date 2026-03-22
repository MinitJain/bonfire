/**
 * Generate a random session ID (8 alphanumeric characters).
 */
export function generateSessionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/**
 * Format a session URL from a session ID.
 */
export function formatSessionUrl(sessionId: string): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://pomodoro-jam.vercel.app')
  return `${appUrl}/session/${sessionId}`
}

/**
 * Extract session ID from a URL or return the string as-is if it's already an ID.
 */
export function extractSessionId(input: string): string | null {
  const trimmed = input.trim()

  // Try to parse as URL
  try {
    const url = new URL(trimmed)
    const parts = url.pathname.split('/')
    const sessionIndex = parts.indexOf('session')
    if (sessionIndex !== -1 && parts[sessionIndex + 1]) {
      return parts[sessionIndex + 1]
    }
  } catch {
    // Not a URL - check if it looks like a session ID (alphanumeric, 4-20 chars)
    if (/^[a-z0-9]{4,20}$/i.test(trimmed)) {
      return trimmed.toLowerCase()
    }
  }

  return null
}
