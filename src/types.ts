export type TicketStatus = 'planned' | 'in-progress' | 'blocked' | 'done' | 'cancelled'
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type ConflictType = 'hard' | 'soft'
export type AppView = 'dashboard' | 'timeline' | 'board'

export interface Environment {
  id: string
  name: string
  color: string
  order: number
}

export interface Module {
  id: string
  name: string
  category: string
}

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  environments: Environment[]
  modules: Module[]
}

export interface Ticket {
  id: string
  projectId: string
  title: string
  description: string
  startDate: string
  endDate: string | null
  environmentId: string
  status: TicketStatus
  assignee: string
  modules: string[]
  priority: TicketPriority
}

export interface ConflictPair {
  id: string
  ticket1Id: string
  ticket2Id: string
  modules: string[]
  type: ConflictType
  projectId: string
  overlapStart: string
  overlapEnd: string
}
