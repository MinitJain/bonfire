import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { NumberField, parseWhole, settleWhole } from '@/components/bonfire/NumberField'

describe('parseWhole / settleWhole', () => {
  it('accepts only whole numbers in range', () => {
    expect(parseWhole('50', 1, 120)).toBe(50)
    expect(parseWhole('', 1, 120)).toBeNull()
    expect(parseWhole('0', 1, 120)).toBeNull()
    expect(parseWhole('500', 1, 120)).toBeNull()
    expect(parseWhole('2.5', 1, 120)).toBeNull()
  })
  it('settles to a clamped value, or the fallback when empty', () => {
    expect(settleWhole('', 1, 120, 25)).toBe(25)
    expect(settleWhole('0', 1, 120, 25)).toBe(1)
    expect(settleWhole('999', 1, 120, 25)).toBe(120)
    expect(settleWhole('45', 1, 120, 25)).toBe(45)
  })
})

function Harness({ initial = 120, onValue = () => {} }: { initial?: number; onValue?: (n: number) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <NumberField
        id="n"
        aria-label="Focus"
        value={value}
        min={1}
        max={120}
        onChange={v => { setValue(v); onValue(v) }}
      />
      <output data-testid="value">{value}</output>
    </>
  )
}

describe('NumberField', () => {
  it('can be cleared completely while editing (the "stuck at 1" bug)', () => {
    render(<Harness />)
    const input = screen.getByLabelText('Focus') as HTMLInputElement
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    expect(input.value).toBe('')
    expect(screen.getByTestId('value').textContent).toBe('120')
  })

  it('replaces 120 with 50 by typing', () => {
    const onValue = vi.fn()
    render(<Harness onValue={onValue} />)
    const input = screen.getByLabelText('Focus') as HTMLInputElement
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.change(input, { target: { value: '50' } })
    expect(input.value).toBe('50')
    expect(screen.getByTestId('value').textContent).toBe('50')
    expect(onValue).toHaveBeenLastCalledWith(50)
  })

  it('restores the last valid value when left empty', () => {
    render(<Harness initial={45} />)
    const input = screen.getByLabelText('Focus') as HTMLInputElement
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(input.value).toBe('45')
  })

  it('clamps an out-of-range value when the edit is finished', () => {
    render(<Harness initial={45} />)
    const input = screen.getByLabelText('Focus') as HTMLInputElement
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '0' } })
    expect(screen.getByTestId('value').textContent).toBe('45')
    fireEvent.blur(input)
    expect(input.value).toBe('1')
    expect(screen.getByTestId('value').textContent).toBe('1')
  })

  it('drops non-digits as they are typed', () => {
    render(<Harness />)
    const input = screen.getByLabelText('Focus') as HTMLInputElement
    fireEvent.change(input, { target: { value: '4a5' } })
    expect(input.value).toBe('45')
  })
})
