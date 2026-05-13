import { useState } from 'react'
import { C } from '../ui/tokens'
import { Badge } from '../ui/Badge'
import { StatusBadge } from '../ui/StatusBadge'
import { useAppStore } from '../../stores/appStore'
import { useConflicts } from '../../hooks/useConflicts'
import { formatDate, daysBetween } from '../../lib/utils'
import type { ConflictPair, Ticket, Project } from '../../types'

function ConflictItem({
  conflict, tickets, project, onOpenTicket,
}: {
  conflict: ConflictPair
  tickets: Ticket[]
  project: Project
  onOpenTicket: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const t1 = tickets.find(t => t.id === conflict.ticket1Id)
  const t2 = tickets.find(t => t.id === conflict.ticket2Id)
  if (!t1 || !t2) return null

  const isHard = conflict.type === 'hard'
  const env1   = project.environments.find(e => e.id === t1.environmentId)
  const env2   = project.environments.find(e => e.id === t2.environmentId)
  const mods   = conflict.modules.map(id => project.modules.find(m => m.id === id)).filter(Boolean)
  const days   = daysBetween(conflict.overlapStart, conflict.overlapEnd) + 1

  const accentBg     = isHard ? 'rgba(239,68,68,0.07)'  : 'rgba(234,179,8,0.05)'
  const accentBorder = isHard ? 'rgba(239,68,68,0.28)'  : 'rgba(234,179,8,0.22)'
  const accentColor  = isHard ? C.hard : C.soft

  return (
    <div style={{ border: `1px solid ${accentBorder}`, borderRadius: 6, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '9px 11px', cursor: 'pointer', background: accentBg, display: 'flex', flexDirection: 'column', gap: 5 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Badge type={isHard ? 'hard' : 'soft'} size="xs">{isHard ? '⚡ Hard' : '◎ Soft'}</Badge>
          <span style={{ fontSize: 9, color: C.textMut, marginLeft: 'auto' }}>
            {formatDate(conflict.overlapStart)}–{formatDate(conflict.overlapEnd)}{' '}
            <span style={{ color: accentColor }}>({days}d)</span>
          </span>
          <span style={{ fontSize: 10, color: C.textMut, marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: C.text, lineHeight: 1.35 }}>{t1.title}</span>
          <span style={{ fontSize: 9, color: C.textMut, paddingLeft: 2 }}>vs</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: C.text, lineHeight: 1.35 }}>{t2.title}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {mods.map(m => m && (
            <span key={m.id} style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 3,
              background: isHard ? 'rgba(239,68,68,0.14)' : 'rgba(234,179,8,0.1)',
              color: accentColor, border: `1px solid ${accentColor}33`,
            }}>{m.name}</span>
          ))}
        </div>
      </div>

      {open && (
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ t: t1, env: env1 }, { t: t2, env: env2 }].map(({ t, env }) => (
              <div
                key={t.id}
                onClick={() => onOpenTicket(t.id)}
                style={{
                  flex: 1, padding: '7px 9px', background: '#0c0c0e',
                  border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 500, color: C.text, lineHeight: 1.35 }}>{t.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {env && <div style={{ width: 5, height: 5, borderRadius: '50%', background: env.color }} />}
                  <span style={{ fontSize: 9, color: C.textMut, textTransform: 'capitalize' }}>{env?.name}</span>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 10, color: C.textMut, lineHeight: 1.55 }}>
            {isHard
              ? `Both tickets are deploying to ${env1?.name}. Overlapping module changes can cause direct conflicts.`
              : `Different environments, but shared modules may cause schema or API contract mismatches.`
            }
          </p>
        </div>
      )}
    </div>
  )
}

export function ConflictPanel() {
  const { tickets, projects, selectedProjectId, toggleConflicts, openTicket } = useAppStore()
  const allConflicts = useConflicts(tickets)
  const project   = projects.find(p => p.id === selectedProjectId)
  const pTickets  = tickets.filter(t => t.projectId === selectedProjectId)
  const pConf     = allConflicts.filter(c => c.projectId === selectedProjectId)
  const hardC     = pConf.filter(c => c.type === 'hard')
  const softC     = pConf.filter(c => c.type === 'soft')

  if (!project) return null

  return (
    <div style={{
      width: 290, flexShrink: 0,
      background: C.surface,
      borderLeft: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0 12px', height: 40, flexShrink: 0,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>Conflicts</span>
        {hardC.length > 0 && <Badge type="hard">{hardC.length}</Badge>}
        {softC.length > 0 && <Badge type="soft">{softC.length}</Badge>}
        <div style={{ flex: 1 }} />
        <button
          onClick={toggleConflicts}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 16, padding: '0 2px', lineHeight: 1 }}
        >×</button>
      </div>

      {pConf.length > 0 && (
        <div style={{
          padding: '7px 12px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', gap: 12, background: '#0e0e10', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: hardC.length > 0 ? C.hard : C.textMut, lineHeight: 1 }}>{hardC.length}</span>
            <span style={{ fontSize: 9, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hard</span>
          </div>
          <div style={{ width: 1, background: C.border }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: softC.length > 0 ? C.soft : C.textMut, lineHeight: 1 }}>{softC.length}</span>
            <span style={{ fontSize: 9, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Soft</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.textSec, lineHeight: 1 }}>{pConf.length}</span>
            <span style={{ fontSize: 9, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</span>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {pConf.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', gap: 8, padding: '32px 16px', color: C.textMut,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>✓</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.textSec }}>No conflicts</div>
            <div style={{ fontSize: 11, lineHeight: 1.5, maxWidth: 200 }}>
              All tickets are either non-overlapping or touch different modules.
            </div>
          </div>
        ) : (
          <>
            {hardC.length > 0 && (
              <div style={{ fontSize: 9, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 2px' }}>
                Hard Conflicts
              </div>
            )}
            {hardC.map(c => (
              <ConflictItem key={c.id} conflict={c} tickets={pTickets} project={project} onOpenTicket={id => openTicket(id)} />
            ))}
            {softC.length > 0 && (
              <div style={{ fontSize: 9, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 2px 2px' }}>
                Soft Warnings
              </div>
            )}
            {softC.map(c => (
              <ConflictItem key={c.id} conflict={c} tickets={pTickets} project={project} onOpenTicket={id => openTicket(id)} />
            ))}
          </>
        )}
      </div>

      <div style={{ padding: '8px 12px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(239,68,68,0.4)', border: '1px solid rgba(239,68,68,0.6)' }} />
          <span style={{ fontSize: 9, color: C.textMut }}>Hard — same environment, same module, overlapping dates</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(234,179,8,0.3)', border: '1px solid rgba(234,179,8,0.5)' }} />
          <span style={{ fontSize: 9, color: C.textMut }}>Soft — different environment, shared module</span>
        </div>
      </div>
    </div>
  )
}
