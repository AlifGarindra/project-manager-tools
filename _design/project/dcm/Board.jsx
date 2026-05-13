// Board.jsx — Kanban view
const { useState: bSt } = React;

const COLUMNS = [
  { id: 'planned',     label: 'Planned' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'blocked',     label: 'Blocked' },
  { id: 'done',        label: 'Done' },
  { id: 'cancelled',   label: 'Cancelled' },
];

function BoardCard({ ticket, project, conflicts, onClick }) {
  const [hov, setHov] = bSt(false);
  const env = project.environments.find(e => e.id === ticket.environmentId);
  const tc  = conflicts.filter(c => c.ticket1Id === ticket.id || c.ticket2Id === ticket.id);
  const hasHard = tc.some(c => c.type === 'hard');
  const hasSoft = !hasHard && tc.some(c => c.type === 'soft');
  const hasConflict = hasHard || hasSoft;
  const conflictColor = hasHard ? C.hard : C.soft;

  return (
    <div
      onClick={() => onClick(ticket.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.surfaceEl : C.surface,
        border: `1px solid ${hasConflict ? conflictColor + '40' : C.border}`,
        borderRadius: 6,
        padding: '10px 11px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.1s, border-color 0.1s',
        overflow: 'hidden',
      }}
    >
      {/* Left conflict accent bar */}
      {hasConflict && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
          background: conflictColor,
        }} />
      )}

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 7 }}>
        <PriorityDot priority={ticket.priority} />
        <span style={{ fontSize: 12, fontWeight: 500, color: C.text, flex: 1, lineHeight: 1.45 }}>
          {ticket.title}
        </span>
      </div>

      {/* Module chips */}
      {ticket.modules.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
          {ticket.modules.slice(0, 3).map(mid => {
            const mod = project.modules.find(m => m.id === mid);
            return mod ? (
              <span key={mid} style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 3,
                background: '#1c1c1f', color: C.textMut,
                border: `1px solid ${C.border}`,
                fontFamily: 'Inter, sans-serif',
              }}>{mod.name}</span>
            ) : null;
          })}
          {ticket.modules.length > 3 && (
            <span style={{ fontSize: 9, color: C.textMut }}>+{ticket.modules.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {env && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: env.color }} />
            <span style={{ fontSize: 9, color: C.textMut, textTransform: 'capitalize' }}>{env.name}</span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        {hasConflict && <Badge type={hasHard ? 'hard' : 'soft'} size="xs">{hasHard ? 'conflict' : 'warning'}</Badge>}
        <span style={{ fontSize: 9, color: C.textMut }}>
          {formatDate(ticket.startDate)} – {formatDate(ticket.endDate)}
        </span>
      </div>
    </div>
  );
}

function BoardColumn({ col, tickets, project, conflicts, dispatch }) {
  const [dragOver, setDragOver] = bSt(false);
  const [hoverAdd, setHoverAdd] = bSt(false);

  const statusColors = {
    'planned':     C.textMut,
    'in-progress': C.blue,
    'blocked':     C.hard,
    'done':        C.green,
    'cancelled':   C.textMut,
  };
  const accentColor = statusColors[col.id] || C.textMut;

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        width: 252, flexShrink: 0,
        background: dragOver ? '#161618' : '#111113',
        border: `1px solid ${dragOver ? C.borderEl : C.border}`,
        borderRadius: 8,
        overflow: 'hidden',
        transition: 'background 0.1s, border-color 0.1s',
        maxHeight: '100%',
      }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData('ticketId');
        if (!id) return;
        const ticket = project && tickets.concat(
          // find in all tickets
        );
        dispatch({ type: 'SAVE_TICKET', ticket: { ...window._boardDragTicket, status: col.id } });
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '9px 12px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 7,
        flexShrink: 0,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, opacity: 0.8 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec, flex: 1 }}>{col.label}</span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: C.textMut,
          background: '#1c1c1f', padding: '1px 5px', borderRadius: 3, border: `1px solid ${C.border}`,
        }}>{tickets.length}</span>
      </div>

      {/* Cards */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '8px 8px 0',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {tickets.map(ticket => (
          <div
            key={ticket.id}
            draggable
            onDragStart={e => {
              e.dataTransfer.setData('ticketId', ticket.id);
              window._boardDragTicket = ticket;
            }}
          >
            <BoardCard
              ticket={ticket}
              project={project}
              conflicts={conflicts}
              onClick={id => dispatch({ type: 'OPEN_TICKET', id, mode: 'view' })}
            />
          </div>
        ))}
        {tickets.length === 0 && (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: C.textMut, fontSize: 11 }}>
            No tickets
          </div>
        )}
      </div>

      {/* Add button */}
      <div style={{ padding: 8, flexShrink: 0 }}>
        <button
          onMouseEnter={() => setHoverAdd(true)}
          onMouseLeave={() => setHoverAdd(false)}
          onClick={() => dispatch({ type: 'NEW_TICKET', defaults: { status: col.id } })}
          style={{
            width: '100%', padding: '5px',
            background: 'transparent',
            border: `1px dashed ${hoverAdd ? C.borderEl : C.border + '88'}`,
            borderRadius: 5, color: hoverAdd ? C.textSec : C.textMut,
            fontSize: 11, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.1s',
          }}
        >
          + Add ticket
        </button>
      </div>
    </div>
  );
}

function BoardView() {
  const { state, dispatch, conflicts } = useApp();
  const project = state.projects.find(p => p.id === state.selectedProjectId);
  const tickets = state.tickets.filter(t => t.projectId === state.selectedProjectId);
  const pConf   = conflicts.filter(c => c.projectId === state.selectedProjectId);
  const hardC   = pConf.filter(c => c.type === 'hard').length;
  const softC   = pConf.filter(c => c.type === 'soft').length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.bg, minHeight: 0 }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        padding: '0 14px', height: 40,
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
      }}>
        <span style={{ fontSize: 11, color: C.textMut }}>
          {tickets.length} tickets
        </span>
        {(hardC > 0 || softC > 0) && (
          <div style={{ display: 'flex', gap: 4 }}>
            {hardC > 0 && <Badge type="hard">{hardC} hard</Badge>}
            {softC > 0 && <Badge type="soft">{softC} soft</Badge>}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <Btn variant="primary" size="sm" onClick={() => dispatch({ type: 'NEW_TICKET' })}>
          + Ticket
        </Btn>
      </div>

      {/* Board */}
      <div style={{
        flex: 1, overflowX: 'auto', overflowY: 'hidden',
        padding: '14px 14px 14px',
        display: 'flex', gap: 10,
        alignItems: 'flex-start',
      }}>
        {COLUMNS.map(col => (
          <BoardColumn
            key={col.id}
            col={col}
            tickets={tickets.filter(t => t.status === col.id)}
            project={project}
            conflicts={pConf}
            dispatch={dispatch}
          />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { BoardView });
