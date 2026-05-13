import { create } from 'zustand'
import type { Project, Ticket, AppView } from '../types'
import { INIT_PROJECTS, INIT_TICKETS } from '../lib/data'
import { generateId, TODAY_STR } from '../lib/utils'

interface NewTicketDefaults {
  status?: Ticket['status']
  environmentId?: string
  startDate?: string
  endDate?: string
}

interface AppState {
  projects: Project[]
  tickets: Ticket[]
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
  saveTicket: (ticket: Ticket) => void
  deleteTicket: (id: string) => void
  moveTicket: (id: string, startDate: string, endDate: string) => void
  toggleConflicts: () => void
  openRegistry: () => void
  closeRegistry: () => void
  openEnvManager: () => void
  closeEnvManager: () => void
  saveProject: (project: Project) => void
  createProject: (name: string, description: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  projects: INIT_PROJECTS,
  tickets: INIT_TICKETS,
  selectedProjectId: 'p1',
  view: 'timeline',
  activeTicketId: null,
  ticketMode: null,
  newTicketDefaults: {},
  conflictPanelOpen: true,
  registryOpen: false,
  envManagerOpen: false,

  setView: (view) => set({ view }),

  setProject: (id) => set({ selectedProjectId: id, view: 'timeline' }),

  openTicket: (id, mode = 'view') =>
    set({ activeTicketId: id, ticketMode: mode, newTicketDefaults: {} }),

  closeTicket: () => set({ activeTicketId: null, ticketMode: null }),

  newTicket: (defaults = {}) =>
    set({ activeTicketId: null, ticketMode: 'create', newTicketDefaults: defaults }),

  saveTicket: (ticket) =>
    set((s) => {
      const exists = s.tickets.some((t) => t.id === ticket.id)
      return {
        tickets: exists
          ? s.tickets.map((t) => (t.id === ticket.id ? ticket : t))
          : [...s.tickets, ticket],
        activeTicketId: null,
        ticketMode: null,
      }
    }),

  deleteTicket: (id) =>
    set((s) => ({
      tickets: s.tickets.filter((t) => t.id !== id),
      activeTicketId: null,
      ticketMode: null,
    })),

  moveTicket: (id, startDate, endDate) =>
    set((s) => ({
      tickets: s.tickets.map((t) => (t.id === id ? { ...t, startDate, endDate } : t)),
    })),

  toggleConflicts: () => set((s) => ({ conflictPanelOpen: !s.conflictPanelOpen })),
  openRegistry: () => set({ registryOpen: true }),
  closeRegistry: () => set({ registryOpen: false }),
  openEnvManager: () => set({ envManagerOpen: true }),
  closeEnvManager: () => set({ envManagerOpen: false }),

  saveProject: (project) =>
    set((s) => {
      const exists = s.projects.some((p) => p.id === project.id)
      return {
        projects: exists
          ? s.projects.map((p) => (p.id === project.id ? project : p))
          : [...s.projects, project],
        selectedProjectId: project.id,
      }
    }),

  createProject: (name, description) => {
    const p: Project = {
      id: generateId('p'),
      name: name.trim(),
      description: description.trim(),
      createdAt: TODAY_STR,
      environments: [
        { id: generateId('env'), name: 'production', color: '#e11d48', order: 0 },
        { id: generateId('env'), name: 'staging', color: '#d97706', order: 1 },
        { id: generateId('env'), name: 'development', color: '#16a34a', order: 2 },
      ],
      modules: [],
    }
    set((s) => ({
      projects: [...s.projects, p],
      selectedProjectId: p.id,
      view: 'timeline' as AppView,
    }))
  },
}))
