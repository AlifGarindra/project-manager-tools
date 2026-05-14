import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { C } from '../ui/tokens'
import { Badge } from '../ui/Badge'
import { Btn } from '../ui/Btn'
import { useAppStore } from '../../stores/appStore'
import { useConflicts } from '../../hooks/useConflicts'
import { daysBetween, addDays, offset, TODAY_STR, formatDate } from '../../lib/utils'
import type { Ticket, ConflictPair } from '../../types'

const LEFT_W     = 148
const ROW_H      = 100
const HDR_H      = 52
const DEFAULT_DW = 80
const TOTAL_DAYS = 35

function buildDates(startStr: string, count: number) {
  const out: { str: string; d: Date }[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(startStr)
    d.setDate(d.getDate() + i)
    out.push({ str: format(d, 'yyyy-MM-dd'), d })
  }
  return out
}

function buildMonths(dates: { str: string; d: Date }[]) {
  const months: { key: string; label: string; count: number }[] = []
  let cur: typeof months[number] | null = null
  dates.forEach(({ str, d }) => {
    const key = str.slice(0, 7)
    if (!cur || cur.key !== key) {
      cur = { key, label: format(d, 'MMMM yyyy'), count: 1 }
      months.push(cur)
    } else { cur.count++ }
  })
  return months
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarkerGroup {
  key: string
  environmentId: string
  date: string
  envColor: string
  isPlanned: boolean   // true = belum ada actual deployment, hanya rencana
  tickets: Ticket[]
}

// ── Deployment connector lines (bezier antar env row) ─────────────────────────
function DeploymentConnectors({
  tickets, sortedEnvColors, viewStart, dw,
}: {
  tickets: Ticket[]
  sortedEnvColors: { id: string; color: string }[]
  viewStart: string
  dw: number
}) {
  const totalH = sortedEnvColors.length * ROW_H
  const totalW = TOTAL_DAYS * dw

  const paths = useMemo(() => {
    const result: { key: string; x1: number; y1: number; x2: number; y2: number; color: string; isPlanned: boolean }[] = []

    for (const ticket of tickets) {
      if (ticket.deployments.length < 2) continue

      const sorted = [...ticket.deployments].sort((a, b) => a.date.localeCompare(b.date))
      for (let i = 0; i < sorted.length - 1; i++) {
        const from = sorted[i]
        const to   = sorted[i + 1]
        const idx1 = sortedEnvColors.findIndex(e => e.id === from.environmentId)
        const idx2 = sortedEnvColors.findIndex(e => e.id === to.environmentId)
        if (idx1 === -1 || idx2 === -1) continue

        const xOff1 = daysBetween(viewStart, from.date)
        const xOff2 = daysBetween(viewStart, to.date)
        if (xOff2 < 0 || xOff1 >= TOTAL_DAYS) continue

        const x1 = xOff1 * dw + dw / 2
        const x2 = xOff2 * dw + dw / 2
        const y1 = idx1 * ROW_H + ROW_H / 2
        const y2 = idx2 * ROW_H + ROW_H / 2

        result.push({
          key: `${ticket.id}-${i}`,
          x1, y1, x2, y2,
          color: sortedEnvColors[idx2]?.color ?? C.accent,
          isPlanned: false,
        })
      }
    }

    return result
  }, [tickets, sortedEnvColors, viewStart, dw])

  if (paths.length === 0) return null

  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, width: totalW, height: totalH, pointerEvents: 'none', zIndex: 12, overflow: 'visible' }}>
      {paths.map(p => {
        const mx = p.x1 + (p.x2 - p.x1) * 0.5
        return (
          <g key={p.key}>
            {/* Glow */}
            <path d={`M ${p.x1} ${p.y1} C ${mx} ${p.y1}, ${mx} ${p.y2}, ${p.x2} ${p.y2}`} stroke={`${p.color}30`} strokeWidth={7} fill="none" />
            {/* Line */}
            <path d={`M ${p.x1} ${p.y1} C ${mx} ${p.y1}, ${mx} ${p.y2}, ${p.x2} ${p.y2}`} stroke={`${p.color}85`} strokeWidth={1.5} strokeDasharray="5 3" fill="none" />
            {/* Destination dot */}
            <circle cx={p.x2} cy={p.y2} r={5} fill={p.color} opacity={0.85} />
            <circle cx={p.x2} cy={p.y2} r={2.5} fill="#000" opacity={0.35} />
          </g>
        )
      })}
    </svg>
  )
}

