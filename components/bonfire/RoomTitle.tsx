import type { BonfireState } from '@/types'

interface RoomTitleProps {
  state: Pick<BonfireState, 'name' | 'focus_duration' | 'short_duration' | 'long_duration'>
}

const minutes = (seconds: number) => Math.round(seconds / 60)

/**
 * The Bonfire name (if any) and its configuration, quietly, at the top of the scene:
 *
 *   Deep Work
 *   25 · 5 · 15      (focus · short rest · long rest, minutes)
 */
export function RoomTitle({ state }: RoomTitleProps) {
  const config = `${minutes(state.focus_duration)} · ${minutes(state.short_duration)} · ${minutes(state.long_duration)}`
  return (
    <div className="bf-room-title">
      {state.name && <h1 className="bf-room-name">{state.name}</h1>}
      <p
        className="bf-room-config"
        aria-label={`${minutes(state.focus_duration)} minute focus, ${minutes(state.short_duration)} minute short rest, ${minutes(state.long_duration)} minute long rest`}
      >
        {config}
      </p>
    </div>
  )
}
