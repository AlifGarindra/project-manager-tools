import type { CSSProperties, ReactNode } from 'react'

type BadgeType = 'hard' | 'soft' | 'accent' | 'green' | 'default'

const VARIANTS: Record<BadgeType, { bg: string; color: string; border: string }> = {
  hard:    { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.28)' },
  soft:    { bg: 'rgba(234,179,8,0.1)',   color: '#eab308', border: 'rgba(234,179,8,0.25)' },
  accent:  { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'rgba(99,102,241,0.28)' },
  green:   { bg: 'rgba(34,197,94,0.1)',   color: '#22c55e', border: 'rgba(34,197,94,0.25)' },
  default: { bg: '#1c1c1f',               color: '#71717a', border: '#27272a' },
}

interface BadgeProps {
  children: ReactNode
  type?: BadgeType
  size?: 'xs' | 'sm'
}

export function Badge({ children, type = 'default', size = 'sm' }: BadgeProps) {
  const v = VARIANTS[type]
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    padding: size === 'xs' ? '0px 5px' : '1px 6px',
    borderRadius: 3,
    fontSize: size === 'xs' ? 9 : 10,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    background: v.bg,
    color: v.color,
    border: `1px solid ${v.border}`,
  }
  return <span style={style}>{children}</span>
}
