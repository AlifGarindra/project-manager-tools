import { format, addDays as dfAddDays, differenceInCalendarDays } from 'date-fns'
import type { Ticket } from '../types'

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

// Supabase tables use uuid type — must produce valid UUIDs
export function generateId(_prefix?: string): string {
  return crypto.randomUUID()
}

// endDate = latest deployment date to the ticket's current environment
export function deriveEndDate(ticket: Ticket): string | null {
  if (ticket.deployments.length === 0) return ticket.endDate
  const toCurrentEnv = ticket.deployments
    .filter(d => d.environmentId === ticket.environmentId)
    .sort((a, b) => b.date.localeCompare(a.date))
  return toCurrentEnv[0]?.date ?? null
}

export function withDerivedEndDate(ticket: Ticket): Ticket {
  return { ...ticket, endDate: deriveEndDate(ticket) }
}
