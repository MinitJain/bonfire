'use client'

import { useEffect, useRef, useState } from 'react'

/** A whole number within [min, max], or null for anything else (including ''). */
export function parseWhole(draft: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(draft.trim())) return null
  const n = Number(draft)
  return n >= min && n <= max ? n : null
}

/**
 * The value a finished edit settles on: clamped into range, or the last
 * valid value when the field was left empty.
 */
export function settleWhole(draft: string, min: number, max: number, fallback: number): number {
  const digits = draft.trim()
  if (!/^\d+$/.test(digits)) return fallback
  return Math.min(max, Math.max(min, Number(digits)))
}

interface NumberFieldProps {
  id: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  className?: string
  'aria-label'?: string
  autoFocus?: boolean
  onEnter?: () => void
}

/**
 * A whole-number input that lets people edit freely.
 *
 * The text being typed is local, so the field can be empty or briefly out
 * of range while someone replaces "120" with "50". onChange only reports
 * valid values; leaving the field settles it (clamp, or restore the last
 * valid value if it was left empty).
 */
export function NumberField({
  id,
  value,
  min,
  max,
  onChange,
  className = 'bf-input',
  onEnter,
  ...rest
}: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value))
  const focused = useRef(false)

  // Follow outside changes (another participant saved settings) unless mid-edit
  useEffect(() => {
    if (!focused.current) setDraft(String(value))
  }, [value])

  const settle = () => {
    const settled = settleWhole(draft, min, max, value)
    setDraft(String(settled))
    if (settled !== value) onChange(settled)
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={draft}
      maxLength={String(max).length}
      onFocus={e => {
        focused.current = true
        // Typing replaces the value, as people expect when they tab or tap in
        e.currentTarget.select()
      }}
      onChange={e => {
        const next = e.target.value.replace(/\D/g, '')
        setDraft(next)
        const n = parseWhole(next, min, max)
        if (n !== null && n !== value) onChange(n)
      }}
      onBlur={() => {
        focused.current = false
        settle()
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          settle()
          onEnter?.()
        }
      }}
      className={className}
      {...rest}
    />
  )
}
