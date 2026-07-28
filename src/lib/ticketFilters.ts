import type { Ticket, TicketStatus, TicketType } from '../types'

// Filter tampilan tiket (Timeline & Board). Array kosong = dimensi tidak aktif.
// Konflik & zona TETAP dihitung dari semua tiket project — filter hanya
// mempersempit marker/card yang digambar, tidak menyembunyikan kebenaran konflik.
export interface TicketFilters {
  search: string
  types: TicketType[]
  statuses: TicketStatus[]
  moduleIds: string[]
  assignees: string[]      // '' berarti unassigned
}

export const EMPTY_FILTERS: TicketFilters = {
  search: '',
  types: [],
  statuses: [],
  moduleIds: [],
  assignees: [],
}

export function countActiveFilters(f: TicketFilters): number {
  return (
    (f.search.trim() ? 1 : 0) +
    (f.types.length > 0 ? 1 : 0) +
    (f.statuses.length > 0 ? 1 : 0) +
    (f.moduleIds.length > 0 ? 1 : 0) +
    (f.assignees.length > 0 ? 1 : 0)
  )
}

export function filterTickets(
  tickets: Ticket[],
  f: TicketFilters,
  moduleNames: Record<string, string> = {},
): Ticket[] {
  const q = f.search.trim().toLowerCase()
  if (q === '' && countActiveFilters(f) === 0) return tickets

  return tickets.filter(t => {
    if (f.types.length > 0 && !f.types.includes(t.ticketType)) return false
    if (f.statuses.length > 0 && !f.statuses.includes(t.status)) return false
    if (f.moduleIds.length > 0 && !t.modules.some(m => f.moduleIds.includes(m))) return false
    if (f.assignees.length > 0 && !f.assignees.includes(t.assignee.trim())) return false
    if (q) {
      const haystack = [t.title, t.description, t.assignee, ...t.modules.map(m => moduleNames[m] ?? '')]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}
