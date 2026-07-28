export type TicketStatus = 'planned' | 'in-progress' | 'blocked' | 'done' | 'cancelled'
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type TicketType = 'backend' | 'mobile' | 'frontend-web'
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
  archived: boolean               // diarsip = disembunyikan dari dashboard & rekap
  environments: Environment[]
  modules: Module[]
}

export interface DeploymentEntry {
  id: string
  environmentId: string
  date: string        // YYYY-MM-DD — tanggal deploy ke env ini
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
  ticketType: TicketType          // arsitektur: modul sama tapi beda type ≠ conflict
  sowLink: string                 // URL SOW ('' = kosong)
  jiraLink: string                // URL tiket JIRA untuk detail requirement
  deployments: DeploymentEntry[]  // riwayat deployment ke setiap env
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

// Kesepakatan hasil diskusi atas sebuah konflik (per pasangan tiket).
// ticketA/ticketB selalu terurut (ticketA < ticketB) agar unik per pasangan.
export interface ConflictResolution {
  id: string
  projectId: string
  ticketA: string
  ticketB: string
  link: string    // URL notulen/hasil diskusi ('' = tidak ada)
  note: string    // kesepakatan & cara resolve
  createdAt: string
}
