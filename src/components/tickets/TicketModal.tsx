import { useState, useEffect, useCallback } from 'react'
import { C } from '../ui/tokens'
import { Badge } from '../ui/Badge'
import { Btn } from '../ui/Btn'
import { Input, Sel, Textarea, Field } from '../ui/FormControls'
import { StatusBadge } from '../ui/StatusBadge'
import { PriorityDot } from '../ui/PriorityDot'
import { ModuleChip } from '../ui/ModuleChip'
import { useAppStore } from '../../stores/appStore'
import { useConflicts } from '../../hooks/useConflicts'
import { useTickets, useSaveTicket, useDeleteTicket } from '../../hooks/useTickets'
import { useProjects } from '../../hooks/useProjects'
import { generateId, TODAY_STR, addDays, formatDateFull, formatDate, withDerivedEndDate } from '../../lib/utils'
import type { Ticket } from '../../types'

export function TicketModal() {
  const {
    selectedProjectId,
    activeTicketId, ticketMode, newTicketDefaults,
    closeTicket, openTicket,
  } = useAppStore()

  const { data: allTickets = [] } = useTickets()
  const { data: projects = [] }   = useProjects()
  const { mutate: saveTicket }    = useSaveTicket()
  const { mutate: deleteTicket }  = useDeleteTicket()
  const allConflicts = useConflicts(allTickets)

  const isOpen  = activeTicketId !== null || ticketMode === 'create'
  const project = projects.find(p => p.id === selectedProjectId)
  const existing = activeTicketId ? allTickets.find(t => t.id === activeTicketId) : null

  const blankForm = useCallback((): Ticket => ({
    id: generateId(),
    projectId: selectedProjectId,
    title: '',
    description: '',
    startDate: TODAY_STR,
    endDate: addDays(TODAY_STR, 4),
    environmentId: project?.environments[0]?.id ?? '',
    status: 'planned',
    assignee: '',
    modules: [],
    priority: 'medium',
    deployments: [],
    ...newTicketDefaults,
  }), [selectedProjectId, project, newTicketDefaults])

  const [form, setForm]     = useState<Ticket>(() => existing ? { ...existing } : blankForm())
  const [editMode, setEdit] = useState(ticketMode === 'create')

  useEffect(() => {
    if (ticketMode === 'create') {
      setForm(blankForm())
      setEdit(true)
    } else if (existing) {
      setForm({ ...existing })
      setEdit(ticketMode === 'edit')
    }
  }, [activeTicketId, ticketMode]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !project) return null

  const tc      = activeTicketId ? allConflicts.filter(c => c.ticket1Id === activeTicketId || c.ticket2Id === activeTicketId) : []
  const hasHard = tc.some(c => c.type === 'hard')
  const hasSoft = !hasHard && tc.some(c => c.type === 'soft')
  const env     = project.environments.find(e => e.id === form.environmentId)

  const set = <K extends keyof Ticket>(key: K, val: Ticket[K]) => setForm(f => ({ ...f, [key]: val }))

  const toggleModule = (mid: string) => {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(mid) ? f.modules.filter(m => m !== mid) : [...f.modules, mid],
    }))
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    saveTicket(withDerivedEndDate(form), { onSuccess: closeTicket })
  }

  const handleDelete = () => {
    if (!existing) return
    deleteTicket(existing.id, { onSuccess: closeTicket })
  }

  const modulesByCategory = project.modules.reduce<Record<string, typeof project.modules>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m)
    return acc
  }, {})

  return (
    <div
      onClick={closeTicket}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560, maxHeight: '88vh',
          background: C.surface, border: `1px solid ${C.borderEl}`,
          borderRadius: 10, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.75)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 14px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0,
        }}>
          {env && <div style={{ width: 8, height: 8, borderRadius: '50%', background: env.color, flexShrink: 0 }} />}
          {editMode ? (
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ticket title…"
              autoFocus
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif' }}
            />
          ) : (
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.text }}>{form.title || 'Untitled'}</span>
          )}
          <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
            {tc.length > 0 && (
              <Badge type={hasHard ? 'hard' : hasSoft ? 'soft' : 'default'}>
                {tc.length} {tc.length === 1 ? 'conflict' : 'conflicts'}
              </Badge>
            )}
            {!editMode && <Btn variant="default" size="sm" onClick={() => setEdit(true)}>Edit</Btn>}
            <button onClick={closeTicket} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 13 }}>

          {/* Row 1: env / status / priority */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Environment" style={{ flex: 1 }}>
              {editMode
                ? <Sel value={form.environmentId} onChange={v => set('environmentId', v)}>
                    {project.environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </Sel>
                : <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                    {env && <div style={{ width: 7, height: 7, borderRadius: '50%', background: env.color }} />}
                    <span style={{ fontSize: 12, color: C.text, textTransform: 'capitalize' }}>{env?.name}</span>
                  </div>
              }
            </Field>
            <Field label="Status" style={{ flex: 1 }}>
              {editMode
                ? <Sel value={form.status} onChange={v => set('status', v as Ticket['status'])}>
                    {(['planned', 'in-progress', 'blocked', 'done', 'cancelled'] as Ticket['status'][]).map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>
                    ))}
                  </Sel>
                : <div style={{ padding: '3px 0' }}><StatusBadge status={form.status} /></div>
              }
            </Field>
            <Field label="Priority" style={{ flex: 1 }}>
              {editMode
                ? <Sel value={form.priority} onChange={v => set('priority', v as Ticket['priority'])}>
                    {(['critical', 'high', 'medium', 'low'] as Ticket['priority'][]).map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </Sel>
                : <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 0' }}>
                    <PriorityDot priority={form.priority} />
                    <span style={{ fontSize: 12, color: C.text, textTransform: 'capitalize' }}>{form.priority}</span>
                  </div>
              }
            </Field>
          </div>

          {/* Row 2: dates / assignee */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Start Date" style={{ flex: 1 }}>
              {editMode
                ? <Input type="date" value={form.startDate} onChange={v => set('startDate', v)} />
                : <span style={{ fontSize: 12, color: C.text, display: 'block', padding: '4px 0' }}>{formatDateFull(form.startDate)}</span>
              }
            </Field>
            <Field label="End Date" style={{ flex: 1 }}>
              {editMode
                ? <Input type="date" value={form.endDate ?? ''} onChange={v => set('endDate', v || null)} />
                : <span style={{ fontSize: 12, color: C.text, display: 'block', padding: '4px 0' }}>{formatDateFull(form.endDate)}</span>
              }
            </Field>
            <Field label="Assignee" style={{ flex: 1 }}>
              {editMode
                ? <Input value={form.assignee} onChange={v => set('assignee', v)} placeholder="Name" />
                : <span style={{ fontSize: 12, color: form.assignee ? C.text : C.textMut, display: 'block', padding: '4px 0' }}>{form.assignee || '—'}</span>
              }
            </Field>
          </div>

          {/* Description */}
          <Field label="Description">
            {editMode
              ? <Textarea value={form.description} onChange={v => set('description', v)} placeholder="Describe the deployment, rollback plan, risk…" rows={3} />
              : <p style={{ margin: 0, fontSize: 12, color: form.description ? C.textSec : C.textMut, lineHeight: 1.6 }}>{form.description || '—'}</p>
            }
          </Field>

          {/* Modules */}
          <Field label="Modules Touched">
            {Object.entries(modulesByCategory).map(([cat, mods]) => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{cat}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {mods.map(mod => {
                    const selected    = form.modules.includes(mod.id)
                    const conflicting = tc.some(c => c.modules.includes(mod.id))
                    const cType       = conflicting
                      ? (tc.filter(c => c.modules.includes(mod.id)).some(c => c.type === 'hard') ? 'hard' as const : 'soft' as const)
                      : undefined
                    return (
                      <ModuleChip
                        key={mod.id}
                        name={mod.name}
                        selected={selected}
                        conflict={selected && conflicting ? cType : undefined}
                        onClick={editMode ? () => toggleModule(mod.id) : undefined}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
            {form.modules.length === 0 && !editMode && (
              <span style={{ fontSize: 11, color: C.textMut }}>No modules selected</span>
            )}
          </Field>

          {/* Active Conflicts */}
          {tc.length > 0 && (
            <Field label="Active Conflicts">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {tc.map(c => {
                  const otherId = c.ticket1Id === activeTicketId ? c.ticket2Id : c.ticket1Id
                  const other   = allTickets.find(t => t.id === otherId)
                  const mNames  = c.modules.map(id => project.modules.find(m => m.id === id)?.name).filter(Boolean)
                  return (
                    <div
                      key={c.id}
                      onClick={() => openTicket(otherId)}
                      style={{
                        padding: '8px 10px', borderRadius: 5, cursor: 'pointer',
                        background: c.type === 'hard' ? 'rgba(239,68,68,0.07)' : 'rgba(234,179,8,0.05)',
                        border: `1px solid ${c.type === 'hard' ? 'rgba(239,68,68,0.22)' : 'rgba(234,179,8,0.18)'}`,
                        display: 'flex', flexDirection: 'column', gap: 3,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Badge type={c.type === 'hard' ? 'hard' : 'soft'} size="xs">{c.type === 'hard' ? 'Hard' : 'Soft'}</Badge>
                        <span style={{ fontSize: 11, fontWeight: 500, color: C.text }}>vs {other?.title}</span>
                      </div>
                      <span style={{ fontSize: 10, color: C.textMut }}>
                        Shared: {mNames.join(', ')} · {formatDate(c.overlapStart)}–{formatDate(c.overlapEnd)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Field>
          )}
        </div>

        {/* Footer */}
        {editMode && (
          <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 7, flexShrink: 0 }}>
            {existing && (
              <Btn variant="danger" size="sm" onClick={handleDelete}>Delete</Btn>
            )}
            <div style={{ flex: 1 }} />
            <Btn variant="default" size="sm" onClick={() => {
              if (ticketMode === 'create') closeTicket()
              else setEdit(false)
            }}>Cancel</Btn>
            <Btn variant="primary" size="sm" onClick={handleSave}>
              {ticketMode === 'create' ? 'Create Ticket' : 'Save Changes'}
            </Btn>
          </div>
        )}
      </div>
    </div>
  )
}
