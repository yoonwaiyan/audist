const UNITS: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { limit: 60, divisor: 1, unit: 'second' },
  { limit: 3600, divisor: 60, unit: 'minute' },
  { limit: 86400, divisor: 3600, unit: 'hour' },
  { limit: 2592000, divisor: 86400, unit: 'day' },
  { limit: 31536000, divisor: 2592000, unit: 'month' }
]

const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** Formats an ISO timestamp as a short relative-time string, e.g. "2 hours ago". */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime()
  const diffSeconds = Math.round((now.getTime() - then) / 1000)

  if (diffSeconds < 5) return 'just now'

  for (const { limit, divisor, unit } of UNITS) {
    if (diffSeconds < limit) {
      return formatter.format(-Math.round(diffSeconds / divisor), unit)
    }
  }

  const years = Math.round(diffSeconds / 31536000)
  return formatter.format(-years, 'year')
}
