import { formatSessionUrl } from './session'

/**
 * Build a Twitter/X share URL.
 */
export function buildTwitterShareUrl(sessionId: string, sessionName?: string | null): string {
  const sessionUrl = formatSessionUrl(sessionId)
  const text = sessionName
    ? `Join my "${sessionName}" Pomodoro session on PomodoroJam! Stay focused together.`
    : 'Join my Pomodoro session on PomodoroJam! Stay focused together.'
  const params = new URLSearchParams({
    text,
    url: sessionUrl,
    hashtags: 'PomodoroJam,Focus,Productivity',
  })
  return `https://twitter.com/intent/tweet?${params.toString()}`
}

/**
 * Copy a session link to the clipboard.
 * Returns true on success.
 */
export async function copySessionLink(sessionId: string): Promise<boolean> {
  const url = formatSessionUrl(sessionId)
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = url
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      document.body.removeChild(textArea)
      return false
    }
  }
}

/**
 * Open the native share sheet if available (Web Share API).
 * Returns true if the share was initiated, false if not supported.
 */
export async function nativeShare(sessionId: string, sessionName?: string | null): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false
  }
  const url = formatSessionUrl(sessionId)
  const title = sessionName ? `PomodoroJam: ${sessionName}` : 'PomodoroJam Session'
  try {
    await navigator.share({
      title,
      text: 'Join my Pomodoro focus session!',
      url,
    })
    return true
  } catch {
    return false
  }
}
