import { useMemo } from 'react'
import { detectConflicts, getConflictZones, type ConflictZone } from '../lib/conflict'
import type { Ticket, ConflictPair } from '../types'

export function useConflicts(tickets: Ticket[]): ConflictPair[] {
  return useMemo(() => detectConflicts(tickets), [tickets])
}

// Zona overlap per-environment untuk overlay timeline
export function useConflictZones(tickets: Ticket[]): ConflictZone[] {
  return useMemo(() => getConflictZones(tickets), [tickets])
}

/**
 * Preview konflik untuk draft ticket yang belum disimpan (form modal).
 * Draft menggantikan versi tersimpannya (jika edit); hasil difilter hanya
 * konflik yang melibatkan draft itu sendiri.
 */
export function useDraftConflicts(tickets: Ticket[], draft: Ticket | null): ConflictPair[] {
  return useMemo(() => {
    if (!draft || !draft.projectId) return []
    const others = tickets.filter(t => t.id !== draft.id)
    return detectConflicts([...others, draft])
      .filter(c => c.ticket1Id === draft.id || c.ticket2Id === draft.id)
  }, [tickets, draft])
}
