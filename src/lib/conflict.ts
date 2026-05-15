import type { Ticket, ConflictPair } from '../types'

const FAR_FUTURE = '2099-12-31'

interface DeploymentRange {
  ticketId: string
  projectId: string
  environmentId: string
  modules: string[]
  startDate: string
  endDate: string
}

/**
 * Expand a ticket's deployment history into date ranges per environment.
 * - Intermediate entries: [deployDate, nextDeployDate)
 * - Last entry: [deployDate, ticket.endDate] if endDate set, else [deployDate, deployDate]
 *   (point-in-time: conflict window closes at last deployment unless explicitly extended)
 * - No deployments: falls back to [startDate, endDate]
 */
function getDeploymentRanges(ticket: Ticket): DeploymentRange[] {
  if (ticket.status === 'done' || ticket.status === 'cancelled') return []

  const base = { ticketId: ticket.id, projectId: ticket.projectId, modules: ticket.modules }

  if (ticket.deployments.length === 0) {
    return [{
      ...base,
      environmentId: ticket.environmentId,
      startDate: ticket.startDate,
      endDate: ticket.endDate ?? FAR_FUTURE,
    }]
  }

  const sorted = [...ticket.deployments].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((dep, i) => ({
    ...base,
    environmentId: dep.environmentId,
    startDate: dep.date,
    // Last entry: use ticket.endDate if explicitly set, otherwise close at this deployment date
    endDate: i < sorted.length - 1 ? sorted[i + 1].date : (ticket.endDate ?? dep.date),
  }))
}

/**
 * Detect conflicts across all tickets.
 * For each ticket pair: check all combinations of their deployment ranges.
 * Reports the worst conflict (hard > soft) per pair.
 */
export function detectConflicts(tickets: Ticket[]): ConflictPair[] {
  const result: ConflictPair[] = []
  const active = tickets.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const rangesMap = new Map(active.map(t => [t.id, getDeploymentRanges(t)]))

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const tA = active[i]
      const tB = active[j]
      if (tA.projectId !== tB.projectId) continue

      const shared = tA.modules.filter(m => tB.modules.includes(m))
      if (shared.length === 0) continue

      const rangesA = rangesMap.get(tA.id) ?? []
      const rangesB = rangesMap.get(tB.id) ?? []

      let worst: ConflictPair | null = null

      for (const rA of rangesA) {
        for (const rB of rangesB) {
          if (!(rA.startDate <= rB.endDate && rB.startDate <= rA.endDate)) continue

          const overlapStart = rA.startDate > rB.startDate ? rA.startDate : rB.startDate
          const rawEnd       = rA.endDate < rB.endDate ? rA.endDate : rB.endDate
          const overlapEnd   = rawEnd === FAR_FUTURE ? overlapStart : rawEnd
          const type         = rA.environmentId === rB.environmentId ? 'hard' : 'soft'

          if (!worst || (type === 'hard' && worst.type === 'soft')) {
            worst = {
              id: `c-${tA.id}-${tB.id}`,
              ticket1Id: tA.id,
              ticket2Id: tB.id,
              modules: shared,
              type,
              projectId: tA.projectId,
              overlapStart,
              overlapEnd,
            }
          }
        }
      }

      if (worst) result.push(worst)
    }
  }

  return result
}

// Legacy helpers kept for hooks/components that still reference them
export function isCheckable(ticket: Ticket): boolean {
  return ticket.status !== 'done' && ticket.status !== 'cancelled'
}

export function datesOverlap(a: Ticket, b: Ticket): boolean {
  if (!a.endDate || !b.endDate) return false
  return a.startDate <= b.endDate && b.startDate <= a.endDate
}

export function modulesOverlap(a: Ticket, b: Ticket): string[] {
  return a.modules.filter(m => b.modules.includes(m))
}
