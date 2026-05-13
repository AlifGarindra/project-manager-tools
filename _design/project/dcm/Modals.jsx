// Modals.jsx — TicketModal + ModuleRegistryModal + EnvManagerModal
const { useState: mSt, useEffect: mFx, useCallback: mCb } = React;

// ── Ticket Modal ──────────────────────────────────────────────────────────────
function TicketModal() {
  const { state, dispatch, conflicts } = useApp();
  const { activeTicketId, ticketMode, projects, tickets, selectedProjectId, newTicketDefaults } = state;

  const isOpen = activeTicketId !== null || ticketMode === 'create';
  const project = projects.find(p => p.id === selectedProjectId);
  const existing = activeTicketId ? tickets.find(t => t.id === activeTicketId) : null;

  const blankForm = mCb(() => ({
    id: generateId('t'),
    projectId: selectedProjectId,
    title: '',
    description: '',
    startDate: TODAY_STR,
    endDate: addDays(TODAY_STR, 4),
    environmentId: project?.environments[0]?.id || '',
    status: newTicketDefaults?.status || 'planned',
    assignee: '',
    modules: [],
    priority: 'medium',
    ...newTicketDefaults,
  }), [selectedProjectId, project, newTicketDefaults]);

  const [form, setForm]     = mSt(() => existing ? { ...existing } : blankForm());
  const [editMode, setEdit] = mSt(ticketMode === 'create');

  // Reset form when modal target changes
  mFx(() => {
    if (ticketMode === 'create') {
      setForm(blankForm());
      setEdit(true);
    } else if (existing) {
      setForm({ ...existing });
      setEdit(ticketMode === 'edit');
    }
  }, [activeTicketId, ticketMode]);

  if (!isOpen || !project) return null;

  const tc      = activeTicketId ? conflicts.filter(c => c.ticket1Id === activeTicketId || c.ticket2Id === activeTicketId) : [];
  const hasHard = tc.some(c => c.type === 'hard');
  const hasSoft = !hasHard && tc.some(c => c.type === 'soft');
  const env     = project.environments.find(e => e.id === form.environmentId);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleModule = (mid) => {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(mid) ? f.modules.filter(m => m !== mid) : [...f.modules, mid],
    }));
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    dispatch({ type: 'SAVE_TICKET', ticket: form });
  };

  const modulesByCategory = project.modules.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {});

  return (
    <div
      onClick={() => dispatch({ type: 'CLOSE_TICKET' })}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.72)',
        zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560, maxHeight: '88vh',
          background: C.surface,
          border: `1px solid ${C.borderEl}`,
          borderRadius: 10,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 100px rgba(0,0,0,0.75)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '12px 14px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 9,
          flexShrink: 0,
        }}>
          {env && <div style={{ width: 8, height: 8, borderRadius: '50%', background: env.color, flexShrink: 0 }} />}
          {editMode ? (
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ticket title…"
              autoFocus
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 14, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif',
              }}
            />
          ) : (
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.text }}>{form.title || 'Untitled'}</span>
          )}
          <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
            {tc.length > 0 && (
              <Badge type={hasHard ? 'hard' : 'soft'}>
                {tc.length} {tc.length === 1 ? 'conflict' : 'conflicts'}
              </Badge>
            )}
            {!editMode && (
              <Btn variant="default" size="sm" onClick={() => setEdit(true)}>Edit</Btn>
            )}
            <button
              onClick={() => dispatch({ type: 'CLOSE_TICKET' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 18, padding: '0 2px', lineHeight: 1 }}
            >×</button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 13 }}>

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
                ? <Sel value={form.status} onChange={v => set('status', v)}>
                    {['planned','in-progress','blocked','done','cancelled'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>
                    ))}
                  </Sel>
                : <div style={{ padding: '3px 0' }}><StatusBadge status={form.status} /></div>
              }
            </Field>
            <Field label="Priority" style={{ flex: 1 }}>
              {editMode
                ? <Sel value={form.priority} onChange={v => set('priority', v)}>
                    {['critical','high','medium','low'].map(p => (
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
                ? <Input type="date" value={form.endDate} onChange={v => set('endDate', v)} />
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
                    const selected = form.modules.includes(mod.id);
                    // check if this module is involved in a conflict
                    const conflicting = tc.some(c => c.modules.includes(mod.id));
                    const cType = conflicting
                      ? (tc.filter(c => c.modules.includes(mod.id)).some(c => c.type === 'hard') ? 'hard' : 'soft')
                      : undefined;
                    return (
                      <ModuleChip
                        key={mod.id}
                        name={mod.name}
                        selected={selected}
                        conflict={selected && conflicting ? cType : undefined}
                        onClick={editMode ? () => toggleModule(mod.id) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            {form.modules.length === 0 && !editMode && (
              <span style={{ fontSize: 11, color: C.textMut }}>No modules selected</span>
            )}
          </Field>

          {/* Conflict warnings in modal */}
          {tc.length > 0 && (
            <Field label="Active Conflicts">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {tc.map(c => {
                  const otherId = c.ticket1Id === activeTicketId ? c.ticket2Id : c.ticket1Id;
                  const other   = tickets.find(t => t.id === otherId);
                  const mNames  = c.modules.map(id => project.modules.find(m => m.id === id)?.name).filter(Boolean);
                  return (
                    <div
                      key={c.id}
                      onClick={() => dispatch({ type: 'OPEN_TICKET', id: otherId, mode: 'view' })}
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
                  );
                })}
              </div>
            </Field>
          )}
        </div>

        {/* ── Footer ── */}
        {editMode && (
          <div style={{
            padding: '10px 14px', borderTop: `1px solid ${C.border}`,
            display: 'flex', gap: 7, flexShrink: 0,
          }}>
            {existing && (
              <Btn variant="danger" size="sm" onClick={() => dispatch({ type: 'DELETE_TICKET', id: existing.id })}>
                Delete
              </Btn>
            )}
            <div style={{ flex: 1 }} />
            <Btn variant="default" size="sm" onClick={() => {
              if (ticketMode === 'create') dispatch({ type: 'CLOSE_TICKET' });
              else setEdit(false);
            }}>Cancel</Btn>
            <Btn variant="primary" size="sm" onClick={handleSave}>
              {ticketMode === 'create' ? 'Create Ticket' : 'Save Changes'}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Module Registry Modal ─────────────────────────────────────────────────────
function ModuleRegistryModal() {
  const { state, dispatch } = useApp();
  const project = state.projects.find(p => p.id === state.selectedProjectId);
  const [modules, setModules] = mSt([...project.modules]);
  const [name, setName]       = mSt('');
  const [cat, setCat]         = mSt('Core');

  const categories = [...new Set(modules.map(m => m.category))];
  const allCats    = [...new Set([...categories, 'Core', 'Auth', 'Infra', 'Operations', 'Other'])];

  const add = () => {
    if (!name.trim()) return;
    setModules(prev => [...prev, { id: generateId('m'), name: name.trim(), category: cat }]);
    setName('');
  };

  const remove = (id) => setModules(prev => prev.filter(m => m.id !== id));

  const save = () => {
    dispatch({ type: 'SAVE_PROJECT', project: { ...project, modules } });
    dispatch({ type: 'CLOSE_REGISTRY' });
  };

  return (
    <ModalShell title="Module Registry" subtitle={project.name} onClose={() => dispatch({ type: 'CLOSE_REGISTRY' })}>
      {/* Add row */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
        <Input value={name} onChange={setName} placeholder="Module name…" style={{ flex: 1 }} />
        <Sel value={cat} onChange={setCat} style={{ width: 110, flexShrink: 0 }}>
          {allCats.map(c => <option key={c} value={c}>{c}</option>)}
        </Sel>
        <Btn variant="primary" size="sm" onClick={add}>Add</Btn>
      </div>

      {/* Module list */}
      {categories.map(c => (
        <div key={c} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{c}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {modules.filter(m => m.category === c).map(mod => (
              <div key={mod.id} style={{
                display: 'flex', alignItems: 'center',
                padding: '6px 9px',
                background: '#0c0c0e', border: `1px solid ${C.border}`, borderRadius: 5, gap: 8,
              }}>
                <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{mod.name}</span>
                <button
                  onClick={() => remove(mod.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 14, padding: 0, lineHeight: 1 }}
                >×</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div slot="footer" style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
        <Btn variant="default" size="sm" onClick={() => dispatch({ type: 'CLOSE_REGISTRY' })}>Cancel</Btn>
        <Btn variant="primary" size="sm" onClick={save}>Save Registry</Btn>
      </div>
    </ModalShell>
  );
}

// ── Env Manager Modal ─────────────────────────────────────────────────────────
function EnvManagerModal() {
  const { state, dispatch } = useApp();
  const project = state.projects.find(p => p.id === state.selectedProjectId);
  const [envs, setEnvs] = mSt([...project.environments]);
  const [name, setName] = mSt('');
  const [color, setColor] = mSt('#6366f1');

  const ENV_COLORS = ['#e11d48','#d97706','#16a34a','#0891b2','#7c3aed','#db2777','#ea580c'];

  const add = () => {
    if (!name.trim()) return;
    setEnvs(prev => [...prev, { id: generateId('env'), name: name.trim().toLowerCase(), color, order: prev.length }]);
    setName('');
  };
  const remove = (id) => setEnvs(prev => prev.filter(e => e.id !== id));
  const save   = () => {
    dispatch({ type: 'SAVE_PROJECT', project: { ...project, environments: envs } });
    dispatch({ type: 'CLOSE_ENV_MANAGER' });
  };

  return (
    <ModalShell title="Environment Manager" subtitle={project.name} onClose={() => dispatch({ type: 'CLOSE_ENV_MANAGER' })}>
      <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
        <Input value={name} onChange={setName} placeholder="e.g. canary" style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {ENV_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 20, height: 20, borderRadius: '50%', background: c,
              border: color === c ? '2px solid #fff' : '2px solid transparent',
              cursor: 'pointer', padding: 0, flexShrink: 0,
            }} />
          ))}
        </div>
        <Btn variant="primary" size="sm" onClick={add}>Add</Btn>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {envs.map((env, i) => (
          <div key={env.id} style={{
            display: 'flex', alignItems: 'center',
            padding: '8px 10px',
            background: '#0c0c0e', border: `1px solid ${C.border}`, borderRadius: 5, gap: 10,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: env.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.text, flex: 1, textTransform: 'capitalize' }}>{env.name}</span>
            <span style={{ fontSize: 9, color: C.textMut }}>Order {i}</span>
            <button
              onClick={() => remove(env.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 14, padding: 0, lineHeight: 1 }}
            >×</button>
          </div>
        ))}
      </div>

      <div slot="footer" style={{ display: 'flex', gap: 7, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="default" size="sm" onClick={() => dispatch({ type: 'CLOSE_ENV_MANAGER' })}>Cancel</Btn>
        <Btn variant="primary" size="sm" onClick={save}>Save Environments</Btn>
      </div>
    </ModalShell>
  );
}

// ── Shared modal shell ────────────────────────────────────────────────────────
function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.72)',
        zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480, maxHeight: '82vh',
          background: C.surface,
          border: `1px solid ${C.borderEl}`,
          borderRadius: 10,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 100px rgba(0,0,0,0.75)',
        }}
      >
        <div style={{
          padding: '12px 14px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>{title}</span>
          {subtitle && <span style={{ fontSize: 11, color: C.textMut }}>{subtitle}</span>}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TicketModal, ModuleRegistryModal, EnvManagerModal, ModalShell });
