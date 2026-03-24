interface DayBar {
  date: string
  label: string    // e.g. "Mon"
  minutes: number
  isToday: boolean
}

interface WeeklyChartProps {
  days: DayBar[]
}

export function WeeklyChart({ days }: WeeklyChartProps) {
  const maxMinutes = Math.max(...days.map(d => d.minutes), 30) // floor at 30 so bars aren't full-height for tiny values
  const totalMinutes = days.reduce((s, d) => s + d.minutes, 0)
  const totalHours = (totalMinutes / 60).toFixed(1)

  return (
    <div
      className="p-5 rounded-2xl flex flex-col gap-5 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Last 7 days
        </h3>
        <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
          {totalHours}h focused
        </span>
      </div>

      <div className="flex items-end gap-2 h-[88px]">
        {days.map(day => {
          const barH = day.minutes > 0
            ? Math.max(4, Math.round((day.minutes / maxMinutes) * 68))
            : 0

          return (
            <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
              {/* Value label */}
              <span
                className="text-[10px] font-mono tabular-nums leading-none text-[var(--text-muted)]"
                style={{ visibility: day.minutes > 0 ? 'visible' : 'hidden' }}
              >
                {day.minutes}m
              </span>

              {/* Bar area — fixed height, bar grows from bottom */}
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    height: `${barH}px`,
                    background: day.isToday
                      ? 'var(--accent)'
                      : day.minutes > 0
                        ? 'rgba(232,71,42,0.5)'
                        : 'var(--bg-secondary)',
                  }}
                />
              </div>

              {/* Day label */}
              <span
                className={`text-[10px] leading-none font-medium ${day.isToday ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
              >
                {day.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
