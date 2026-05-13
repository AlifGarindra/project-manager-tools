import { useState, type CSSProperties, type ReactNode } from 'react'
import { C } from './tokens'

type BtnVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'active'
type BtnSize = 'xs' | 'sm' | 'md'

const VARIANTS = {
  default: (hov: boolean) => ({ bg: hov ? '#27272a' : 'transparent', color: hov ? C.textSec : C.textMut, border: `1px solid ${hov ? C.borderEl : C.border}` }),
  primary: (hov: boolean) => ({ bg: hov ? C.accentHov : C.accent,    color: '#fff',                       border: 'none' }),
  ghost:   (hov: boolean) => ({ bg: hov ? '#1c1c1f' : 'transparent', color: hov ? C.text : C.textSec,     border: 'none' }),
  danger:  (_: boolean)   => ({ bg: '#2a0909',                         color: '#fca5a5',                    border: '1px solid #7f1d1d' }),
  active:  (_: boolean)   => ({ bg: C.accentDim,                       color: C.accentHov,                  border: `1px solid ${C.accent}44` }),
}

interface BtnProps {
  children: ReactNode
  variant?: BtnVariant
  size?: BtnSize
  onClick?: () => void
  disabled?: boolean
  style?: CSSProperties
}

export function Btn({ children, variant = 'default', size = 'sm', onClick, disabled, style: extra }: BtnProps) {
  const [hov, setHov] = useState(false)
  const v = VARIANTS[variant](hov)

  const padding = size === 'xs' ? '2px 7px' : size === 'sm' ? '4px 10px' : '7px 14px'
  const fontSize = size === 'xs' ? 10 : size === 'sm' ? 12 : 13

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding, fontSize, fontWeight: 500,
        fontFamily: 'Inter, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        borderRadius: 5,
        transition: 'background 0.1s, border-color 0.1s, color 0.1s',
        background: v.bg, color: v.color, border: v.border,
        ...extra,
      }}
    >
      {children}
    </button>
  )
}
