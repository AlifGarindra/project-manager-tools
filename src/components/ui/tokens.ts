export const C = {
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
} as const

export const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#52525b',
}

export const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  'planned':     { label: 'Planned',     color: '#71717a', bg: '#1a1a1d' },
  'in-progress': { label: 'In Progress', color: '#60a5fa', bg: '#1a2236' },
  'blocked':     { label: 'Blocked',     color: '#ef4444', bg: '#2a1414' },
  'done':        { label: 'Done',        color: '#22c55e', bg: '#14231a' },
  'cancelled':   { label: 'Cancelled',   color: '#3f3f46', bg: '#111113' },
}
