// ui.jsx — Shared UI primitives, color tokens, form controls
const { useState: uiUs } = React;

// ── Color Tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:        '#09090b',
  surface:   '#111113',
  surfaceEl: '#1c1c1f',
  border:    '#27272a',
  borderEl:  '#3f3f46',
  text:      '#fafafa',
  textSec:   '#a1a1aa',
  textMut:   '#52525b',
  accent:    '#6366f1',
  accentHov: '#818cf8',
  accentDim: '#6366f120',
  hard:      '#ef4444',
  soft:      '#eab308',
  green:     '#22c55e',
  blue:      '#60a5fa',
};

const PRIORITY_COLORS = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#52525b',
};

const STATUS_CFG = {
  'planned':     { label: 'Planned',     color: '#71717a', bg: '#1a1a1d' },
  'in-progress': { label: 'In Progress', color: '#60a5fa', bg: '#1a2236' },
  'blocked':     { label: 'Blocked',     color: '#ef4444', bg: '#2a1414' },
  'done':        { label: 'Done',        color: '#22c55e', bg: '#14231a' },
  'cancelled':   { label: 'Cancelled',   color: '#3f3f46', bg: '#111113' },
};

// ── Base Components ───────────────────────────────────────────────────────────

function Badge({ children, type = 'default', size = 'sm' }) {
  const variants = {
    hard:    { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.28)' },
    soft:    { bg: 'rgba(234,179,8,0.1)',   color: '#eab308', border: 'rgba(234,179,8,0.25)' },
    accent:  { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'rgba(99,102,241,0.28)' },
    green:   { bg: 'rgba(34,197,94,0.1)',   color: '#22c55e', border: 'rgba(34,197,94,0.25)' },
    default: { bg: '#1c1c1f',               color: '#71717a', border: '#27272a' },
  };
  const v = variants[type] || variants.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: size === 'xs' ? '0px 5px' : '1px 6px',
      borderRadius: 3,
      fontSize: size === 'xs' ? 9 : 10,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      fontFamily: 'Inter, sans-serif',
      background: v.bg,
      color: v.color,
      border: `1px solid ${v.border}`,
    }}>{children}</span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG['planned'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px',
      borderRadius: 3,
      fontSize: 10,
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.color}33`,
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
    }}>{cfg.label}</span>
  );
}

function PriorityDot({ priority }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 6, height: 6,
      borderRadius: '50%',
      background: PRIORITY_COLORS[priority] || C.textMut,
      flexShrink: 0,
    }} />
  );
}

function Btn({ children, variant = 'default', size = 'sm', onClick, disabled, style: extraStyle }) {
  const [hov, setHov] = uiUs(false);
  const vars = {
    default: { bg: hov ? '#27272a' : 'transparent', color: hov ? C.textSec : C.textMut, border: `1px solid ${hov ? C.borderEl : C.border}` },
    primary: { bg: hov ? C.accentHov : C.accent,    color: '#fff',                       border: 'none' },
    ghost:   { bg: hov ? '#1c1c1f' : 'transparent', color: hov ? C.text : C.textSec,     border: 'none' },
    danger:  { bg: hov ? '#3f0f0f' : '#2a0909',     color: '#fca5a5',                    border: '1px solid #7f1d1d' },
    active:  { bg: C.accentDim,                      color: C.accentHov,                  border: `1px solid ${C.accent}44` },
  };
  const v = vars[variant] || vars.default;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: size === 'xs' ? '2px 7px' : size === 'sm' ? '4px 10px' : '7px 14px',
        borderRadius: 5,
        fontSize: size === 'xs' ? 10 : size === 'sm' ? 12 : 13,
        fontWeight: 500,
        fontFamily: 'Inter, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.1s, border-color 0.1s, color 0.1s',
        background: v.bg, color: v.color, border: v.border,
        ...extraStyle,
      }}
    >{children}</button>
  );
}

function Input({ value, onChange, placeholder, type = 'text', style: extra }) {
  const [foc, setFoc] = uiUs(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFoc(true)}
      onBlur={() => setFoc(false)}
      style={{
        background: '#0c0c0e',
        border: `1px solid ${foc ? C.borderEl : C.border}`,
        borderRadius: 5,
        padding: '5px 9px',
        fontSize: 12,
        color: C.text,
        fontFamily: 'Inter, sans-serif',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        transition: 'border-color 0.1s',
        ...extra,
      }}
    />
  );
}

function Sel({ value, onChange, children, style: extra }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: '#0c0c0e',
        border: `1px solid ${C.border}`,
        borderRadius: 5,
        padding: '5px 9px',
        fontSize: 12,
        color: C.text,
        fontFamily: 'Inter, sans-serif',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        cursor: 'pointer',
        ...extra,
      }}
    >{children}</select>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3, style: extra }) {
  const [foc, setFoc] = uiUs(false);
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFoc(true)}
      onBlur={() => setFoc(false)}
      style={{
        background: '#0c0c0e',
        border: `1px solid ${foc ? C.borderEl : C.border}`,
        borderRadius: 5,
        padding: '5px 9px',
        fontSize: 12,
        color: C.text,
        fontFamily: 'Inter, sans-serif',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        resize: 'vertical',
        transition: 'border-color 0.1s',
        lineHeight: 1.6,
        ...extra,
      }}
    />
  );
}

function Hr({ style: extra }) {
  return <div style={{ height: 1, background: C.border, flexShrink: 0, ...extra }} />;
}

function Field({ label, children, style: extra }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...extra }}>
      <label style={{
        fontSize: 10, fontWeight: 600, color: C.textMut,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        fontFamily: 'Inter, sans-serif',
      }}>{label}</label>
      {children}
    </div>
  );
}

// Kbd-style tag chip
function ModuleChip({ name, selected, onClick, conflict }) {
  const [hov, setHov] = uiUs(false);
  const borderColor = selected
    ? (conflict === 'hard' ? '#ef444460' : conflict === 'soft' ? '#eab30860' : `${C.accent}60`)
    : C.border;
  const bgColor = selected
    ? (conflict === 'hard' ? 'rgba(239,68,68,0.12)' : conflict === 'soft' ? 'rgba(234,179,8,0.1)' : `${C.accent}18`)
    : hov ? C.surfaceEl : 'transparent';
  const textColor = selected
    ? (conflict === 'hard' ? '#ef4444' : conflict === 'soft' ? '#eab308' : C.accentHov)
    : hov ? C.textSec : C.textMut;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '3px 9px',
        borderRadius: 4,
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
        fontWeight: selected ? 500 : 400,
        cursor: onClick ? 'pointer' : 'default',
        background: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
        transition: 'all 0.1s',
      }}
    >{name}</button>
  );
}

Object.assign(window, {
  C, PRIORITY_COLORS, STATUS_CFG,
  Badge, StatusBadge, PriorityDot,
  Btn, Input, Sel, Textarea,
  Hr, Field, ModuleChip,
});
