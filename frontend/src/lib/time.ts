import { format } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'

export const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
export const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const fmtTime = (utc: string, tz: string) => formatInTimeZone(utc, tz, 'h:mm a')
export const fmtDate = (utc: string, tz: string) => formatInTimeZone(utc, tz, 'EEE, MMM d, yyyy')
export const fmtDateTime = (utc: string, tz: string) => formatInTimeZone(utc, tz, "EEE, MMM d 'at' h:mm a")
export const localDateOf = (utc: string, tz: string) => formatInTimeZone(utc, tz, 'yyyy-MM-dd')
export const localInputValue = (utc: string, tz: string) => formatInTimeZone(utc, tz, "yyyy-MM-dd'T'HH:mm")
export const inputToUtc = (local: string, tz: string) => fromZonedTime(local, tz).toISOString()
export const zonedParts = (utc: string, tz: string) => {
  const z = toZonedTime(utc, tz)
  return { hours: z.getHours(), minutes: z.getMinutes() }
}
export const todayInTz = (tz: string) => formatInTimeZone(new Date(), tz, 'yyyy-MM-dd')

export function money(cents: number, currency: string) {
  if (cents === 0) return 'Free'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}
export const duration = (mins: number) => (mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins} min`)
