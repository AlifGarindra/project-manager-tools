import { create } from 'zustand'
import type { Ticket, AppView } from '../types'

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

  setView: (view: AppView) => void
  setProject: (id: string) => void
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

  setView:    (view) => set({ view }),
  setProject: (id)   => set({ selectedProjectId: id, view: 'timeline' }),

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
