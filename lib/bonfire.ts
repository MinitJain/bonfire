/**
 * Bonfire v2: Client-side command wrappers.
 * All mutations go through PostgreSQL RPCs (SECURITY DEFINER).
 * Clients never write directly to the bonfires table.
 */

import { createClient } from '@/lib/supabase/client'
import { generateAnonName } from '@/lib/roomName'
import type { BonfireState, BonfireMode, CreatedBonfire, SeatIndex } from '@/types'

// ─── Token management ────────────────────────────────────────

const TOKEN_KEY_PREFIX = 'bonfire_token_'
const PARTICIPANT_TOKEN_KEY_PREFIX = 'bonfire_participant_'

export function storeInitiatorToken(bonfireId: string, token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${TOKEN_KEY_PREFIX}${bonfireId}`, token)
}

export function getInitiatorToken(bonfireId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`${TOKEN_KEY_PREFIX}${bonfireId}`)
}

export function storeParticipantToken(bonfireId: string, token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${PARTICIPANT_TOKEN_KEY_PREFIX}${bonfireId}`, token)
}

export function getParticipantToken(bonfireId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`${PARTICIPANT_TOKEN_KEY_PREFIX}${bonfireId}`)
}

export function getToken(bonfireId: string): string | null {
  return getInitiatorToken(bonfireId) ?? getParticipantToken(bonfireId)
}

// ─── Display names ───────────────────────────────────────────
// The last name a guest used anywhere is only a prefill suggestion.
// The name used inside a Bonfire is stored per Bonfire, next to that
// Bonfire's participant credential.

const DISPLAY_NAME_KEY = 'bonfire_display_name'
const BONFIRE_DISPLAY_NAME_PREFIX = 'bonfire_name_'
export const MAX_NAME_LENGTH = 40
export const MAX_BONFIRE_NAME_LENGTH = 40

export function getBonfireDisplayName(bonfireId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const name = localStorage.getItem(`${BONFIRE_DISPLAY_NAME_PREFIX}${bonfireId}`)?.trim()
    return name ? name.slice(0, MAX_NAME_LENGTH) : null
  } catch {
    return null
  }
}

