// Timeline.jsx — Gantt chart view
const { useState: tlSt, useRef: tlRef, useEffect: tlFx, useMemo: tlMemo, useCallback: tlCb } = React;

const LEFT_W   = 136;
const ROW_H    = 56;
const HDR_H    = 52; // month row (18) + day row (34)
const DEFAULT_DW = 44;
const TOTAL_DAYS = 35;

function buildDates(startStr, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startStr);
    d.setDate(d.getDate() + i);
    out.push({ str: d.toISOString().split('T')[0], d });
  }
  return out;
}

function buildMonths(dates) {
  const months = [];
  let cur = null;
  dates.forEach(({ str, d }) => {
    const key = str.slice(0, 7);
    if (!cur || cur.key !== key) {
      cur = { key, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), count: 1 };
      months.push(cur);
    } else {
      cur.count++;
    }
  });
  return months;
}

// ── Ticket Bar ────────────────────────────────────────────────────────────────
function TicketBar({ ticket, env, viewStart, dw, conflicts, onOpen, onMove }) {
  const [hov, setHov]   = tlSt(false);
  const [drag, setDrag] = tlSt(null); // { startX, origStart, origEnd }
  const barRef = tlRef(null);

  const startOff = daysBetween(viewStart, ticket.startDate);
  const dur      = daysBetween(ticket.startDate, ticket.endDate) + 1;
  const left     = startOff * dw;
  const width    = Math.max(dw - 2, dur * dw - 2);

  const tc      = conflicts.filter(c => c.ticket1Id === ticket.id || c.ticket2Id === ticket.id);
  const hasHard = tc.some(c => c.type === 'hard');
  const hasSoft = !hasHard && tc.some(c => c.type === 'soft');

  const barBg     = hasHard ? 'rgba(239,68,68,0.13)'  : hasSoft ? 'rgba(234,179,8,0.09)'  : `${env.color}12`;
  const barBorder = hasHard ? 'rgba(239,68,68,0.55)'  : hasSoft ? 'rgba(234,179,8,0.45)'  : `${env.color}55`;
  const barBgHov  = hasHard ? 'rgba(239,68,68,0.2)'   : hasSoft ? 'rgba(234,179,8,0.15)'  : `${env.color}22`;

  // Drag handlers
  const onMouseDown = tlCb((e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDrag({ startX: e.clientX, origStart: ticket.startDate, origEnd: ticket.endDate });
    e.preventDefault();
  }, [ticket.startDate, ticket.endDate]);

  tlFx(() => {
    if (!drag) return;
    const onMove = (e) => {
      const dx = e.clientX - drag.startX;
      const dayDelta = Math.round(dx / dw);
      if (dayDelta === 0) return;
      const ns = addDays(drag.origStart, dayDelta);
      const ne = addDays(drag.origEnd, dayDelta);
      onMove(ticket.id, ns, ne);
    };
    const onUp = (e) => {
      const dx = e.clientX - drag.startX;
      const dayDelta = Math.round(dx / dw);
      if (dayDelta !== 0) {
        onMove(ticket.id, addDays(drag.origStart, dayDelta), addDays(drag.origEnd, dayDelta));
      }
      setDrag(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [drag, dw]);

  return (
    <div
      ref={barRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseDown={onMouseDown}
      onClick={(e) => { if (!drag) { e.stopPropagation(); onOpen(ticket.id); } }}
      style={{
        position: 'absolute',
        left,
        top: 9,
        width,
        height: ROW_H - 20,
        borderRadius: 4,
        background: drag ? barBgHov : (hov ? barBgHov : barBg),
        border: `1px solid ${hov || drag ? (hasHard ? '#ef4444' : hasSoft ? '#eab308' : env.color) : barBorder}`,
        cursor: drag ? 'grabbing' : 'grab',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center',
        padding: '0 7px',
        gap: 5,
        transition: drag ? 'none' : 'background 0.1s, border-color 0.1s',
        boxSizing: 'border-box',
        zIndex: hov || drag ? 20 : 2,
        userSelect: 'none',
      }}
    >
      <div style={{ width: 3, minWidth: 3, height: '55%', borderRadius: 2, background: env.color, flexShrink: 0 }} />
      {(hasHard || hasSoft) && (
        <span style={{
          fontSize: 8, fontWeight: 700, flexShrink: 0,
          color: hasHard ? C.hard : C.soft,
          background: hasHard ? 'rgba(239,68,68,0.18)' : 'rgba(234,179,8,0.15)',
          padding: '1px 4px', borderRadius: 2,
          border: `1px solid ${hasHard ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.25)'}`,
        }}>
          {hasHard ? '⚡' : '◎'}
        </span>
      )}
      <span style={{
        fontSize: 11, fontWeight: 500,
        color: (hov || drag) ? C.text : C.textSec,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        transition: 'color 0.1s',
      }}>
        {ticket.title}
      </span>
      {dur > 3 && (
        <span style={{ fontSize: 9, color: C.textMut, flexShrink: 0 }}>
          {formatDate(ticket.startDate)}
        </span>
      )}
    </div>
  );
}

// ── Conflict zone overlay ─────────────────────────────────────────────────────
function ConflictZoneOverlay({ conflict, viewStart, dw }) {
  const s = daysBetween(viewStart, conflict.overlapStart);
  const e = daysBetween(viewStart, conflict.overlapEnd) + 1;
  if (e <= 0 || s >= TOTAL_DAYS) return null;
  const left  = s * dw;
  const width = (e - s) * dw;
  const isH   = conflict.type === 'hard';
  return (
    <div
      style={{
        position: 'absolute',
        left, top: 0, bottom: 0,
        width,
        background: isH ? 'rgba(239,68,68,0.055)' : 'rgba(234,179,8,0.04)',
        borderLeft:  `1px dashed ${isH ? 'rgba(239,68,68,0.25)' : 'rgba(234,179,8,0.2)'}`,
        borderRight: `1px dashed ${isH ? 'rgba(239,68,68,0.25)' : 'rgba(234,179,8,0.2)'}`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

// ── Main Timeline View ────────────────────────────────────────────────────────
function TimelineView() {
  const { state, dispatch, conflicts } = useApp();
  const [dw, setDw]   = tlSt(DEFAULT_DW);
  const [vsOff, setVsOff] = tlSt(-5);
  const scrollRef = tlRef(null);

  const viewStart = tlMemo(() => offset(vsOff), [vsOff]);
  const dates     = tlMemo(() => buildDates(viewStart, TOTAL_DAYS), [viewStart]);
  const months    = tlMemo(() => buildMonths(dates), [dates]);

  const project = state.projects.find(p => p.id === state.selectedProjectId);
  const tickets = state.tickets.filter(t => t.projectId === state.selectedProjectId);
  const pConf   = conflicts.filter(c => c.projectId === state.selectedProjectId);
  const sortedEnvs = [...project.environments].sort((a, b) => a.order - b.order);

  const totalW    = TOTAL_DAYS * dw;
  const todayLeft = daysBetween(viewStart, TODAY_STR) * dw;

  tlFx(() => {
    if (scrollRef.current) {
      const todayOff = daysBetween(viewStart, TODAY_STR);
      scrollRef.current.scrollLeft = Math.max(0, todayOff * dw - 180);
    }
  }, []);

  const handleMove = tlCb((id, ns, ne) => {
    dispatch({ type: 'MOVE_TICKET', id, startDate: ns, endDate: ne });
  }, [dispatch]);

  const hardC = pConf.filter(c => c.type === 'hard').length;
  const softC = pConf.filter(c => c.type === 'soft').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: C.bg }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        padding: '0 14px', height: 40,
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
      }}>
        <div style={{ display: 'flex', gap: 1 }}>
          {[['← Prev',() => setVsOff(v => v-7)], ['Today',() => setVsOff(-5)], ['Next →',() => setVsOff(v => v+7)]].map(([label, fn]) => (
            <Btn key={label} variant="ghost" size="sm" onClick={fn}>{label}</Btn>
          ))}
        </div>

        <div style={{ width: 1, height: 16, background: C.border }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, color: C.textMut, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Zoom</span>
          {[['−', -8], ['+', 8]].map(([label, delta]) => (
            <button key={label} onClick={() => setDw(w => Math.min(80, Math.max(22, w + delta)))} style={{
              width: 22, height: 22, borderRadius: 4,
              background: '#1c1c1f', border: `1px solid ${C.border}`,
              color: C.textSec, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Inter, sans-serif',
            }}>{label}</button>
          ))}
          <span style={{ fontSize: 10, color: C.textMut, width: 44, textAlign: 'center' }}>{dw}px/day</span>
        </div>

        <div style={{ flex: 1 }} />

        {(hardC > 0 || softC > 0) && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {hardC > 0 && <Badge type="hard">{hardC} hard conflict{hardC > 1 ? 's' : ''}</Badge>}
            {softC > 0 && <Badge type="soft">{softC} soft warning{softC > 1 ? 's' : ''}</Badge>}
          </div>
        )}

        <Btn variant="primary" size="sm" onClick={() => dispatch({ type: 'NEW_TICKET' })}>
          + Ticket
        </Btn>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Left label column */}
        <div style={{
          width: LEFT_W, flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          background: C.surface,
          display: 'flex', flexDirection: 'column',
          zIndex: 4,
        }}>
          {/* Header spacer */}
          <div style={{
            height: HDR_H,
            borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'flex-end',
            padding: '0 12px 7px',
          }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Environment
            </span>
          </div>

          {/* Env rows */}
          {sortedEnvs.map(env => {
            const envT  = tickets.filter(t => t.environmentId === env.id);
            const envC  = pConf.filter(c => {
              const t1 = tickets.find(t => t.id === c.ticket1Id);
              const t2 = tickets.find(t => t.id === c.ticket2Id);
              return (t1?.environmentId === env.id) || (t2?.environmentId === env.id);
            });
            const hasH = envC.some(c => c.type === 'hard');
            const hasS = !hasH && envC.length > 0;
            return (
              <div key={env.id} style={{
                height: ROW_H, flexShrink: 0,
                borderBottom: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center',
                padding: '0 12px', gap: 8,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: env.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: C.textSec, textTransform: 'capitalize', flex: 1 }}>
                  {env.name}
                </span>
                {(hasH || hasS) && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: hasH ? C.hard : C.soft, flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 9, color: C.textMut, flexShrink: 0 }}>{envT.length}</span>
              </div>
            );
          })}
        </div>

        {/* Scrollable timeline area */}
        <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>
          <div style={{ width: totalW, minWidth: totalW, position: 'relative' }}>

            {/* ── Date header ── */}
            <div style={{ position: 'sticky', top: 0, background: C.surface, borderBottom: `1px solid ${C.border}`, zIndex: 3 }}>
              {/* Month row */}
              <div style={{ display: 'flex', height: 18, borderBottom: `1px solid ${C.border}33` }}>
                {months.map(m => (
                  <div key={m.key} style={{
                    width: m.count * dw, flexShrink: 0,
                    display: 'flex', alignItems: 'center',
                    padding: '0 8px',
                    borderRight: `1px solid ${C.border}33`,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
              {/* Day row */}
              <div style={{ display: 'flex', height: 34 }}>
                {dates.map(({ str, d }, i) => {
                  const isToday   = str === TODAY_STR;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isFirst   = d.getDate() === 1;
                  return (
                    <div key={str} style={{
                      width: dw, flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      borderRight: `1px solid ${isToday ? `${C.accent}60` : C.border + '55'}`,
                      background: isToday ? `${C.accent}12` : isWeekend ? '#0c0c0f' : 'transparent',
                      position: 'relative',
                      gap: 1,
                    }}>
                      {isToday && (
                        <div style={{
                          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                          width: 22, height: 22, borderRadius: '50%',
                          background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{d.getDate()}</span>
                        </div>
                      )}
                      {!isToday && <>
                        <span style={{ fontSize: 8, color: isWeekend ? C.textMut + '80' : C.textMut, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          {['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()]}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: isFirst ? 600 : 400, color: isWeekend ? C.textMut : C.textSec }}>
                          {d.getDate()}
                        </span>
                      </>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Environment rows ── */}
            {sortedEnvs.map(env => {
              const envTickets = tickets.filter(t => t.environmentId === env.id);
              const hardZones  = pConf.filter(c => {
                if (c.type !== 'hard') return false;
                const t1 = tickets.find(t => t.id === c.ticket1Id);
                const t2 = tickets.find(t => t.id === c.ticket2Id);
                return t1?.environmentId === env.id && t2?.environmentId === env.id;
              });
              const softZones = pConf.filter(c => {
                if (c.type !== 'soft') return false;
                const t1 = tickets.find(t => t.id === c.ticket1Id);
                const t2 = tickets.find(t => t.id === c.ticket2Id);
                return t1?.environmentId === env.id || t2?.environmentId === env.id;
              });

              return (
                <div key={env.id} style={{
                  position: 'relative', height: ROW_H, flexShrink: 0,
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {/* Weekend shading */}
                  {dates.map(({ str, d }, i) => {
                    const isW = d.getDay() === 0 || d.getDay() === 6;
                    if (!isW) return null;
                    return <div key={str} style={{ position: 'absolute', left: i * dw, top: 0, bottom: 0, width: dw, background: '#0c0c0f', pointerEvents: 'none' }} />;
                  })}

                  {/* Conflict zone overlays */}
                  {[...hardZones, ...softZones].map(c => (
                    <ConflictZoneOverlay key={c.id} conflict={c} viewStart={viewStart} dw={dw} />
                  ))}

                  {/* Today vertical line */}
                  {todayLeft >= 0 && todayLeft <= totalW && (
                    <div style={{
                      position: 'absolute', left: todayLeft, top: 0, bottom: 0, width: 1,
                      background: `${C.accent}45`, pointerEvents: 'none', zIndex: 5,
                    }} />
                  )}

                  {/* Ticket bars */}
                  {envTickets.map(ticket => (
                    <TicketBar
                      key={ticket.id}
                      ticket={ticket}
                      env={env}
                      viewStart={viewStart}
                      dw={dw}
                      conflicts={pConf}
                      onOpen={id => dispatch({ type: 'OPEN_TICKET', id, mode: 'view' })}
                      onMove={handleMove}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TimelineView });
