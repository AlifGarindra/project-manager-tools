import { format, addDays as dfAddDays, differenceInCalendarDays } from 'date-fns'

export const TODAY = new Date()
export const TODAY_STR = format(TODAY, 'yyyy-MM-dd')

export function offset(n: number): string {
  const d = dfAddDays(TODAY, n)
  return format(d, 'yyyy-MM-dd')
}

export function addDays(dateStr: string, n: number): string {
  const d = dfAddDays(new Date(dateStr), n)
  return format(d, 'yyyy-MM-dd')
}

export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(new Date(b), new Date(a))
}

export function formatDate(s: string | null): string {
  if (!s) return '—'
  return format(new Date(s), 'MMM d')
}

export function formatDateFull(s: string | null): string {
  if (!s) return '—'
  return format(new Date(s), 'MMM d, yyyy')
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
