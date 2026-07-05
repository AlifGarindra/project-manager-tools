import { format, addDays as dfAddDays, differenceInCalendarDays, parseISO } from 'date-fns'
import type { Ticket } from '../types'

export const TODAY = new Date()
export const TODAY_STR = format(TODAY, 'yyyy-MM-dd')

export function offset(n: number): string {
  const d = dfAddDays(TODAY, n)
  return format(d, 'yyyy-MM-dd')
}

export function addDays(dateStr: string, n: number): string {
  const d = dfAddDays(parseISO(dateStr), n)
  return format(d, 'yyyy-MM-dd')
}

export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a))
}

export function formatDate(s: string | null): string {
  if (!s) return '—'
  return format(parseISO(s), 'MMM d')
}

export function formatDateFull(s: string | null): string {
  if (!s) return '—'
  return format(parseISO(s), 'MMM d, yyyy')
}

// Parse a YYYY-MM-DD string as a local-time Date (timezone-safe)
export function parseDate(s: string): Date {
  return parseISO(s)
}

// Supabase tables use uuid type — must produce valid UUIDs
export function generateId(_prefix?: string): string {
  return crypto.randomUUID()
}

// endDate = deployment date to topmost env (order=0); null if not yet deployed there.
// topEnvId = id of environment with order=0 (production / highest tier).
// Falls back to latest deployment to current env when topEnvId is not provided.
export function deriveEndDate(ticket: Ticket, topEnvId?: string): string | null {
  if (ticket.deployments.length === 0) return ticket.endDate
  if (topEnvId) {
    const hit = ticket.deployments
      .filter(d => d.environmentId === topEnvId)
      .sort((a, b) => b.date.localeCompare(a.date))
    return hit[0]?.date ?? null
  }
  const toCurrentEnv = ticket.deployments
    .filter(d => d.environmentId === ticket.environmentId)
    .sort((a, b) => b.date.localeCompare(a.date))
  return toCurrentEnv[0]?.date ?? null
}

export function withDerivedEndDate(ticket: Ticket, topEnvId?: string): Ticket {
  return { ...ticket, endDate: deriveEndDate(ticket, topEnvId) }
}