// ── Compact deployment marker — width = 1 day cell ───────────────────────────
interface MarkerBoxProps {
  group: MarkerGroup
  envIdx: number
  viewStart: string
  dw: number
  onOpen: (id: string) => void
  conflicts: ConflictPair[]
  moduleNames: Record<string, string>
  allTickets: Ticket[]                  // for resolving "conflicts with" names
  sortedEnvCount: number
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  onSaveTicket: (ticket: Ticket) => void
  onMoveTicket: (id: string, startDate: string, endDate: string, envId?: string) => void
  onRemoveDeployment: (ticketId: string, environmentId: string, date: string) => void
}

function MarkerBox({
  group, envIdx, viewStart, dw, onOpen, conflicts, moduleNames, allTickets,
  sortedEnvCount, scrollContainerRef, onSaveTicket, onMoveTicket, onRemoveDeployment,
}: MarkerBoxProps) {
  const [open, setOpen]         = useState(false)
  const [popupStyle, setPopup]  = useState<React.CSSProperties>({})
  const [drag, setDrag]         = useState<{
    startX: number; startY: number
    dayDelta: number; targetEnvIdx: number
  } | null>(null)

  const ref = useRef<HTMLDivElement>(null)

  const xOff = daysBetween(viewStart, group.date)
  if (xOff < 0 || xOff >= TOTAL_DAYS) return null

  const width      = Math.max(dw - 4, 10)
  const barH       = ROW_H - 22
  const multiple   = group.tickets.length > 1
  const solo       = !multiple
  const soloTicket = solo ? group.tickets[0] : null

  // Visual position (shifts during drag)
  const dispLeft = (xOff + (drag?.dayDelta ?? 0)) * dw + 2
  const dispTop  = (drag ? drag.targetEnvIdx : envIdx) * ROW_H + 10

  const hasHard   = group.tickets.some(t => conflicts.some(c => (c.ticket1Id === t.id || c.ticket2Id === t.id) && c.type === 'hard'))
  const hasSoft   = !hasHard && group.tickets.some(t => conflicts.some(c => c.ticket1Id === t.id || c.ticket2Id === t.id))
  const accentColor = hasHard ? '#ef4444' : hasSoft ? '#eab308' : group.envColor
  const bgColor     = hasHard ? 'rgba(239,68,68,0.18)' : hasSoft ? 'rgba(234,179,8,0.14)' : `${group.envColor}22`

  // ── Drag logic ──────────────────────────────────────────────────────────────
  const computeEnvIdx = (mouseY: number) => {
    const rect = scrollContainerRef.current?.getBoundingClientRect()
    if (!rect) return envIdx
    const relY = mouseY - rect.top - HDR_H
    return Math.max(0, Math.min(sortedEnvCount - 1, Math.floor(relY / ROW_H)))
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !solo) return
    e.preventDefault(); e.stopPropagation()
    setDrag({ startX: e.clientX, startY: e.clientY, dayDelta: 0, targetEnvIdx: envIdx })
  }

  useEffect(() => {
    if (!drag) return
    const onMM = (e: MouseEvent) => {
      const dd   = Math.round((e.clientX - drag.startX) / dw)
      const tIdx = computeEnvIdx(e.clientY)
      setDrag(prev => prev ? { ...prev, dayDelta: dd, targetEnvIdx: tIdx } : null)
    }
    const onMU = (e: MouseEvent) => {
      const dd      = Math.round((e.clientX - drag.startX) / dw)
      const tIdx    = computeEnvIdx(e.clientY)
      const newDate = addDays(group.date, dd)
      if (soloTicket) {
        if (soloTicket.deployments.length === 0) {
          // Planned marker → update startDate + possibly env
          const newEnvId = tIdx !== envIdx ? group.environmentId : undefined
          onMoveTicket(soloTicket.id, newDate, soloTicket.endDate ?? newDate, newEnvId)
        } else {
          // Actual deployment entry → update that specific entry
          const updated: Ticket = {
            ...soloTicket,
            deployments: soloTicket.deployments.map(d =>
              d.environmentId === group.environmentId && d.date === group.date
                ? { ...d, date: newDate, environmentId: group.environmentId }
                : d
            ),
          }
          onSaveTicket(updated)
        }
      }
      setDrag(null)
    }
    document.addEventListener('mousemove', onMM)
    document.addEventListener('mouseup', onMU)
    return () => { document.removeEventListener('mousemove', onMM); document.removeEventListener('mouseup', onMU) }
  }, [drag, dw, envIdx, soloTicket, group]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Click logic ─────────────────────────────────────────────────────────────
  const handleClick = (e: React.MouseEvent) => {
    if (drag) return
    e.stopPropagation()
    if (solo && soloTicket) { onOpen(soloTicket.id); return }
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const pw   = 240
      let x = rect.left + rect.width / 2 - pw / 2
      x = Math.max(8, Math.min(window.innerWidth - pw - 8, x))
      setPopup({ position: 'fixed', top: rect.bottom + 6, left: x, width: pw })
    }
    setOpen(v => !v)
  }

  const isDragging      = drag !== null
  const movedToOtherEnv = isDragging && drag.targetEnvIdx !== envIdx

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: dispLeft, top: dispTop,
        zIndex: isDragging ? 50 : 14,
        pointerEvents: 'auto',
        transition: isDragging ? 'none' : 'left 0.05s, top 0.05s',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Compact marker ── */}
      <div
        onMouseDown={solo ? onMouseDown : undefined}
        onClick={handleClick}
        title={group.tickets.map(t => t.title).join(', ')}
        style={{
          width, height: barH,
          background: bgColor,
          border: `1.5px ${group.isPlanned ? 'dashed' : 'solid'} ${
            movedToOtherEnv ? C.accent : accentColor
          }${group.isPlanned ? '70' : 'bb'}`,
          borderRadius: 4,
          cursor: isDragging ? 'grabbing' : solo ? 'grab' : 'pointer',
          opacity: group.isPlanned ? 0.72 : 1,
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'flex-start', gap: 2,
          paddingTop: 6,
          boxShadow: isDragging
            ? `0 8px 32px rgba(0,0,0,0.6), 0 0 0 2px ${movedToOtherEnv ? C.accent : accentColor}50`
            : 'none',
          userSelect: 'none',
        }}
        onMouseEnter={e => { if (!isDragging) e.currentTarget.style.filter = 'brightness(1.35)' }}
        onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
      >
        {/* Top color bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, borderRadius: '3px 3px 0 0', background: movedToOtherEnv ? C.accent : accentColor }} />

        {/* Icon */}
        <span style={{ fontSize: 10, lineHeight: 1, flexShrink: 0 }}>
          {hasHard ? '⚡' : hasSoft ? '◎' : group.isPlanned ? '◌' : '●'}
        </span>

        {/* Single ticket: show name */}
        {solo && soloTicket && (
          <span style={{
            fontSize: 9, fontWeight: 500,
            color: hasHard ? '#ef4444' : hasSoft ? '#eab308' : C.textSec,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            width: '100%', padding: '0 4px', boxSizing: 'border-box',
            textAlign: 'center', lineHeight: 1.4,
          }}>
            {soloTicket.title}
          </span>
        )}

        {/* Delete button — single ticket, actual deployment (not planned) */}
        {solo && soloTicket && !group.isPlanned && !isDragging && (
          <button
            onClick={e => {
              e.stopPropagation()
              onRemoveDeployment(soloTicket.id, group.environmentId, group.date)
            }}
            title="Delete this deployment entry (cascades to later envs)"
            style={{
              position: 'absolute', bottom: 3, right: 3,
              width: 14, height: 14, borderRadius: 2,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', fontSize: 9, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >×</button>
        )}

        {/* Multiple tickets: stack icon */}
        {multiple && (
          <>
            <div style={{ position: 'relative', width: 14, height: 10, flexShrink: 0 }}>
              <div style={{ position: 'absolute', left: 2, top: 2, width: 10, height: 8, borderRadius: 2, border: `1px solid ${accentColor}60`, background: `${accentColor}15` }} />
              <div style={{ position: 'absolute', left: 0, top: 0, width: 10, height: 8, borderRadius: 2, border: `1px solid ${accentColor}90`, background: bgColor }} />
            </div>
            <span style={{ fontSize: 8, fontWeight: 800, lineHeight: 1, color: accentColor, background: `${accentColor}25`, padding: '1px 3px', borderRadius: 2, border: `1px solid ${accentColor}55` }}>
              {group.tickets.length}
            </span>
          </>
        )}

        {/* Cross-env drag label */}
        {movedToOtherEnv && (
          <span style={{ fontSize: 7, color: C.accentHov, fontWeight: 700, marginTop: 2 }}>
            → env {drag.targetEnvIdx + 1}
          </span>
        )}
      </div>

      {/* Anchor dot */}
      <div style={{
        position: 'absolute', left: width / 2 - 3, bottom: -5,
        width: 6, height: 6, borderRadius: '50%',
        background: accentColor, border: `2px solid ${C.bg}`,
        boxShadow: `0 0 5px ${accentColor}80`,
      }} />

      {/* Popup */}
      {open && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={e => { e.stopPropagation(); setOpen(false) }} />
          <div style={{ ...popupStyle, zIndex: 9999, background: C.surface, border: `1px solid ${C.borderEl}`, borderRadius: 8, boxShadow: '0 12px 48px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: group.envColor }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{formatDate(group.date)}</span>
              {group.isPlanned && <span style={{ fontSize: 9, color: C.textMut, fontStyle: 'italic' }}>planned</span>}
              <div style={{ flex: 1 }} />
              {hasHard && <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>⚡ Hard</span>}
              {hasSoft && !hasHard && <span style={{ fontSize: 9, color: '#eab308', fontWeight: 700 }}>◎ Soft</span>}
            </div>
            {group.tickets.map(t => {
              // Only conflicts for THIS specific ticket
              const tc    = conflicts.filter(c => c.ticket1Id === t.id || c.ticket2Id === t.id)
              const tHard = tc.some(c => c.type === 'hard')
              const tSoft = !tHard && tc.length > 0
              return (
                <div key={t.id}
                  style={{ borderBottom: `1px solid ${C.border}40`, display: 'flex', flexDirection: 'column' }}
                >
                  {/* Ticket title row */}
                  <div
                    onClick={e => { e.stopPropagation(); setOpen(false); onOpen(t.id) }}
                    style={{ padding: '9px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1d')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {tHard && <span style={{ fontSize: 10 }}>⚡</span>}
                    {tSoft && !tHard && <span style={{ fontSize: 10 }}>◎</span>}
                    <span style={{ fontSize: 12, fontWeight: 600, color: tHard ? '#ef4444' : tSoft ? '#eab308' : C.text, flex: 1 }}>{t.title}</span>
                    {/* Delete deployment entry for this ticket */}
                    {!group.isPlanned && (
                      <button
                        onClick={e => { e.stopPropagation(); setOpen(false); onRemoveDeployment(t.id, group.environmentId, group.date) }}
                        title="Delete this deployment (cascades to later envs)"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 3, color: '#ef4444', fontSize: 10, padding: '1px 5px', cursor: 'pointer', flexShrink: 0 }}
                      >×</button>
                    )}
                  </div>

                  {/* Conflict details: only conflicts OF this ticket, with who */}
                  {tc.length > 0 && (
                    <div style={{ padding: '4px 10px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {tc.map(c => {
                        const otherId   = c.ticket1Id === t.id ? c.ticket2Id : c.ticket1Id
                        const other     = allTickets.find(x => x.id === otherId)
                        const mNames    = c.modules.map(id => moduleNames[id]).filter(Boolean)
                        return (
                          <div key={c.id} style={{ fontSize: 10, color: C.textMut, paddingLeft: 8, lineHeight: 1.5 }}>
                            <span style={{ color: c.type === 'hard' ? '#ef4444' : '#eab308', fontWeight: 700 }}>
                              {c.type === 'hard' ? '⚡ HARD' : '◎ SOFT'}
                            </span>
                            {' with '}
                            <span style={{ color: C.textSec, fontWeight: 600 }}>{other?.title ?? otherId}</span>
                            <span style={{ color: C.textMut }}> · {mNames.join(', ')}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {tc.length === 0 && (
                    <span style={{ fontSize: 10, color: C.textMut, padding: '0 10px 8px 18px' }}>No conflicts</span>
                  )}
                </div>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ── Conflict zone background ──────────────────────────────────────────────────
function ConflictZoneOverlay({ conflict, viewStart, dw }: { conflict: ConflictPair; viewStart: string; dw: number }) {
  const s = daysBetween(viewStart, conflict.overlapStart)
  const e = daysBetween(viewStart, conflict.overlapEnd) + 1
  if (e <= 0 || s >= TOTAL_DAYS) return null
  const isH = conflict.type === 'hard'
  return (
    <div style={{
      position: 'absolute', left: s * dw, top: 0, bottom: 0, width: (e - s) * dw,
      background: isH ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.06)',
      borderLeft:  `1px dashed ${isH ? 'rgba(239,68,68,0.35)' : 'rgba(234,179,8,0.28)'}`,
      borderRight: `1px dashed ${isH ? 'rgba(239,68,68,0.35)' : 'rgba(234,179,8,0.28)'}`,
      pointerEvents: 'none', zIndex: 0,
    }} />
  )
}

// ── Main Timeline View ────────────────────────────────────────────────────────
export function TimelineView() {
  const { tickets, projects, selectedProjectId, openTicket, newTicket, saveTicket, moveTicket, removeDeploymentEntry } = useAppStore()
  const allConflicts = useConflicts(tickets)

  const [dw, setDw]     = useState(DEFAULT_DW)
  const [vsOff, setVsOff] = useState(-10)

  const scrollRef = useRef<HTMLDivElement>(null)

  const viewStart  = useMemo(() => offset(vsOff), [vsOff])
  const dates      = useMemo(() => buildDates(viewStart, TOTAL_DAYS), [viewStart])
  const months     = useMemo(() => buildMonths(dates), [dates])
  const project    = projects.find(p => p.id === selectedProjectId)
  const pTickets   = tickets.filter(t => t.projectId === selectedProjectId)
  const pConf      = allConflicts.filter(c => c.projectId === selectedProjectId)
  const sortedEnvs = project ? [...project.environments].sort((a, b) => a.order - b.order) : []
  const sortedEnvColors = sortedEnvs.map(e => ({ id: e.id, color: e.color }))

  const totalW    = TOTAL_DAYS * dw
  const totalH    = sortedEnvs.length * ROW_H
  const todayLeft = daysBetween(viewStart, TODAY_STR) * dw

  // Build marker groups — actual deployments + planned (no deployment yet)
  const markerGroups = useMemo((): MarkerGroup[] => {
    const map = new Map<string, MarkerGroup>()

    for (const ticket of pTickets) {
      if (ticket.status === 'done' || ticket.status === 'cancelled') continue

      if (ticket.deployments.length > 0) {
        for (const dep of ticket.deployments) {
          const key = `actual::${dep.environmentId}::${dep.date}`
          if (!map.has(key)) {
            const env = sortedEnvs.find(e => e.id === dep.environmentId)
            map.set(key, { key, environmentId: dep.environmentId, date: dep.date, envColor: env?.color ?? C.accent, isPlanned: false, tickets: [] })
          }
          map.get(key)!.tickets.push(ticket)
        }
      } else {
        // No deployments yet — show as planned marker at startDate
        const key = `planned::${ticket.environmentId}::${ticket.startDate}`
        if (!map.has(key)) {
          const env = sortedEnvs.find(e => e.id === ticket.environmentId)
          map.set(key, { key, environmentId: ticket.environmentId, date: ticket.startDate, envColor: env?.color ?? C.accent, isPlanned: true, tickets: [] })
        }
        map.get(key)!.tickets.push(ticket)
      }
    }

    return Array.from(map.values())
  }, [pTickets, sortedEnvs])

  useEffect(() => {
    if (scrollRef.current) {
      const off = daysBetween(viewStart, TODAY_STR)
      scrollRef.current.scrollLeft = Math.max(0, off * dw - 200)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hardC = pConf.filter(c => c.type === 'hard').length
  const softC = pConf.filter(c => c.type === 'soft').length

  // Lookup map moduleId → name for conflict popup display
  const moduleNames = useMemo(() =>
    Object.fromEntries(project?.modules.map(m => [m.id, m.name]) ?? []),
    [project?.modules]
  )

  if (!project) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: C.bg }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, padding: '0 14px', height: 42, borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ display: 'flex', gap: 1 }}>
          {([['← Prev', () => setVsOff(v => v-7)], ['Today', () => setVsOff(-10)], ['Next →', () => setVsOff(v => v+7)]] as [string, () => void][]).map(([label, fn]) => (
            <Btn key={label} variant="ghost" size="sm" onClick={fn}>{label}</Btn>
          ))}
        </div>

        <div style={{ width: 1, height: 16, background: C.border }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, color: C.textMut, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Zoom</span>
          {([['−', -20], ['+', 20]] as [string, number][]).map(([l, d]) => (
            <button key={l} onClick={() => setDw(w => Math.min(180, Math.max(80, w+d)))} style={{ width: 22, height: 22, borderRadius: 4, background: '#1c1c1f', border: `1px solid ${C.border}`, color: C.textSec, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>{l}</button>
          ))}
          <span style={{ fontSize: 10, color: C.textMut, width: 44, textAlign: 'center' }}>{dw}px/day</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: C.textMut }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12 }}>●</span> Deployed
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.5 }}>◌</span> Planned
          </span>
        </div>

        {(hardC > 0 || softC > 0) && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {hardC > 0 && <Badge type="hard">{hardC} hard conflict{hardC > 1 ? 's' : ''}</Badge>}
            {softC > 0 && <Badge type="soft">{softC} soft warning{softC > 1 ? 's' : ''}</Badge>}
          </div>
        )}

        <Btn variant="primary" size="sm" onClick={() => newTicket()}>+ Ticket</Btn>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Left env label column */}
        <div style={{ width: LEFT_W, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.surface, display: 'flex', flexDirection: 'column', zIndex: 4 }}>
          <div style={{ height: HDR_H, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-end', padding: '0 14px 8px' }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Environment</span>
          </div>
          {sortedEnvs.map(env => {
            const envC = pConf.filter(c => {
              const t1 = pTickets.find(t => t.id === c.ticket1Id)
              const t2 = pTickets.find(t => t.id === c.ticket2Id)
              return t1?.environmentId === env.id || t2?.environmentId === env.id
                  || t1?.deployments.some(d => d.environmentId === env.id)
                  || t2?.deployments.some(d => d.environmentId === env.id)
            })
            const hasH = envC.some(c => c.type === 'hard')
            const hasS = !hasH && envC.length > 0
            const deployed = pTickets.filter(t => t.deployments.some(d => d.environmentId === env.id)).length
            const planned  = pTickets.filter(t => t.deployments.length === 0 && t.environmentId === env.id).length

            return (
              <div key={env.id} style={{
                height: ROW_H, flexShrink: 0, borderBottom: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: env.color, flexShrink: 0, boxShadow: `0 0 6px ${env.color}60` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec, textTransform: 'capitalize', display: 'block' }}>{env.name}</span>
                  <span style={{ fontSize: 9, color: C.textMut }}>
                    {deployed > 0 && `${deployed} deployed`}
                    {deployed > 0 && planned > 0 && ' · '}
                    {planned > 0 && `${planned} planned`}
                    {deployed === 0 && planned === 0 && '—'}
                  </span>
                </div>
                {(hasH || hasS) && <div style={{ width: 6, height: 6, borderRadius: '50%', background: hasH ? C.hard : C.soft, boxShadow: `0 0 4px ${hasH ? C.hard : C.soft}80` }} />}
              </div>
            )
          })}
        </div>

        {/* Scrollable timeline */}
        <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>
          <div style={{ width: totalW, minWidth: totalW, position: 'relative' }}>

            {/* Date header */}
            <div style={{ position: 'sticky', top: 0, background: C.surface, borderBottom: `1px solid ${C.border}`, zIndex: 3 }}>
              <div style={{ display: 'flex', height: 18, borderBottom: `1px solid ${C.border}33` }}>
                {months.map(m => (
                  <div key={m.key} style={{ width: m.count * dw, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 8px', borderRight: `1px solid ${C.border}33` }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden' }}>{m.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', height: 34 }}>
                {dates.map(({ str, d }) => {
                  const isToday   = str === TODAY_STR
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  const isFirst   = d.getDate() === 1
                  return (
                    <div key={str} style={{ width: dw, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${isToday ? `${C.accent}60` : C.border + '55'}`, background: isToday ? `${C.accent}12` : isWeekend ? '#0d0d10' : 'transparent', position: 'relative', gap: 1 }}>
                      {isToday ? (
                        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 22, height: 22, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 8px ${C.accent}60` }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{d.getDate()}</span>
                        </div>
                      ) : (
                        <>
                          <span style={{ fontSize: 8, color: isWeekend ? '#3f3f4680' : C.textMut, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{DAY_LABELS[d.getDay()]}</span>
                          <span style={{ fontSize: 10, fontWeight: isFirst ? 700 : 400, color: isWeekend ? '#3f3f46' : isFirst ? C.textSec : C.textMut }}>{d.getDate()}</span>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Rows + overlay container */}
            <div style={{ position: 'relative', height: totalH }}>

              {/* Deployment progression bezier lines */}
              <DeploymentConnectors tickets={pTickets} sortedEnvColors={sortedEnvColors} viewStart={viewStart} dw={dw} />

              {/* Env rows (backgrounds, conflict zones, today line) */}
              {sortedEnvs.map((env, idx) => {
                const envConflicts = pConf.filter(c => {
                  const t1 = pTickets.find(t => t.id === c.ticket1Id)
                  const t2 = pTickets.find(t => t.id === c.ticket2Id)
                  const inEnv = (t: typeof pTickets[0] | undefined) =>
                    t?.environmentId === env.id || t?.deployments.some(d => d.environmentId === env.id)
                  return inEnv(t1) || inEnv(t2)
                })
                return (
                  <div
                    key={env.id}
                    style={{
                      position: 'absolute', top: idx * ROW_H, left: 0,
                      width: totalW, height: ROW_H,
                      borderBottom: `1px solid ${C.border}`,
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.007)',
                    }}
                    onClick={() => newTicket({ environmentId: env.id })}
                  >
                    {dates.map(({ str, d }, i) =>
                      (d.getDay() === 0 || d.getDay() === 6)
                        ? <div key={str} style={{ position: 'absolute', left: i * dw, top: 0, bottom: 0, width: dw, background: '#0d0d10', pointerEvents: 'none' }} />
                        : null
                    )}
                    {envConflicts.map(c => <ConflictZoneOverlay key={c.id} conflict={c} viewStart={viewStart} dw={dw} />)}
                    {todayLeft >= 0 && todayLeft <= totalW && (
                      <div style={{ position: 'absolute', left: todayLeft, top: 0, bottom: 0, width: 1, background: `${C.accent}50`, pointerEvents: 'none', zIndex: 5 }} />
                    )}
                  </div>
                )
              })}

              {/* Flat marker container — all markers share one absolute layer so they can drag across rows */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: totalW, height: totalH, pointerEvents: 'none', zIndex: 14 }}>
                {markerGroups.map(group => {
                  const eIdx = sortedEnvs.findIndex(e => e.id === group.environmentId)
                  if (eIdx === -1) return null
                  return (
                    <MarkerBox
                      key={group.key}
                      group={group}
                      envIdx={eIdx}
                      viewStart={viewStart}
                      dw={dw}
                      onOpen={openTicket}
                      conflicts={pConf}
                      moduleNames={moduleNames}
                      sortedEnvCount={sortedEnvs.length}
                      scrollContainerRef={scrollRef}
                      onSaveTicket={saveTicket}
                      onMoveTicket={moveTicket}
                      onRemoveDeployment={removeDeploymentEntry}
                      allTickets={pTickets}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
