import { useEffect, useRef, useState } from 'react'
import { C } from '../ui/tokens'
import { Badge } from '../ui/Badge'
import { Btn } from '../ui/Btn'
import { Input } from '../ui/FormControls'
import { Hr } from '../ui/FormControls'
import { Field } from '../ui/FormControls'
import { useAppStore } from '../../stores/appStore'
import { useConflicts } from '../../hooks/useConflicts'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../../hooks/useProjects'
import { useTickets } from '../../hooks/useTickets'
import { formatDate, addDays, TODAY_STR } from '../../lib/utils'
import type { Project, Ticket, ConflictPair } from '../../types'

function StatBox({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 20, fontWeight: 700, color: color ?? C.text, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 9, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
    </div>
  )
}

function CardMenu({ project, onArchive, onDelete }: {
  project: Project
  onArchive: (p: Project) => void
  onDelete: (p: Project) => void
}) {
  const [open, setOpen] = useState(false)
  const [hov, setHov]   = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const itemStyle = {
    display: 'block', width: '100%', padding: '6px 10px', borderRadius: 4,
    border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' as const,
    fontFamily: 'Inter, sans-serif', fontSize: 11,
  }

  return (
    <div ref={wrapRef} onClick={e => e.stopPropagation()} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onClick={() => setOpen(o => !o)}
        title="Project actions"
        style={{
          width: 22, height: 22, borderRadius: 4,
          background: open || hov ? C.surfaceEl : 'transparent',
          border: `1px solid ${open || hov ? C.borderEl : 'transparent'}`,
          color: open || hov ? C.textSec : C.textMut,
          cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0,
          fontFamily: 'Inter, sans-serif', transition: 'all 0.1s',
        }}
      >⋯</button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 120,
          minWidth: 150, background: C.surface, border: `1px solid ${C.borderEl}`,
          borderRadius: 6, padding: 4, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}>
          <button
            onClick={() => { setOpen(false); onArchive(project) }}
            style={{ ...itemStyle, color: C.textSec }}
            onMouseEnter={e => (e.currentTarget.style.background = C.surfaceEl)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >{project.archived ? 'Unarchive' : 'Archive'}</button>
          <button
            onClick={() => { setOpen(false); onDelete(project) }}
            style={{ ...itemStyle, color: C.hard }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.10)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >Delete…</button>
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project, allTickets, conflicts, onSelect, onArchive, onDelete,
}: {
  project: Project
  allTickets: Ticket[]
  conflicts: ConflictPair[]
  onSelect: (id: string) => void
  onArchive: (p: Project) => void
  onDelete: (p: Project) => void
}) {
  const [hov, setHov] = useState(false)
  const tickets = allTickets.filter(t => t.projectId === project.id)
  const pConf   = conflicts.filter(c => c.projectId === project.id)
  const hardC   = pConf.filter(c => c.type === 'hard').length
  const softC   = pConf.filter(c => c.type === 'soft').length
  const active  = tickets.filter(t => t.status === 'in-progress').length
  const planned = tickets.filter(t => t.status === 'planned').length

  const upcoming = tickets
    .filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.startDate >= TODAY_STR && t.startDate <= addDays(TODAY_STR, 14))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 3)

  return (
    <div
      onClick={() => onSelect(project.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#161618' : C.surface,
        border: `1px solid ${hardC > 0 && !project.archived ? 'rgba(239,68,68,0.35)' : hov ? C.borderEl : C.border}`,
        borderRadius: 8, padding: '18px 20px', cursor: 'pointer',
        opacity: project.archived ? 0.65 : 1,
        transition: 'background 0.12s, border-color 0.12s, opacity 0.12s', display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{project.name}</span>
            {project.archived && (
              <span style={{
                fontSize: 9, fontWeight: 600, color: C.textMut, textTransform: 'uppercase',
                letterSpacing: '0.06em', padding: '1px 6px', borderRadius: 3,
                background: '#1c1c1f', border: `1px solid ${C.border}`,
              }}>Archived</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.textMut, lineHeight: 1.45 }}>{project.description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12, flexShrink: 0 }}>
          {hardC > 0 && <Badge type="hard">{hardC} hard</Badge>}
          {softC > 0 && <Badge type="soft">{softC}</Badge>}
          <CardMenu project={project} onArchive={onArchive} onDelete={onDelete} />
        </div>
      </div>

      <Hr style={{ margin: '10px 0' }} />

      <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
        <StatBox value={tickets.length} label="Tickets" />
        <StatBox value={active}  label="Active"  color={active  > 0 ? C.blue  : undefined} />
        <StatBox value={planned} label="Planned" color={planned > 0 ? C.textSec : undefined} />
        <StatBox value={pConf.length} label="Conflicts" color={pConf.length > 0 ? C.hard : undefined} />
        <div style={{ flex: 1 }} />
        <StatBox value={project.modules.length} label="Modules" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: upcoming.length > 0 ? 14 : 0 }}>
        {project.environments.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: e.color }} />
            <span style={{ fontSize: 10, color: C.textMut, textTransform: 'capitalize' }}>{e.name}</span>
          </div>
        ))}
      </div>

      {upcoming.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Upcoming
          </div>
          {upcoming.map(t => {
            const tConf = pConf.filter(c => c.ticket1Id === t.id || c.ticket2Id === t.id)
            const hasH  = tConf.some(c => c.type === 'hard')
            const hasS  = !hasH && tConf.length > 0
            const tEnv  = project.environments.find(e => e.id === t.environmentId)
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 8px', borderRadius: 4,
                background: '#0e0e10', border: `1px solid ${C.border}`,
              }}>
                {tEnv && <div style={{ width: 5, height: 5, borderRadius: '50%', background: tEnv.color, flexShrink: 0 }} />}
                <span style={{ fontSize: 11, color: C.textSec, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </span>
                {(hasH || hasS) && <Badge type={hasH ? 'hard' : 'soft'} size="xs">{hasH ? '⚡' : '◎'}</Badge>}
                <span style={{ fontSize: 9, color: C.textMut, flexShrink: 0 }}>{formatDate(t.startDate)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NewProjectCard({ onCreate }: { onCreate: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onCreate}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'transparent',
        border: `1px dashed ${hov ? C.borderEl : C.border + 'aa'}`,
        borderRadius: 8, padding: '18px 20px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, minHeight: 180, color: hov ? C.textSec : C.textMut,
        fontFamily: 'Inter, sans-serif', fontSize: 12, transition: 'all 0.12s',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        border: `1px dashed ${hov ? C.borderEl : C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: hov ? C.textSec : C.textMut, transition: 'all 0.12s',
      }}>+</div>
      <span>New Project</span>
    </button>
  )
}

export function DashboardView() {
  const { setProject } = useAppStore()
  const { data: projects = [], isLoading } = useProjects()
  const { data: allTickets = [] }          = useTickets()
  const { mutate: createProject, isPending: creating, error: createError, reset: resetCreate } = useCreateProject()
  const { mutate: updateProject, error: archiveError, reset: resetArchive } = useUpdateProject()
  const { mutate: deleteProject, isPending: deleting, error: deleteError, reset: resetDelete } = useDeleteProject()
  const conflicts = useConflicts(allTickets)

  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showArchived, setShowArchived]   = useState(false)
  const [deleteTarget, setDeleteTarget]   = useState<Project | null>(null)
  const [confirmName, setConfirmName]     = useState('')

  const activeProjects   = projects.filter(p => !p.archived)
  const archivedProjects = projects.filter(p => p.archived)

  // Rekap header hanya dari project aktif — project arsip tidak ikut dihitung
  const activeIds       = new Set(activeProjects.map(p => p.id))
  const activeTickets   = allTickets.filter(t => activeIds.has(t.projectId))
  const activeConflicts = conflicts.filter(c => activeIds.has(c.projectId))
  const totalConflicts  = activeConflicts.length
  const hardTotal       = activeConflicts.filter(c => c.type === 'hard').length

  const handleArchive = (p: Project) => {
    resetArchive()
    updateProject({ ...p, archived: !p.archived })
  }

  const handleDeleteRequest = (p: Project) => {
    resetDelete()
    setConfirmName('')
    setDeleteTarget(p)
  }

  const deleteNameMatches = deleteTarget !== null && confirmName.trim() === deleteTarget.name
  const handleDeleteConfirm = () => {
    if (!deleteTarget || !deleteNameMatches) return
    deleteProject(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    resetCreate()
    createProject(
      { name: newName.trim(), description: newDesc.trim() },
      {
        onSuccess: (project) => {
          setProject(project.id)
          setShowNew(false)
          setNewName('')
          setNewDesc('')
        },
      }
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 32px 60px' }}>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 5px', fontSize: 22, fontWeight: 700, color: C.text }}>Projects</h1>
            <p style={{ margin: 0, fontSize: 12, color: C.textMut }}>
              {isLoading
                ? 'Loading…'
                : <>
                    {activeProjects.length} project{activeProjects.length !== 1 ? 's' : ''} · {activeTickets.length} total tickets ·{' '}
                    {totalConflicts > 0
                      ? <span style={{ color: hardTotal > 0 ? C.hard : C.soft }}>{totalConflicts} active conflict{totalConflicts !== 1 ? 's' : ''}</span>
                      : <span style={{ color: C.green }}>no active conflicts</span>
                    }
                  </>
              }
            </p>
          </div>
          <Btn variant="primary" size="md" onClick={() => setShowNew(true)}>+ New Project</Btn>
        </div>

        {archiveError && (
          <div style={{
            marginBottom: 14, padding: '9px 12px', borderRadius: 6,
            background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)',
            fontSize: 11, color: '#ef4444', lineHeight: 1.5,
          }}>
            Failed to update project: {(archiveError as Error).message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {activeProjects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              allTickets={allTickets}
              conflicts={conflicts}
              onSelect={setProject}
              onArchive={handleArchive}
              onDelete={handleDeleteRequest}
            />
          ))}
          <NewProjectCard onCreate={() => setShowNew(true)} />
        </div>

        {archivedProjects.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <button
              onClick={() => setShowArchived(s => !s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
            >
              <span style={{ fontSize: 9 }}>{showArchived ? '▾' : '▸'}</span>
              Archived ({archivedProjects.length})
            </button>
            {showArchived && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14, marginTop: 12 }}>
                {archivedProjects.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    allTickets={allTickets}
                    conflicts={conflicts}
                    onSelect={setProject}
                    onArchive={handleArchive}
                    onDelete={handleDeleteRequest}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showNew && (
        <div
          onClick={() => setShowNew(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: 400, background: C.surface,
            border: `1px solid ${C.borderEl}`,
            borderRadius: 10, padding: 20,
            boxShadow: '0 32px 100px rgba(0,0,0,0.75)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>New Project</div>
            <Field label="Project Name">
              <Input value={newName} onChange={setNewName} placeholder="e.g. API Gateway" autoFocus />
            </Field>
            <Field label="Description">
              <Input value={newDesc} onChange={setNewDesc} placeholder="Short description (optional)" />
            </Field>
            <p style={{ margin: 0, fontSize: 11, color: C.textMut, lineHeight: 1.5 }}>
              Default environments (production, staging, development) will be created. You can edit them after.
            </p>
            {createError && (
              <div style={{
                padding: '9px 12px', borderRadius: 6,
                background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)',
                fontSize: 11, color: '#ef4444', lineHeight: 1.5,
              }}>
                {(createError as Error).message}
              </div>
            )}
            <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
              <Btn variant="default" size="sm" onClick={() => { setShowNew(false); resetCreate() }}>Cancel</Btn>
              <Btn variant="primary" size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating…' : 'Create Project'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          onClick={() => !deleting && setDeleteTarget(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: 420, background: C.surface,
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 10, padding: 20,
            boxShadow: '0 32px 100px rgba(0,0,0,0.75)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Delete "{deleteTarget.name}"?</div>
            <p style={{ margin: 0, fontSize: 11, color: C.textSec, lineHeight: 1.6 }}>
              Semua isinya ikut terhapus permanen:{' '}
              <b style={{ color: C.text }}>{allTickets.filter(t => t.projectId === deleteTarget.id).length} tiket</b>,{' '}
              {deleteTarget.modules.length} modul, {deleteTarget.environments.length} environment,
              beserta riwayat deployment dan kesepakatan konflik. Tindakan ini tidak bisa dibatalkan.
              Kalau hanya ingin menyembunyikan dari dashboard, gunakan <b style={{ color: C.text }}>Archive</b>.
            </p>
            <Field label={`Ketik "${deleteTarget.name}" untuk konfirmasi`}>
              <Input value={confirmName} onChange={setConfirmName} placeholder={deleteTarget.name} autoFocus />
            </Field>
            {deleteError && (
              <div style={{
                padding: '9px 12px', borderRadius: 6,
                background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)',
                fontSize: 11, color: '#ef4444', lineHeight: 1.5,
              }}>
                Failed to delete: {(deleteError as Error).message}
              </div>
            )}
            <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
              <Btn variant="default" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Btn>
              <Btn variant="danger" size="sm" onClick={handleDeleteConfirm} disabled={!deleteNameMatches || deleting}>
                {deleting ? 'Deleting…' : 'Delete project'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
