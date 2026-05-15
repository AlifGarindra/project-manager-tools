import { create } from 'zustand'
import type { Project, Ticket, AppView } from '../types'
import { INIT_PROJECTS, INIT_TICKETS } from '../lib/data'
import { generateId, TODAY_STR } from '../lib/utils'

/**
 * endDate = tanggal deployment terbaru ke environment saat ini (ticket.environmentId).
 * Jika belum pernah deploy ke env tersebut, endDate = null.
 */
function deriveEndDate(ticket: Ticket): string | null {
  if (ticket.deployments.length === 0) return ticket.endDate
  const toCurrentEnv = ticket.deployments
    .filter(d => d.environmentId === ticket.environmentId)
    .sort((a, b) => b.date.localeCompare(a.date))
  return toCurrentEnv[0]?.date ?? null
}

function withDerivedEndDate(ticket: Ticket): Ticket {
  return { ...ticket, endDate: deriveEndDate(ticket) }
}

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
  moveTicket: (id: string, startDate: string, endDate: string, environmentId?: string) => void
  removeDeploymentEntry: (ticketId: string, environmentId: string, date: string) => void
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
  tickets: INIT_TICKETS.map(withDerivedEndDate),
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
      const t = withDerivedEndDate(ticket)
      const exists = s.tickets.some((x) => x.id === t.id)
      return {
        tickets: exists
          ? s.tickets.map((x) => (x.id === t.id ? t : x))
          : [...s.tickets, t],
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

  moveTicket: (id, startDate, _endDate, environmentId?) =>
    set((s) => ({
      tickets: s.tickets.map((t) => {
        if (t.id !== id) return t
        const envChanged = environmentId && environmentId !== t.environmentId
        const updated: Ticket = {
          ...t,
          startDate,
          ...(environmentId ? { environmentId } : {}),
          deployments: envChanged
            ? [
                ...t.deployments,
                { id: generateId('dep'), environmentId: environmentId!, date: startDate },
              ]
            : t.deployments,
          endDate: t.endDate,  // placeholder, re-derived below
        }
        return withDerivedEndDate(updated)
      }),
    })),

  removeDeploymentEntry: (ticketId, environmentId, date) =>
    set((s) => ({
      tickets: s.tickets.map(t => {
        if (t.id !== ticketId) return t
        const sorted = [...t.deployments].sort((a, b) => a.date.localeCompare(b.date))
        const idx = sorted.findIndex(d => d.environmentId === environmentId && d.date === date)
        if (idx === -1) return t
        const updated: Ticket = { ...t, deployments: sorted.slice(0, idx) }
        return withDerivedEndDate(updated)
      }),
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
