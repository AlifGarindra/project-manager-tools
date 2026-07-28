import { useEffect, useMemo, useRef, useState } from 'react'
import { C, STATUS_CFG } from './tokens'
import { useAppStore } from '../../stores/appStore'
import { countActiveFilters } from '../../lib/ticketFilters'
import type { Project, Ticket, TicketStatus, TicketType } from '../../types'

const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: 'backend',      label: 'Backend' },
  { value: 'mobile',       label: 'Mobile' },
  { value: 'frontend-web', label: 'Frontend Web' },
]

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = (
  ['planned', 'in-progress', 'blocked', 'done', 'cancelled'] as TicketStatus[]
).map(s => ({ value: s, label: STATUS_CFG[s].label }))

interface Option { value: string; label: string }

function MultiSelect({ label, options, selected, onChange }: {
  label: string
  options: Option[]
  selected: string[]
  onChange: (values: string[]) => void
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

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  const active = selected.length > 0

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 9px', borderRadius: 5,
          background: active ? `${C.accent}12` : open || hov ? C.surfaceEl : 'transparent',
          border: `1px solid ${active ? C.accent + '35' : open || hov ? C.borderEl : C.border}`,
          cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.1s',
          fontSize: 11, color: active ? C.textSec : C.textMut,
        }}
      >
        {label}{active ? ` · ${selected.length}` : ''}
        <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 120,
          minWidth: 168, maxHeight: 246, overflowY: 'auto',
          background: C.surface, border: `1px solid ${C.borderEl}`,
          borderRadius: 6, padding: 4,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}>
          {options.length === 0 && (
            <div style={{ padding: '8px 10px', fontSize: 11, color: C.textMut }}>No options</div>
          )}
          {options.map(opt => {
            const checked = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '5px 8px', borderRadius: 4, border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = C.surfaceEl)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                  border: `1px solid ${checked ? C.accent : C.borderEl}`,
                  background: checked ? C.accent : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff', lineHeight: 1,
                }}>{checked ? '✓' : ''}</span>
                <span style={{ fontSize: 11, color: checked ? C.text : C.textSec, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
              </button>
            )
          })}
          {active && (
            <>
              <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
              <button
                onClick={() => onChange([])}
                style={{
                  width: '100%', padding: '4px 8px', borderRadius: 4, border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.textMut,
                }}
              >Reset</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Bar filter tampilan tiket — dipakai di Timeline dan Board.
 * `tickets` = tiket project TANPA filter (untuk opsi assignee + total count).
 */
export function FilterBar({ project, tickets, visibleCount }: {
  project: Project
  tickets: Ticket[]
  visibleCount: number
}) {
  const { filters, setFilters, clearFilters } = useAppStore()
  const [searchFoc, setSearchFoc] = useState(false)
  const [clearHov, setClearHov]   = useState(false)

  const moduleOptions = useMemo(() =>
    [...project.modules]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(m => ({ value: m.id, label: m.name })),
    [project.modules]
  )

  const assigneeOptions = useMemo(() => {
    const names = new Set<string>()
    let hasUnassigned = false
    for (const t of tickets) {
      const a = t.assignee.trim()
      if (a) names.add(a)
      else hasUnassigned = true
    }
    const opts: Option[] = [...names].sort((a, b) => a.localeCompare(b)).map(n => ({ value: n, label: n }))
    if (hasUnassigned) opts.push({ value: '', label: '(unassigned)' })
    return opts
  }, [tickets])

  const activeCount = countActiveFilters(filters)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      padding: '0 14px', height: 36,
      borderBottom: `1px solid ${C.border}`, background: C.surface,
    }}>
      <div style={{ position: 'relative', width: 200, flexShrink: 0 }}>
        <input
          value={filters.search}
          onChange={e => setFilters({ search: e.target.value })}
          onFocus={() => setSearchFoc(true)}
          onBlur={() => setSearchFoc(false)}
          placeholder="Search tickets…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0c0c0e', borderRadius: 5,
            border: `1px solid ${searchFoc ? C.borderEl : C.border}`,
            padding: '4px 22px 4px 9px', fontSize: 11, color: C.text,
            fontFamily: 'Inter, sans-serif', outline: 'none', transition: 'border-color 0.1s',
          }}
        />
        {filters.search !== '' && (
          <button
            onClick={() => setFilters({ search: '' })}
            style={{
              position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 16, borderRadius: 3, border: 'none',
              background: 'transparent', color: C.textMut, cursor: 'pointer',
              fontSize: 11, lineHeight: 1, padding: 0, fontFamily: 'Inter, sans-serif',
            }}
          >×</button>
        )}
      </div>

      <MultiSelect label="Type"     options={TYPE_OPTIONS}   selected={filters.types}     onChange={v => setFilters({ types: v as TicketType[] })} />
      <MultiSelect label="Status"   options={STATUS_OPTIONS} selected={filters.statuses}  onChange={v => setFilters({ statuses: v as TicketStatus[] })} />
      <MultiSelect label="Module"   options={moduleOptions}  selected={filters.moduleIds} onChange={v => setFilters({ moduleIds: v })} />
      <MultiSelect label="Assignee" options={assigneeOptions} selected={filters.assignees} onChange={v => setFilters({ assignees: v })} />

      <div style={{ flex: 1 }} />

      {activeCount > 0 && (
        <>
          <span style={{ fontSize: 10, color: C.textMut }}>
            {visibleCount} of {tickets.length} tickets
          </span>
          <button
            onMouseEnter={() => setClearHov(true)}
            onMouseLeave={() => setClearHov(false)}
            onClick={clearFilters}
            style={{
              padding: '3px 9px', borderRadius: 5,
              background: clearHov ? C.surfaceEl : 'transparent',
              border: `1px solid ${clearHov ? C.borderEl : C.border}`,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              fontSize: 10, color: C.textSec, transition: 'all 0.1s',
            }}
          >Clear filters</button>
        </>
      )}
    </div>
  )
}
