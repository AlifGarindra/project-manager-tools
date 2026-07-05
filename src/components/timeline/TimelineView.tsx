import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { C } from '../ui/tokens'
import { Badge } from '../ui/Badge'
import { Btn } from '../ui/Btn'
import { useAppStore } from '../../stores/appStore'
import { useConflicts, useConflictZones } from '../../hooks/useConflicts'
import type { ConflictZone } from '../../lib/conflict'
import { useTickets, useSaveTicket } from '../../hooks/useTickets'
import { useProjects } from '../../hooks/useProjects'
import { daysBetween, addDays, offset, TODAY_STR, formatDate, generateId, withDerivedEndDate, parseDate } from '../../lib/utils'
import type { Ticket, ConflictPair } from '../../types'

const LEFT_W     = 148
const ROW_H      = 100
const HDR_H      = 52
const DEFAULT_DW = 80
const TOTAL_DAYS = 35

function buildDates(startStr: string, count: number) {
  const out: { str: string; d: Date }[] = []
  for (let i = 0; i < count; i++) {
    const str = addDays(startStr, i)
    out.push({ str, d: parseDate(str) })
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
      if (ticket.deployments.length === 0) continue

      // Satu titik per env: deployment terbaru di env itu; env rumah tanpa
      // deployment dapat titik "planned" di startDate
      const pointByEnv = new Map<string, { date: string; isPlanned: boolean }>()
      for (const d of ticket.deployments) {
        const cur = pointByEnv.get(d.environmentId)
        if (!cur || d.date > cur.date) pointByEnv.set(d.environmentId, { date: d.date, isPlanned: false })
      }
      if (!pointByEnv.has(ticket.environmentId)) {
        pointByEnv.set(ticket.environmentId, { date: ticket.startDate, isPlanned: true })
      }

      // Urutan garis mengikuti TANGGA ENV (paling bawah → paling atas, sesuai
      // env.order), BUKAN urutan tanggal — alur promosi selalu env → env di
      // atasnya, tanggal hanya menentukan posisi horizontal.
      // sortedEnvColors terurut top-first, jadi index terbesar = env terbawah.
      const ladder = sortedEnvColors
        .map((e, idx) => ({ envId: e.id, idx, color: e.color, point: pointByEnv.get(e.id) }))
        .filter(x => x.point)
        .sort((a, b) => b.idx - a.idx)   // bawah → atas

      for (let i = 0; i < ladder.length - 1; i++) {
        const from = ladder[i]
        const to   = ladder[i + 1]

        const xOff1 = daysBetween(viewStart, from.point!.date)
        const xOff2 = daysBetween(viewStart, to.point!.date)
        if (Math.max(xOff1, xOff2) < 0 || Math.min(xOff1, xOff2) >= TOTAL_DAYS) continue

        result.push({
          key: `${ticket.id}-${i}`,
          x1: xOff1 * dw + dw / 2,
          y1: from.idx * ROW_H + ROW_H / 2,
          x2: xOff2 * dw + dw / 2,
          y2: to.idx * ROW_H + ROW_H / 2,
          color: to.color ?? C.accent,
          isPlanned: from.point!.isPlanned || to.point!.isPlanned,
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
  sortedEnvIds: string[]
  rowsContainerRef: React.RefObject<HTMLDivElement | null>   // container rows — origin perhitungan drag
  dragEndRef: React.MutableRefObject<boolean>                // suppress row-click setelah drag
  onSaveTicket: (ticket: Ticket) => void
  onMoveTicket: (id: string, startDate: string, endDate: string, envId?: string) => void
  onRemoveDeployment: (ticketId: string, environmentId: string, date: string) => void
}

function MarkerBox({
  group, envIdx, viewStart, dw, onOpen, conflicts, moduleNames, allTickets,
  sortedEnvIds, rowsContainerRef, dragEndRef, onSaveTicket, onMoveTicket, onRemoveDeployment,
}: MarkerBoxProps) {
  const [open, setOpen]         = useState(false)
  const [popupStyle, setPopup]  = useState<React.CSSProperties>({})
  const [drag, setDrag]         = useState<{
    startX: number; startY: number
    dayDelta: number; targetEnvIdx: number
    ticket: Ticket                       // tiket spesifik yang sedang ditarik
  } | null>(null)
  // Mousedown di baris popup: belum tentu drag — jadi drag begitu bergerak >5px,
  // kalau dilepas tanpa gerak dianggap klik (buka detail tiket)
  const [pendingDrag, setPendingDrag] = useState<{
    startX: number; startY: number; ticket: Ticket
  } | null>(null)

  const ref = useRef<HTMLDivElement>(null)
  // Set when a mouseup actually moved the marker, so the click event that the
  // browser fires right after the drag doesn't also open the ticket modal
  const didDragRef = useRef(false)

  const xOff = daysBetween(viewStart, group.date)

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
  // Marker always keeps its environment color — conflicts are indicated by the
  // red/yellow ConflictZoneOverlay on the overlapping dates, not by recoloring
  const accentColor = group.envColor
  const bgColor     = `${group.envColor}22`

  // ── Drag logic ──────────────────────────────────────────────────────────────
  // Row target diukur langsung dari kontainer rows — tanpa asumsi tinggi
  // header/toolbar (HDR_H offset lama membuat drag horizontal di row bawah
  // salah terdeteksi sebagai pindah env)
  const computeEnvIdx = (mouseY: number) => {
    const rect = rowsContainerRef.current?.getBoundingClientRect()
    if (!rect) return envIdx
    return Math.max(0, Math.min(sortedEnvIds.length - 1, Math.floor((mouseY - rect.top) / ROW_H)))
  }

  const startDrag = (e: React.MouseEvent, ticket: Ticket) => {
    if (e.button !== 0) return
    e.preventDefault(); e.stopPropagation()
    setDrag({ startX: e.clientX, startY: e.clientY, dayDelta: 0, targetEnvIdx: envIdx, ticket })
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (!solo || !soloTicket) return
    startDrag(e, soloTicket)
  }

  useEffect(() => {
    if (!pendingDrag) return
    const onMM = (e: MouseEvent) => {
      if (Math.abs(e.clientX - pendingDrag.startX) > 5 || Math.abs(e.clientY - pendingDrag.startY) > 5) {
        setOpen(false)
        setDrag({
          startX: pendingDrag.startX, startY: pendingDrag.startY,
          dayDelta: 0, targetEnvIdx: envIdx, ticket: pendingDrag.ticket,
        })
        setPendingDrag(null)
      }
    }
    const onMU = () => setPendingDrag(null)
    document.addEventListener('mousemove', onMM)
    document.addEventListener('mouseup', onMU)
    return () => { document.removeEventListener('mousemove', onMM); document.removeEventListener('mouseup', onMU) }
  }, [pendingDrag, envIdx])

  useEffect(() => {
    if (!drag) return
    const onMM = (e: MouseEvent) => {
      const dd   = Math.round((e.clientX - drag.startX) / dw)
      const tIdx = computeEnvIdx(e.clientY)
      setDrag(prev => prev ? { ...prev, dayDelta: dd, targetEnvIdx: tIdx } : null)
    }
    const onMU = (e: MouseEvent) => {
      const dd           = Math.round((e.clientX - drag.startX) / dw)
      const tIdx         = computeEnvIdx(e.clientY)
      const newDate      = addDays(group.date, dd)
      const targetEnvId  = sortedEnvIds[tIdx] ?? group.environmentId
      const t            = drag.ticket

      // No movement → plain click, let handleClick take over (and skip the save)
      if (dd === 0 && tIdx === envIdx) {
        setDrag(null)
        return
      }
      didDragRef.current = true
      dragEndRef.current = true   // suppress click pada env row setelah drag

      if (group.isPlanned) {
        // Marker planned (env rumah, belum ada deployment DI SINI) → geser startDate.
        // Catatan: jangan cek t.deployments.length — tiket bisa saja sudah punya
        // deployment di env LAIN sementara marker ini tetap planned; branch
        // "update deployment" di bawah tidak akan menemukan entry yang cocok
        // dan drag horizontal jadi no-op.
        const newEnvId = tIdx !== envIdx ? targetEnvId : undefined
        onMoveTicket(t.id, newDate, t.endDate ?? newDate, newEnvId)
      } else if (targetEnvId === group.environmentId) {
        // Same env: update this deployment's date
        const updated: Ticket = {
          ...t,
          deployments: t.deployments.map(d =>
            d.environmentId === group.environmentId && d.date === group.date
              ? { ...d, date: newDate }
              : d
          ),
        }
        onSaveTicket(updated)
      } else {
        // Different env: add or update deployment in target env
        const existingInTarget = t.deployments.find(d => d.environmentId === targetEnvId)
        const newDeployments = existingInTarget
          ? t.deployments.map(d =>
              d.environmentId === targetEnvId ? { ...d, date: newDate } : d
            )
          : [...t.deployments, { id: generateId(), environmentId: targetEnvId, date: newDate }]
        onSaveTicket({ ...t, deployments: newDeployments })
      }
      setDrag(null)
    }
    document.addEventListener('mousemove', onMM)
    document.addEventListener('mouseup', onMU)
    return () => { document.removeEventListener('mousemove', onMM); document.removeEventListener('mouseup', onMU) }
  }, [drag, dw, envIdx, group]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Click logic ─────────────────────────────────────────────────────────────
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (didDragRef.current) { didDragRef.current = false; return }
    if (drag) return
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

  // Out of the visible date window. This check MUST come after every hook —
  // an early return before useEffect changes the hook count between renders
  // and crashes React ("Rendered fewer hooks than expected") when Prev/Next
  // scrolls a previously visible marker out of range.
  if (xOff < 0 || xOff >= TOTAL_DAYS) return null

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
          {group.isPlanned ? '◌' : '●'}
        </span>

        {/* Single ticket: show name */}
        {solo && soloTicket && (
          <span style={{
            fontSize: 9, fontWeight: 500,
            color: C.textSec,
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

        {/* Saat drag dari popup: tampilkan tiket yang sedang ditarik */}
        {multiple && isDragging && drag && (
          <span style={{
            fontSize: 9, fontWeight: 600, color: C.textSec,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            width: '100%', padding: '0 4px', boxSizing: 'border-box', textAlign: 'center',
          }}>
            {drag.ticket.title}
          </span>
        )}

        {/* Multiple tickets: stack icon */}
        {multiple && !isDragging && (
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
          <div style={{ ...popupStyle, zIndex: 9999, background: C.surface, border: `1px solid ${C.borderEl}`, borderRadius: 8, boxShadow: '0 12px 48px rgba(0,0,0,0.7)', overflow: 'hidden', userSelect: 'none' }}>
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
                  {/* Ticket title row — klik = buka detail, tekan+geser = drag tiket ini */}
                  <div
                    onClick={e => { e.stopPropagation(); setOpen(false); onOpen(t.id) }}
                    onMouseDown={e => {
                      if (e.button !== 0) return
                      e.preventDefault()   // cegah text selection saat mulai drag
                      e.stopPropagation()
                      setPendingDrag({ startX: e.clientX, startY: e.clientY, ticket: t })
                    }}
                    title="Klik untuk detail · tekan lalu geser untuk pindah tanggal/env"
                    style={{ padding: '10px 10px', cursor: 'grab', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1d')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Indikator draggable */}
                    <span style={{ color: C.textMut, fontSize: 12, lineHeight: 1, flexShrink: 0, pointerEvents: 'none' }}>⠿</span>
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

// ── Conflict zone background (per environment, per jendela overlap) ───────────
function ConflictZoneOverlay({ zone, viewStart, dw }: { zone: ConflictZone; viewStart: string; dw: number }) {
  const s = daysBetween(viewStart, zone.startDate)
  const e = daysBetween(viewStart, zone.endDate) + 1
  if (e <= 0 || s >= TOTAL_DAYS) return null
  const isH = zone.type === 'hard'
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
  const { selectedProjectId, openTicket, newTicket } = useAppStore()
  const { data: allTickets = [] } = useTickets()
  const { data: projects = [] }   = useProjects()
  const { mutate: saveTicket }    = useSaveTicket()
  const allConflicts = useConflicts(allTickets)
  const allZones     = useConflictZones(allTickets)

  // Computed early so callbacks below can reference them
  const project    = projects.find(p => p.id === selectedProjectId)
  const sortedEnvs = project ? [...project.environments].sort((a, b) => a.order - b.order) : []
  const topEnvId   = sortedEnvs[0]?.id

  const saveTicketWithDerived = useCallback((ticket: Ticket) => {
    saveTicket(withDerivedEndDate(ticket, topEnvId))
  }, [saveTicket, topEnvId])

  const moveTicket = useCallback((id: string, startDate: string, _endDate: string, environmentId?: string) => {
    const ticket = allTickets.find(t => t.id === id)
    if (!ticket) return
    const envChanged = environmentId && environmentId !== ticket.environmentId
    let updated: Ticket
    if (envChanged) {
      // Cross-env drag: add/update deployment in target env, keep home env + startDate intact
      const existing = ticket.deployments.find(d => d.environmentId === environmentId)
      updated = {
        ...ticket,
        deployments: existing
          ? ticket.deployments.map(d => d.environmentId === environmentId ? { ...d, date: startDate } : d)
          : [...ticket.deployments, { id: generateId(), environmentId: environmentId!, date: startDate }],
      }
    } else {
      // Same-env drag: shift the planned date
      updated = { ...ticket, startDate }
    }
    saveTicket(withDerivedEndDate(updated, topEnvId))
  }, [allTickets, saveTicket, topEnvId])

  const removeDeploymentEntry = useCallback((ticketId: string, environmentId: string, date: string) => {
    const ticket = allTickets.find(t => t.id === ticketId)
    if (!ticket) return
    const sorted = [...ticket.deployments].sort((a, b) => a.date.localeCompare(b.date))
    const idx = sorted.findIndex(d => d.environmentId === environmentId && d.date === date)
    if (idx === -1) return
    saveTicket(withDerivedEndDate({ ...ticket, deployments: sorted.slice(0, idx) }, topEnvId))
  }, [allTickets, saveTicket, topEnvId])

  const [dw, setDw]       = useState(DEFAULT_DW)
  const [vsOff, setVsOff] = useState(-10)
  const [hdrDrag, setHdrDrag] = useState<{ startX: number; vsOff0: number } | null>(null)

  const scrollRef   = useRef<HTMLDivElement>(null)
  const rowsRef     = useRef<HTMLDivElement>(null)   // origin geometri drag marker
  const dragEndRef  = useRef(false)                  // suppress row-click sesaat setelah drag

  const viewStart  = useMemo(() => offset(vsOff), [vsOff])
  const dates      = useMemo(() => buildDates(viewStart, TOTAL_DAYS), [viewStart])
  const months     = useMemo(() => buildMonths(dates), [dates])
  const pTickets   = allTickets.filter(t => t.projectId === selectedProjectId)
  const pConf      = allConflicts.filter(c => c.projectId === selectedProjectId)
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
        // If home env (ticket.environmentId) has no deployment yet, keep showing planned marker there
        const hasHomeDeployment = ticket.deployments.some(d => d.environmentId === ticket.environmentId)
        if (!hasHomeDeployment) {
          const key = `planned::${ticket.environmentId}::${ticket.startDate}`
          if (!map.has(key)) {
            const env = sortedEnvs.find(e => e.id === ticket.environmentId)
            map.set(key, { key, environmentId: ticket.environmentId, date: ticket.startDate, envColor: env?.color ?? C.accent, isPlanned: true, tickets: [] })
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

  useEffect(() => {
    if (!hdrDrag) return
    const onMM = (e: MouseEvent) => {
      const days = Math.round((e.clientX - hdrDrag.startX) / dw)
      setVsOff(hdrDrag.vsOff0 - days)
    }
    const onMU = () => setHdrDrag(null)
    document.addEventListener('mousemove', onMM)
    document.addEventListener('mouseup', onMU)
    return () => {
      document.removeEventListener('mousemove', onMM)
      document.removeEventListener('mouseup', onMU)
    }
  }, [hdrDrag, dw])

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
            <div
              onMouseDown={e => {
                if (e.button !== 0) return
                e.preventDefault()
                setHdrDrag({ startX: e.clientX, vsOff0: vsOff })
              }}
              style={{
                position: 'sticky', top: 0, background: C.surface,
                borderBottom: `1px solid ${C.border}`, zIndex: 3,
                cursor: hdrDrag ? 'grabbing' : 'grab',
                userSelect: 'none',
              }}
            >
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
            <div ref={rowsRef} style={{ position: 'relative', height: totalH }}>

              {/* Deployment progression bezier lines */}
              <DeploymentConnectors tickets={pTickets} sortedEnvColors={sortedEnvColors} viewStart={viewStart} dw={dw} />

              {/* Env rows (backgrounds, conflict zones, today line) */}
              {sortedEnvs.map((env, idx) => {
                // Zona hanya digambar di env tempat overlap benar-benar terjadi;
                // soft dirender dulu agar hard tampak di atasnya
                const envZones = allZones
                  .filter(z => z.projectId === selectedProjectId && z.environmentId === env.id)
                  .sort(a => (a.type === 'soft' ? -1 : 1))
                return (
                  <div
                    key={env.id}
                    style={{
                      position: 'absolute', top: idx * ROW_H, left: 0,
                      width: totalW, height: ROW_H,
                      borderBottom: `1px solid ${C.border}`,
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.007)',
                    }}
                    onClick={() => {
                      // Klik yang terjadi tepat setelah drag marker bukan intent buat tiket baru
                      if (dragEndRef.current) { dragEndRef.current = false; return }
                      newTicket({ environmentId: env.id })
                    }}
                  >
                    {dates.map(({ str, d }, i) =>
                      (d.getDay() === 0 || d.getDay() === 6)
                        ? <div key={str} style={{ position: 'absolute', left: i * dw, top: 0, bottom: 0, width: dw, background: '#0d0d10', pointerEvents: 'none' }} />
                        : null
                    )}
                    {envZones.map(z => <ConflictZoneOverlay key={z.id} zone={z} viewStart={viewStart} dw={dw} />)}
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
                      sortedEnvIds={sortedEnvs.map(e => e.id)}
                      rowsContainerRef={rowsRef}
                      dragEndRef={dragEndRef}
                      onSaveTicket={saveTicketWithDerived}
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
