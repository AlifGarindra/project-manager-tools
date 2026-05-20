import { useState } from 'react'
import { C } from '../ui/tokens'
import { Badge } from '../ui/Badge'
import { Btn } from '../ui/Btn'
import { Input } from '../ui/FormControls'
import { Hr } from '../ui/FormControls'
import { Field } from '../ui/FormControls'
import { useAppStore } from '../../stores/appStore'
import { useConflicts } from '../../hooks/useConflicts'
import { useProjects, useCreateProject } from '../../hooks/useProjects'
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

function ProjectCard({
  project, allTickets, conflicts, onSelect,
}: {
  project: Project
  allTickets: Ticket[]
  conflicts: ConflictPair[]
  onSelect: (id: string) => void
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
        border: `1px solid ${hardC > 0 ? 'rgba(239,68,68,0.35)' : hov ? C.borderEl : C.border}`,
        borderRadius: 8, padding: '18px 20px', cursor: 'pointer',
        transition: 'background 0.12s, border-color 0.12s', display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>{project.name}</div>
          <div style={{ fontSize: 11, color: C.textMut, lineHeight: 1.45 }}>{project.description}</div>
        </div>
        {(hardC > 0 || softC > 0) && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 12, flexShrink: 0 }}>
            {hardC > 0 && <Badge type="hard">{hardC} hard</Badge>}
            {softC > 0 && <Badge type="soft">{softC}</Badge>}
          </div>
        )}
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
  const conflicts = useConflicts(allTickets)

  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const totalConflicts = conflicts.length
  const hardTotal = conflicts.filter(c => c.type === 'hard').length

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
                    {projects.length} project{projects.length !== 1 ? 's' : ''} · {allTickets.length} total tickets ·{' '}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              allTickets={allTickets}
              conflicts={conflicts}
              onSelect={setProject}
            />
          ))}
          <NewProjectCard onCreate={() => setShowNew(true)} />
        </div>
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
    </div>
  )
}
