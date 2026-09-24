import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoomActions } from '@/components/bonfire/RoomActions'
import { RoomTitle } from '@/components/bonfire/RoomTitle'

describe('RoomActions', () => {
  it('everyone can step away; only the initiator sees End Bonfire', () => {
    const { rerender } = render(<RoomActions isInitiator={false} leaving={false} onStepAway={() => {}} onEnd={async () => {}} />)
    expect(screen.getByRole('button', { name: 'Step away' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'End Bonfire' })).toBeNull()
    rerender(<RoomActions isInitiator leaving={false} onStepAway={() => {}} onEnd={async () => {}} />)
    expect(screen.getByRole('button', { name: 'End Bonfire' })).toBeTruthy()
  })

  it('End asks "End for everyone?" and Keep burning cancels', () => {
    const onEnd = vi.fn(async () => {})
    render(<RoomActions isInitiator leaving={false} onStepAway={() => {}} onEnd={onEnd} />)
    fireEvent.click(screen.getByRole('button', { name: 'End Bonfire' }))
    expect(screen.getByText('End for everyone?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keep burning' }))
    expect(onEnd).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'End Bonfire' })).toBeTruthy()
  })

  it('confirming End calls onEnd', () => {
    const onEnd = vi.fn(async () => {})
    render(<RoomActions isInitiator leaving={false} onStepAway={() => {}} onEnd={onEnd} />)
    fireEvent.click(screen.getByRole('button', { name: 'End Bonfire' }))
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    expect(onEnd).toHaveBeenCalledTimes(1)
  })
})

describe('RoomTitle', () => {
  it('shows the Bonfire name and focus · short · long in minutes', () => {
    render(<RoomTitle state={{ name: 'Deep Work', focus_duration: 1500, short_duration: 300, long_duration: 900 }} />)
    expect(screen.getByText('Deep Work')).toBeTruthy()
    expect(screen.getByText('25 · 5 · 15')).toBeTruthy()
  })
  it('shows only the configuration when unnamed', () => {
    render(<RoomTitle state={{ name: null, focus_duration: 3000, short_duration: 600, long_duration: 1200 }} />)
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByText('50 · 10 · 20')).toBeTruthy()
  })
})
