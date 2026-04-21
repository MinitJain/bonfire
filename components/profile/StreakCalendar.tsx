'use client'
import { toDayKey } from '@/lib/date'

interface CalendarCell {
  date: string    // YYYY-MM-DD
  minutes: number
}

interface StreakCalendarProps {
  cells: CalendarCell[]   // exactly 371 cells (53 weeks), Mon → Sun per column, oldest first
  totalMinutesYear: number
  totalPomodorosYear: number
}

// Color intensity by focus minutes that day
function cellColor(minutes: number): string {
  if (minutes === 0) return 'var(--bg-secondary)'
  if (minutes < 25) return 'rgba(232,71,42,0.2)'
  if (minutes < 60) return 'rgba(232,71,42,0.45)'
  if (minutes < 120) return 'rgba(232,71,42,0.7)'
  return 'var(--accent)'
}

const DAY_LABELS = ['M', '', 'W', '', 'F', '', ''] // Mon=0 … Sun=6 (ISO)
const WEEKS = 53

export function StreakCalendar({ cells, totalMinutesYear, totalPomodorosYear }: StreakCalendarProps) {
  // Compute today as a UTC-based day key (YYYY-MM-DD) to match server cell.date keys
  const todayStr = toDayKey(new Date())
  // Derive month labels: find first cell of each month to get column index
  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  cells.forEach((cell, i) => {
    const col = Math.floor(i / 7)
    const month = new Date(cell.date + 'T12:00:00Z').getUTCMonth()
    if (month !== lastMonth) {
      lastMonth = month
      const label = new Date(cell.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
      // Only add if there's room (not last column)
      if (col < WEEKS - 1) monthLabels.push({ label, col })
    }
  })

  const totalHours = Math.floor(totalMinutesYear / 60)
  const activeDays = cells.filter(c => c.minutes > 0).length

  return (
    <div className="p-5 rounded-2xl flex flex-col gap-4 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-sm)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Focus activity
        </h3>
        <span className="text-xs text-[var(--text-muted)]">
          {totalPomodorosYear} sessions · {totalHours}h in the last year
        </span>
      </div>

      {/* Calendar grid — scrolls horizontally on small screens */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div style={{ minWidth: `${WEEKS * 14}px` }}>
          {/* Month labels row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `16px repeat(${WEEKS}, 12px)`,
              gap: '2px',
              marginBottom: '4px',
            }}
          >
            <div /> {/* spacer for day-label column */}
            {Array.from({ length: WEEKS }, (_, col) => {
              const match = monthLabels.find(m => m.col === col)
              return (
                <div
                  key={col}
                  className="text-[9px] leading-none text-[var(--text-muted)] whitespace-nowrap"
                >
                  {match ? match.label : ''}
                </div>
              )
            })}
          </div>

          {/* Day labels + grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `16px repeat(${WEEKS}, 12px)`,
              gridTemplateRows: 'repeat(7, 12px)',
              gridAutoFlow: 'column',
              gap: '2px',
            }}
          >
            {/* Day-of-week labels — only first column */}
            {DAY_LABELS.map((label, row) => (
              <div
                key={`label-${row}`}
                className="text-[9px] leading-none flex items-center text-[var(--text-muted)]"
                style={{ gridColumn: 1, gridRow: row + 1 }}
              >
                {label}
              </div>
            ))}

            {/* Calendar cells */}
            {cells.map((cell, i) => {
              const col = Math.floor(i / 7) + 2 // +2 because col 1 is day labels
              const row = (i % 7) + 1
              return (
                <div
                  key={cell.date}
                  title={cell.minutes > 0 ? `${cell.date}: ${cell.minutes} min` : cell.date}
                  style={{
                    gridColumn: col,
                    gridRow: row,
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    background: cellColor(cell.minutes),
                    outline: cell.date === todayStr ? '1.5px solid var(--accent)' : undefined,
                    outlineOffset: '1px',
                    cursor: cell.minutes > 0 ? 'default' : undefined,
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">Less</span>
        {[0, 1, 25, 60, 120].map(m => (
          <div
            key={m}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              background: cellColor(m),
              border: m === 0 ? '1px solid var(--border)' : undefined,
            }}
          />
        ))}
        <span className="text-[10px] text-[var(--text-muted)]">More</span>
        <span className="text-[10px] ml-auto text-[var(--text-muted)]">
          {activeDays} active days
        </span>
      </div>
    </div>
  )
}
