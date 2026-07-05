import type { Ticket, ConflictPair, ConflictResolution } from '../types'
import { addDays, daysBetween, TODAY_STR } from './utils'

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
      // Different architecture (backend vs mobile vs frontend-web) never conflicts,
      // even on the same module — they deploy independently
      if (tA.ticketType !== tB.ticketType) continue

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

/**
 * Zona konflik per-environment untuk digambar di timeline.
 * Berbeda dengan ConflictPair (satu ringkasan per pasangan tiket), zones
 * memuat SEMUA jendela overlap, ditempatkan di environment tempat overlap
 * itu benar-benar terjadi:
 * - hard (env sama)  → satu zona di env tersebut
 * - soft (beda env)  → satu zona di masing-masing env yang terlibat
 */
export interface ConflictZone {
  id: string
  projectId: string
  environmentId: string
  type: 'hard' | 'soft'
  startDate: string
  endDate: string
}

export function getConflictZones(tickets: Ticket[]): ConflictZone[] {
  const zones = new Map<string, ConflictZone>()
  const active = tickets.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const rangesMap = new Map(active.map(t => [t.id, getDeploymentRanges(t)]))

  const addZone = (projectId: string, environmentId: string, type: 'hard' | 'soft', startDate: string, endDate: string) => {
    const key = `${projectId}:${environmentId}:${type}:${startDate}:${endDate}`
    if (!zones.has(key)) zones.set(key, { id: key, projectId, environmentId, type, startDate, endDate })
  }

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const tA = active[i]
      const tB = active[j]
      if (tA.projectId !== tB.projectId) continue
      if (tA.ticketType !== tB.ticketType) continue
      if (tA.modules.filter(m => tB.modules.includes(m)).length === 0) continue

      for (const rA of rangesMap.get(tA.id) ?? []) {
        for (const rB of rangesMap.get(tB.id) ?? []) {
          if (!(rA.startDate <= rB.endDate && rB.startDate <= rA.endDate)) continue

          const overlapStart = rA.startDate > rB.startDate ? rA.startDate : rB.startDate
          const rawEnd       = rA.endDate < rB.endDate ? rA.endDate : rB.endDate
          const overlapEnd   = rawEnd === FAR_FUTURE ? overlapStart : rawEnd

          if (rA.environmentId === rB.environmentId) {
            addZone(tA.projectId, rA.environmentId, 'hard', overlapStart, overlapEnd)
          } else {
            addZone(tA.projectId, rA.environmentId, 'soft', overlapStart, overlapEnd)
            addZone(tA.projectId, rB.environmentId, 'soft', overlapStart, overlapEnd)
          }
        }
      }
    }
  }

  return Array.from(zones.values())
}

/**
 * Cari tanggal start terdekat yang bebas konflik untuk sebuah draft ticket.
 * Menggeser startDate (dan endDate, durasi dipertahankan) maju/mundur per hari,
 * maju diprioritaskan, tanggal lampau dilewati. Hanya berlaku untuk tiket yang
 * belum punya deployment (range-nya masih ditentukan startDate).
 * Return null jika tidak ketemu dalam maxShiftDays atau tidak applicable.
 */
export function findNearestFreeDate(
  otherTickets: Ticket[],
  draft: Ticket,
  maxShiftDays = 90,
): string | null {
  if (draft.deployments.length > 0) return null
  const duration = draft.endDate ? daysBetween(draft.startDate, draft.endDate) : null

  for (let delta = 1; delta <= maxShiftDays; delta++) {
    for (const dir of [1, -1]) {
      const newStart = addDays(draft.startDate, delta * dir)
      if (newStart < TODAY_STR) continue
      const candidate: Ticket = {
        ...draft,
        startDate: newStart,
        endDate: duration !== null ? addDays(newStart, duration) : null,
      }
      const hits = detectConflicts([...otherTickets, candidate])
        .filter(c => c.ticket1Id === draft.id || c.ticket2Id === draft.id)
      if (hits.length === 0) return newStart
    }
  }
  return null
}

// Kunci pasangan tiket terurut — cocok dengan (ticket_a, ticket_b) di DB
export function sortedPair(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1]
}

export function findResolution(
  resolutions: ConflictResolution[],
  conflict: ConflictPair,
): ConflictResolution | undefined {
  const [a, b] = sortedPair(conflict.ticket1Id, conflict.ticket2Id)
  return resolutions.find(r => r.ticketA === a && r.ticketB === b)
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
