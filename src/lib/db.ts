import { supabase } from './supabase'
import type { Project, Ticket, Environment, Module, ConflictResolution } from '../types'

// ── Raw DB row types ──────────────────────────────────────────────────────────

interface DbProject {
  id: string
  name: string
  description: string | null
  created_at: string
  archived: boolean
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
  ticket_type: string
  sow_link: string | null
  jira_link: string | null
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
    archived: raw.archived,
    environments: [...raw.environments]
      .map(e => ({ id: e.id, name: e.name, color: e.color, order: e.sort_order }))
      .sort((a, b) => a.order - b.order),
    modules: raw.modules,
  }
}

// end_date in DB is already the derived value (written via withDerivedEndDate at
// save time, using the project's top env). Do NOT re-derive here — this function
// has no access to env ordering, so the fallback rule would silently disagree
// with what was saved.
function toTicket(raw: DbTicket): Ticket {
  return {
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
    ticketType: raw.ticket_type as Ticket['ticketType'],
    sowLink: raw.sow_link ?? '',
    jiraLink: raw.jira_link ?? '',
    modules: raw.ticket_modules.map(tm => tm.module_id),
    deployments: raw.deployment_entries.map(de => ({
      id: de.id,
      environmentId: de.environment_id,
      date: de.date,
    })),
  }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, created_at, archived, environments(id, name, color, sort_order), modules(id, name, category)')
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
    archived: false,
    environments: mappedEnvs,
    modules: [],
  }
}

export async function updateProject(project: Project): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')

  const { error: projErr } = await supabase
    .from('projects')
    .update({ name: project.name, description: project.description, archived: project.archived })
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

// Hapus project beserta seluruh isinya. Anak dihapus berurutan dari sini —
// tidak bergantung pada konfigurasi ON DELETE CASCADE di DB.
export async function deleteProjectById(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')

  const { error: resErr } = await supabase.from('conflict_resolutions').delete().eq('project_id', id)
  if (resErr) throw resErr

  // tickets cascade ke ticket_modules & deployment_entries (sudah berlaku di
  // deleteTicketById); kalau tidak, error akan ter-throw dan terlihat di UI
  const { error: tickErr } = await supabase.from('tickets').delete().eq('project_id', id)
  if (tickErr) throw tickErr

  const { error: modErr } = await supabase.from('modules').delete().eq('project_id', id)
  if (modErr) throw modErr

  const { error: envErr } = await supabase.from('environments').delete().eq('project_id', id)
  if (envErr) throw envErr

  const { error: projErr } = await supabase.from('projects').delete().eq('id', id)
  if (projErr) throw projErr
}

// ── Tickets ───────────────────────────────────────────────────────────────────

export async function fetchAllTickets(): Promise<Ticket[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      id, project_id, title, description, start_date, end_date,
      environment_id, status, assignee, priority,
      ticket_type, sow_link, jira_link,
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
    ticket_type: ticket.ticketType,
    sow_link: ticket.sowLink || null,
    jira_link: ticket.jiraLink || null,
    created_by: userId,
    updated_at: new Date().toISOString(),
  })
  if (ticketErr) throw ticketErr

  // Sync ticket_modules (delete all → insert)
  const { error: delModErr } = await supabase.from('ticket_modules').delete().eq('ticket_id', ticket.id)
  if (delModErr) throw delModErr
  if (ticket.modules.length > 0) {
    const { error } = await supabase.from('ticket_modules').insert(
      ticket.modules.map(mid => ({ ticket_id: ticket.id, module_id: mid }))
    )
    if (error) throw error
  }

  // Sync deployment_entries (delete all → insert with stable IDs)
  const { error: delDepErr } = await supabase.from('deployment_entries').delete().eq('ticket_id', ticket.id)
  if (delDepErr) throw delDepErr
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

// ── Conflict resolutions ─────────────────────────────────────────────────────

interface DbConflictResolution {
  id: string
  project_id: string
  ticket_a: string
  ticket_b: string
  link: string | null
  note: string | null
  created_at: string
}

export async function fetchConflictResolutions(): Promise<ConflictResolution[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('conflict_resolutions')
    .select('id, project_id, ticket_a, ticket_b, link, note, created_at')
  if (error) throw error
  return (data as DbConflictResolution[]).map(r => ({
    id: r.id,
    projectId: r.project_id,
    ticketA: r.ticket_a,
    ticketB: r.ticket_b,
    link: r.link ?? '',
    note: r.note ?? '',
    createdAt: r.created_at.slice(0, 10),
  }))
}

export async function upsertConflictResolution(input: {
  projectId: string
  ticketA: string   // must already be sorted: ticketA < ticketB
  ticketB: string
  link: string
  note: string
  userId: string
}): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('conflict_resolutions').upsert(
    {
      project_id: input.projectId,
      ticket_a: input.ticketA,
      ticket_b: input.ticketB,
      link: input.link || null,
      note: input.note || null,
      created_by: input.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'ticket_a,ticket_b' }
  )
  if (error) throw error
}

export async function deleteConflictResolution(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('conflict_resolutions').delete().eq('id', id)
  if (error) throw error
}
