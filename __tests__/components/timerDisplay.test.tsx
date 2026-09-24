import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimerDisplay, phaseProgress, roundMarks, roundPosition } from '@/components/bonfire/TimerDisplay'

describe('phaseProgress', () => {
  it('is the share of the phase that has passed', () => {
    expect(phaseProgress(1500, 1500)).toBe(0)
    expect(phaseProgress(750, 1500)).toBe(0.5)
    expect(phaseProgress(0, 1500)).toBe(1)
  })
  it('stays within 0..1', () => {
    expect(phaseProgress(2000, 1500)).toBe(0)
    expect(phaseProgress(-5, 1500)).toBe(1)
    expect(phaseProgress(10, 0)).toBe(0)
  })
})

describe('roundMarks', () => {
  it('marks the current focus round as now', () => {
    expect(roundMarks(2, 4, 'focus')).toEqual(['done', 'now', 'ahead', 'ahead'])
  })
  it('counts the round as done during its rest', () => {
    expect(roundMarks(2, 4, 'short')).toEqual(['done', 'done', 'ahead', 'ahead'])
    expect(roundMarks(4, 4, 'long')).toEqual(['done', 'done', 'done', 'done'])
  })
  it('starts a new set after the long rest (server increments the round)', () => {
    expect(roundMarks(5, 4, 'focus')).toEqual(['now', 'ahead', 'ahead', 'ahead'])
    expect(roundPosition(5, 4)).toBe(1)
  })
})

describe('TimerDisplay', () => {
  const base = {
    timeLeft: 600,
    totalTime: 1500,
    running: true,
    started: true,
    phase: 'focus' as const,
    mode: 'focus' as const,
    round: 1,
    roundsBeforeLong: 4,
    todayCount: null as number | null,
  }

  it('shows progress of the current phase', () => {
    render(<TimerDisplay {...base} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('60')
    expect(bar.getAttribute('aria-valuetext')).toBe('10 minutes left')
    expect(bar.getAttribute('data-phase')).toBe('focus')
  })

  it("shows this person's count for today once there is one", () => {
    const { rerender } = render(<TimerDisplay {...base} />)
    expect(screen.queryByText(/today/)).toBeNull()
    rerender(<TimerDisplay {...base} todayCount={0} />)
    expect(screen.queryByText(/today/)).toBeNull()
    rerender(<TimerDisplay {...base} todayCount={3} />)
    expect(screen.getByText('3 today')).toBeTruthy()
    expect(screen.getByLabelText('3 pomodoros completed today')).toBeTruthy()
  })
})
