import { supabase } from './supabase'
import { withDerivedEndDate } from './utils'
import type { Project, Ticket, Environment, Module } from '../types'

// ── Raw DB row types ──────────────────────────────────────────────────────────

interface DbProject {
  id: string
  name: string
  description: string | null
  created_at: string
  environments: { id: string; name: string; color: string; sort_order: number }[]
  modules:      { id: string; name: string; category: string }[]
}

interface DbTicket {
  id: string
  project_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  environment_id: string
  status: string
  assignee: string | null
  priority: string
  deployment_entries: { id: string; environment_id: string; date: string }[]
  ticket_modules: { module_id: string }[]
}

// ── Transformers ─────────────────────────────────────────────────────────────

function toProject(raw: DbProject): Project {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? '',
    createdAt: raw.created_at.slice(0, 10),
    environments: [...raw.environments]
      .map(e => ({ id: e.id, name: e.name, color: e.color, order: e.sort_order }))
      .sort((a, b) => a.order - b.order),
    modules: raw.modules,
  }
}

function toTicket(raw: DbTicket): Ticket {
  const base: Ticket = {
    id: raw.id,
    projectId: raw.project_id,
    title: raw.title,
    description: raw.description ?? '',
    startDate: raw.start_date,
    endDate: raw.end_date,
    environmentId: raw.environment_id,
    status: raw.status as Ticket['status'],
    assignee: raw.assignee ?? '',
    priority: raw.priority as Ticket['priority'],
    modules: raw.ticket_modules.map(tm => tm.module_id),
    deployments: raw.deployment_entries.map(de => ({
      id: de.id,
      environmentId: de.environment_id,
      date: de.date,
    })),
  }
  return withDerivedEndDate(base)
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, created_at, environments(id, name, color, sort_order), modules(id, name, category)')
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[fetchProjects]', error)
    throw error
  }
  return (data as DbProject[]).map(toProject)
}

export async function createProject(input: {
  name: string
  description: string
  userId: string
}): Promise<Project> {
  if (!supabase) throw new Error('Supabase not configured')

  const { data: proj, error: projErr } = await supabase
    .from('projects')
    .insert({ name: input.name, description: input.description, created_by: input.userId })
    .select('id, name, description, created_at')
    .single()
  if (projErr) throw projErr

  const defaultEnvs = [
    { project_id: proj.id, name: 'production',  color: '#e11d48', sort_order: 0 },
    { project_id: proj.id, name: 'staging',     color: '#d97706', sort_order: 1 },
    { project_id: proj.id, name: 'development', color: '#16a34a', sort_order: 2 },
  ]
  const { data: envs, error: envErr } = await supabase
    .from('environments')
    .insert(defaultEnvs)
    .select('id, name, color, sort_order')
  if (envErr) {
    console.error('[createProject envs]', envErr)
    throw envErr
  }

  const mappedEnvs: Environment[] = (envs as { id: string; name: string; color: string; sort_order: number }[])
    .map(e => ({ id: e.id, name: e.name, color: e.color, order: e.sort_order }))
    .sort((a, b) => a.order - b.order)

  return {
    id: proj.id,
    name: proj.name,
    description: proj.description ?? '',
    createdAt: proj.created_at.slice(0, 10),
    environments: mappedEnvs,
    modules: [],
  }
}

export async function updateProject(project: Project): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')

  const { error: projErr } = await supabase
    .from('projects')
    .update({ name: project.name, description: project.description })
    .eq('id', project.id)
  if (projErr) throw projErr

  // Upsert environments
  if (project.environments.length > 0) {
    const { error } = await supabase.from('environments').upsert(
      project.environments.map(e => ({
        id: e.id, project_id: project.id, name: e.name, color: e.color, sort_order: e.order,
      }))
    )
    if (error) throw error
  }

  // Delete environments removed from the project (FK constraint will block if tickets ref them)
  const { data: dbEnvs } = await supabase
    .from('environments').select('id').eq('project_id', project.id)
  const keepIds = new Set(project.environments.map(e => e.id))
  const toDelEnv = (dbEnvs ?? []).filter(e => !keepIds.has(e.id)).map(e => e.id)
  if (toDelEnv.length > 0) {
    await supabase.from('environments').delete().in('id', toDelEnv)
    // Silently ignore: if tickets reference this env, deletion is blocked (FK RESTRICT)
  }

  // Upsert modules
  if (project.modules.length > 0) {
    const { error } = await supabase.from('modules').upsert(
      project.modules.map(m => ({
        id: m.id, project_id: project.id, name: m.name, category: m.category,
      }))
    )
    if (error) throw error
  }

  // Delete removed modules (cascades to ticket_modules)
  const { data: dbMods } = await supabase
    .from('modules').select('id').eq('project_id', project.id)
  const keepModIds = new Set(project.modules.map(m => m.id))
  const toDelMod = (dbMods ?? []).filter(m => !keepModIds.has(m.id)).map(m => m.id)
  if (toDelMod.length > 0) {
    await supabase.from('modules').delete().in('id', toDelMod)
  }
}

// ── Tickets ───────────────────────────────────────────────────────────────────

export async function fetchAllTickets(): Promise<Ticket[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      id, project_id, title, description, start_date, end_date,
      environment_id, status, assignee, priority,
      deployment_entries(id, environment_id, date),
      ticket_modules(module_id)
    `)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as DbTicket[]).map(toTicket)
}

export async function upsertTicket(ticket: Ticket, userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')

  const { error: ticketErr } = await supabase.from('tickets').upsert({
    id: ticket.id,
    project_id: ticket.projectId,
    title: ticket.title,
    description: ticket.description || null,
    start_date: ticket.startDate,
    end_date: ticket.endDate,
    environment_id: ticket.environmentId,
    status: ticket.status,
    assignee: ticket.assignee || null,
    priority: ticket.priority,
    created_by: userId,
    updated_at: new Date().toISOString(),
  })
  if (ticketErr) throw ticketErr

  // Sync ticket_modules (delete all → insert)
  await supabase.from('ticket_modules').delete().eq('ticket_id', ticket.id)
  if (ticket.modules.length > 0) {
    const { error } = await supabase.from('ticket_modules').insert(
      ticket.modules.map(mid => ({ ticket_id: ticket.id, module_id: mid }))
    )
    if (error) throw error
  }

  // Sync deployment_entries (delete all → insert with stable IDs)
  await supabase.from('deployment_entries').delete().eq('ticket_id', ticket.id)
  if (ticket.deployments.length > 0) {
    const { error } = await supabase.from('deployment_entries').insert(
      ticket.deployments.map(d => ({
        id: d.id,
        ticket_id: ticket.id,
        environment_id: d.environmentId,
        date: d.date,
      }))
    )
    if (error) throw error
  }
}

export async function deleteTicketById(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('tickets').delete().eq('id', id)
  if (error) throw error
}
