import { useMemo } from 'react'
import { detectConflicts } from '../lib/conflict'
import type { Ticket, ConflictPair } from '../types'

export function useConflicts(tickets: Ticket[]): ConflictPair[] {
  return useMemo(() => detectConflicts(tickets), [tickets])
}
