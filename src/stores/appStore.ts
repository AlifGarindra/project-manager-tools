import { create } from 'zustand'
import type { Ticket, AppView } from '../types'
import { EMPTY_FILTERS, type TicketFilters } from '../lib/ticketFilters'

export interface NewTicketDefaults {
  status?: Ticket['status']
  environmentId?: string
  startDate?: string
  endDate?: string
}

interface AppState {
  selectedProjectId: string
  view: AppView
  activeTicketId: string | null
  ticketMode: 'view' | 'edit' | 'create' | null
  newTicketDefaults: NewTicketDefaults
  conflictPanelOpen: boolean
  registryOpen: boolean
  envManagerOpen: boolean
  filters: TicketFilters

  setView: (view: AppView) => void
  setProject: (id: string) => void
  setFilters: (patch: Partial<TicketFilters>) => void
  clearFilters: () => void
  openTicket: (id: string, mode?: 'view' | 'edit') => void
  closeTicket: () => void
  newTicket: (defaults?: NewTicketDefaults) => void
  toggleConflicts: () => void
  openRegistry: () => void
  closeRegistry: () => void
  openEnvManager: () => void
  closeEnvManager: () => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedProjectId: '',
  view: 'dashboard',
  activeTicketId: null,
  ticketMode: null,
  newTicketDefaults: {},
  conflictPanelOpen: true,
  registryOpen: false,
  envManagerOpen: false,
  filters: EMPTY_FILTERS,

  setView:    (view) => set({ view }),
  // Filter modul/assignee scoped per project — reset saat pindah project
  setProject: (id)   => set({ selectedProjectId: id, view: 'timeline', filters: EMPTY_FILTERS }),
  setFilters:   (patch) => set(s => ({ filters: { ...s.filters, ...patch } })),
  clearFilters: ()      => set({ filters: EMPTY_FILTERS }),

  openTicket: (id, mode = 'view') =>
    set({ activeTicketId: id, ticketMode: mode, newTicketDefaults: {} }),
  closeTicket: () => set({ activeTicketId: null, ticketMode: null }),
  newTicket: (defaults = {}) =>
    set({ activeTicketId: null, ticketMode: 'create', newTicketDefaults: defaults }),

  toggleConflicts: () => set(s => ({ conflictPanelOpen: !s.conflictPanelOpen })),
  openRegistry:    () => set({ registryOpen: true }),
  closeRegistry:   () => set({ registryOpen: false }),
  openEnvManager:  () => set({ envManagerOpen: true }),
  closeEnvManager: () => set({ envManagerOpen: false }),
}))
