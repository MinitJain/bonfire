const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' })

/** Returns a YYYY-MM-DD string in UTC for the given date or ISO string. */
export const toDayKey = (value: Date | string): string =>
  dayKeyFormatter.format(new Date(value))
