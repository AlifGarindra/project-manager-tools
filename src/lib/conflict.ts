import type { Ticket, ConflictPair } from '../types'

export function isCheckable(ticket: Ticket): boolean {
  if (ticket.status === 'done' || ticket.status === 'cancelled') return false
  if (ticket.endDate === null) return false
  return true
}

export function datesOverlap(a: Ticket, b: Ticket): boolean {
  if (!a.endDate || !b.endDate) return false
  return a.startDate <= b.endDate && b.startDate <= a.endDate
}

export function modulesOverlap(a: Ticket, b: Ticket): string[] {
  return a.modules.filter(m => b.modules.includes(m))
}

export function detectConflicts(tickets: Ticket[]): ConflictPair[] {
  const result: ConflictPair[] = []
  const active = tickets.filter(isCheckable)

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]
      const b = active[j]
      if (a.projectId !== b.projectId) continue
      if (!datesOverlap(a, b)) continue

      const shared = modulesOverlap(a, b)
      if (shared.length === 0) continue

      const overlapStart = a.startDate > b.startDate ? a.startDate : b.startDate
      const overlapEnd = a.endDate! < b.endDate! ? a.endDate! : b.endDate!

      result.push({
        id: `c-${a.id}-${b.id}`,
        ticket1Id: a.id,
        ticket2Id: b.id,
        modules: shared,
        type: a.environmentId === b.environmentId ? 'hard' : 'soft',
        projectId: a.projectId,
        overlapStart,
        overlapEnd,
      })
    }
  }

  return result
}