export function storeBonfireDisplayName(bonfireId: string, name: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${BONFIRE_DISPLAY_NAME_PREFIX}${bonfireId}`, name.trim().slice(0, MAX_NAME_LENGTH))
  } catch {
    /* storage unavailable */
  }
}

export function getStoredDisplayName(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const name = localStorage.getItem(DISPLAY_NAME_KEY)?.trim()
    return name ? name.slice(0, MAX_NAME_LENGTH) : null
  } catch {
    return null
  }
}

export function storeDisplayName(name: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, name.trim().slice(0, MAX_NAME_LENGTH))
  } catch {
    /* storage unavailable */
  }
}

// A guest who has never chosen a name still has one: generated once per
// browser ("Sleepy Otter") and kept, so the name on the invitation, the
// suggestion in "Choose your name" and the next visit all agree.
const GUEST_NAME_KEY = 'bonfire_guest_name'

export function getGuestName(): string {
  if (typeof window === 'undefined') return generateAnonName()
  try {
    const stored = localStorage.getItem(GUEST_NAME_KEY)?.trim()
    if (stored) return stored.slice(0, MAX_NAME_LENGTH)
    const name = generateAnonName()
    localStorage.setItem(GUEST_NAME_KEY, name)
    return name
  } catch {
    return generateAnonName()
  }
}

/** The name to suggest: the last name this browser chose, or its guest name. */
export function getSuggestedName(): string {
  return getStoredDisplayName() ?? getGuestName()
}

// ─── Defaults ────────────────────────────────────────────────

export const DEFAULT_FOCUS_SECONDS = 25 * 60
export const DEFAULT_SHORT_SECONDS = 5 * 60
export const DEFAULT_LONG_SECONDS = 15 * 60
export const DEFAULT_ROUNDS_BEFORE_LONG = 4

/**
 * Allowed settings, in minutes (rounds: count). create_bonfire and
 * change_settings enforce the same ranges in seconds.
 */
export const SETTING_LIMITS = {
  focus: { min: 1, max: 120 },
  short: { min: 1, max: 30 },
  long: { min: 1, max: 60 },
  rounds: { min: 1, max: 12 },
} as const

/** Focus lengths offered on Home, in minutes. */
export const FOCUS_PRESETS = [25, 30, 45, 60] as const

/** Rests that suit a focus length (minutes): short pomodoros get short rests. */
export function restsFor(focusMinutes: number): { short: number; long: number } {
  if (focusMinutes < 40) return { short: 5, long: 15 }
  if (focusMinutes < 75) return { short: 10, long: 20 }
  return { short: 15, long: 30 }
}

// ─── Home setup ──────────────────────────────────────────────
// The last focus length and rounds chosen on Home, remembered only as a
// convenience for the next Bonfire this browser lights.

const SETUP_KEY = 'bonfire_setup'

export interface HomeSetup {
  focus: number
  rounds: number
}

export const DEFAULT_SETUP: HomeSetup = {
  focus: DEFAULT_FOCUS_SECONDS / 60,
  rounds: DEFAULT_ROUNDS_BEFORE_LONG,
}

const inRange = (n: unknown, { min, max }: { min: number; max: number }): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max

export function getStoredSetup(): HomeSetup {
  if (typeof window === 'undefined') return DEFAULT_SETUP
  try {
    const raw = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null') as Partial<HomeSetup> | null
    return {
      focus: inRange(raw?.focus, SETTING_LIMITS.focus) ? raw.focus : DEFAULT_SETUP.focus,
      rounds: inRange(raw?.rounds, SETTING_LIMITS.rounds) ? raw.rounds : DEFAULT_SETUP.rounds,
    }
  } catch {
    return DEFAULT_SETUP
  }
}

export function storeSetup(setup: HomeSetup): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(setup))
  } catch {
    /* storage unavailable */
  }
}

/**
 * Columns clients may read. initiator_token is excluded at the database
 * level (column grant), so `select('*')` is not allowed for clients.
 */
export const BONFIRE_COLUMNS = [
  'id', 'join_code', 'status', 'created_at',
  'phase', 'running', 'started_at', 'time_left',
  'focus_duration', 'short_duration', 'long_duration', 'rounds_before_long',
  'session_mode', 'initiator_id', 'initiator_name', 'name',
  'current_round', 'completed_pomodoros', 'last_active_at',
].join(', ')

/**
 * Whether `next` may replace `current`. Relay broadcasts arrive out of
 * order, so anything older than what this client already holds is dropped.
 * States without a version (before the version migration) are accepted.
 */
export function isNewerState(next: BonfireState, current: BonfireState): boolean {
  if (next.version == null || current.version == null) return true
  return next.version > current.version
}

type BonfireReader = Pick<ReturnType<typeof createClient>, 'from'>

/**
 * Read one bonfire with its version. Falls back to the columns without
 * `version` while the 20260925140000 migration is not yet applied.
 */
export async function selectBonfire(
  supabase: BonfireReader,
  id: string,
): Promise<{ data: BonfireState | null; error: string | null }> {
  const read = (columns: string) =>
    supabase.from('bonfires').select(columns).eq('id', id).maybeSingle()

  let { data, error } = await read(`${BONFIRE_COLUMNS}, version`)
  if (error?.code === '42703') ({ data, error } = await read(BONFIRE_COLUMNS))
  if (error) return { data: null, error: error.message }
  return { data: (data as unknown as BonfireState | null) ?? null, error: null }
}

// ─── Short code helpers ──────────────────────────────────────

const SHORT_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function isValidJoinCode(code: string): boolean {
  if (!/^[A-Z0-9]{6}$/i.test(code)) return false
  const chars = code.toUpperCase().split('')
  return chars.every(c => SHORT_CODE_CHARS.includes(c))
}

// ─── URL helpers ─────────────────────────────────────────────

export function bonfireUrl(id: string): string {
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'https://bonfirefocus.vercel.app'
  return `${base}/bonfire/${id}`
}

// ─── Command wrappers ────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createClient>

interface CommandResult<T = BonfireState> {
  data: T | null
  error: string | null
}

async function callRpc<T = BonfireState>(
  supabase: SupabaseClient,
  fn: string,
  params: Record<string, unknown> = {},
): Promise<CommandResult<T>> {
  const { data, error } = await supabase.rpc(fn as never, params as never)
  if (error) {
    console.error(`[bonfire] ${fn} failed:`, error.message)
    return { data: null, error: error.message }
  }
  return { data: data as T, error: null }
}

/** Create a new bonfire. The result is the only place initiator_token is returned. */
export async function createBonfire(opts: {
  initiatorName?: string
  focusDuration?: number
  shortDuration?: number
  longDuration?: number
  roundsBeforeLong?: number
  sessionMode?: BonfireMode
}): Promise<CommandResult<CreatedBonfire>> {
  const supabase = createClient()
  return callRpc<CreatedBonfire>(supabase, 'create_bonfire', {
    p_initiator_name: opts.initiatorName ?? 'Someone',
    p_focus_duration: opts.focusDuration ?? DEFAULT_FOCUS_SECONDS,
    p_short_duration: opts.shortDuration ?? DEFAULT_SHORT_SECONDS,
    p_long_duration: opts.longDuration ?? DEFAULT_LONG_SECONDS,
    p_rounds_before_long: opts.roundsBeforeLong ?? DEFAULT_ROUNDS_BEFORE_LONG,
    p_session_mode: opts.sessionMode ?? 'focus',
  })
}

/** Start or resume the timer. */
export async function startTimer(
  bonfireId: string,
  token?: string | null,
): Promise<CommandResult> {
  const supabase = createClient()
  return callRpc(supabase, 'start_timer', {
    p_bonfire_id: bonfireId,
    p_token: token ?? getToken(bonfireId),
  })
}

/** Pause the timer. */
export async function pauseTimer(
  bonfireId: string,
  token?: string | null,
): Promise<CommandResult> {
  const supabase = createClient()
  return callRpc(supabase, 'pause_timer', {
    p_bonfire_id: bonfireId,
    p_token: token ?? getToken(bonfireId),
  })
}

/** Skip to the next phase without completing the current one. */
export async function skipPhase(
  bonfireId: string,
  token?: string | null,
): Promise<CommandResult> {
  const supabase = createClient()
  return callRpc(supabase, 'skip_phase', {
    p_bonfire_id: bonfireId,
    p_token: token ?? getToken(bonfireId),
  })
}

/** Complete the current phase (called when client observes timer expiry). */
export async function completePhase(
  bonfireId: string,
  token?: string | null,
): Promise<CommandResult> {
  const supabase = createClient()
  return callRpc(supabase, 'complete_phase', {
    p_bonfire_id: bonfireId,
    p_token: token ?? getToken(bonfireId),
  })
}

/** Change session settings. */
export async function changeSettings(
  bonfireId: string,
  settings: {
    focusDuration?: number
    shortDuration?: number
    longDuration?: number
    roundsBeforeLong?: number
    sessionMode?: BonfireMode
  },
  token?: string | null,
): Promise<CommandResult> {
  const supabase = createClient()
  return callRpc(supabase, 'change_settings', {
    p_bonfire_id: bonfireId,
    p_token: token ?? getToken(bonfireId),
    p_focus_duration: settings.focusDuration,
    p_short_duration: settings.shortDuration,
    p_long_duration: settings.longDuration,
    p_rounds_before_long: settings.roundsBeforeLong,
    p_session_mode: settings.sessionMode,
  })
}

/**
 * Set the Bonfire name and/or the initiator's display name (initiator only).
 * name: undefined = unchanged, '' = clear. initiatorName: undefined = unchanged.
 */
export async function setBonfireDetails(
  bonfireId: string,
  details: { name?: string; initiatorName?: string },
  token?: string | null,
): Promise<CommandResult> {
  const supabase = createClient()
  return callRpc(supabase, 'set_bonfire_details', {
    p_bonfire_id: bonfireId,
    p_token: token ?? getToken(bonfireId),
    p_name: details.name ?? null,
    p_initiator_name: details.initiatorName ?? null,
  })
}

/** Toggle between focus and jam mode (initiator only). */
export async function toggleMode(
  bonfireId: string,
  token?: string | null,
): Promise<CommandResult> {
  const supabase = createClient()
  return callRpc(supabase, 'toggle_mode', {
    p_bonfire_id: bonfireId,
    p_token: token ?? getToken(bonfireId),
  })
}

/** End the bonfire (initiator only). */
export async function endBonfire(
  bonfireId: string,
  token?: string | null,
): Promise<CommandResult> {
  const supabase = createClient()
  return callRpc(supabase, 'end_bonfire', {
    p_bonfire_id: bonfireId,
    p_token: token ?? getToken(bonfireId),
  })
}

/** Resolve a 6-char join code to a bonfire ID. */
export async function resolveJoinCode(code: string): Promise<CommandResult<{ id: string }>> {
  const supabase = createClient()
  return callRpc<{ id: string }>(supabase, 'resolve_join_code', {
    p_code: code.toUpperCase(),
  })
}

export interface SeatClaim {
  participant_token: string
  bonfire_id: string
  seat: SeatIndex
}

/**
 * Claim a seat around the fire. Presenting a previous participant token
 * (or being the same signed-in user) reclaims the same credential.
 * Fails with "This bonfire is full" when six seats are held.
 */
export async function joinBonfire(
  bonfireId: string,
  name: string,
  token?: string | null,
): Promise<CommandResult<SeatClaim>> {
  const supabase = createClient()
  return callRpc<SeatClaim>(supabase, 'join_bonfire', {
    p_bonfire_id: bonfireId,
    p_name: name,
    p_token: token ?? null,
  })
}

/** Seat heartbeat. `data === false` means the seat lapsed and must be reclaimed. */
export async function touchSeat(
  bonfireId: string,
  token: string,
): Promise<CommandResult<boolean>> {
  const supabase = createClient()
  return callRpc<boolean>(supabase, 'touch_bonfire_seat', {
    p_bonfire_id: bonfireId,
    p_token: token,
  })
}

/** Step away: release the seat. */
export async function leaveBonfire(
  bonfireId: string,
  token: string,
): Promise<CommandResult<null>> {
  const supabase = createClient()
  return callRpc<null>(supabase, 'leave_bonfire', {
    p_bonfire_id: bonfireId,
    p_token: token,
  })
}

// ─── Read helpers ────────────────────────────────────────────

/** Fetch the current bonfire state from the database. */
export async function fetchBonfire(bonfireId: string): Promise<CommandResult> {
  const { data, error } = await selectBonfire(createClient(), bonfireId)
  if (error || !data) return { data: null, error: error ?? 'Bonfire not found' }
  return { data, error: null }
}
