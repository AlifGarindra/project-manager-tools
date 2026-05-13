import { useState } from 'react'
import { C } from './tokens'

interface ModuleChipProps {
  name: string
  selected?: boolean
  onClick?: () => void
  conflict?: 'hard' | 'soft'
}

export function ModuleChip({ name, selected, onClick, conflict }: ModuleChipProps) {
  const [hov, setHov] = useState(false)

  const borderColor = selected
    ? (conflict === 'hard' ? '#ef444460' : conflict === 'soft' ? '#eab30860' : `${C.accent}60`)
    : C.border

  const bgColor = selected
    ? (conflict === 'hard' ? 'rgba(239,68,68,0.12)' : conflict === 'soft' ? 'rgba(234,179,8,0.1)' : `${C.accent}18`)
    : hov ? C.surfaceEl : 'transparent'

  const textColor = selected
    ? (conflict === 'hard' ? '#ef4444' : conflict === 'soft' ? '#eab308' : C.accentHov)
    : hov ? C.textSec : C.textMut

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '3px 9px', borderRadius: 4,
        fontSize: 11, fontWeight: selected ? 500 : 400,
        cursor: onClick ? 'pointer' : 'default',
        background: bgColor, color: textColor,
        border: `1px solid ${borderColor}`,
        transition: 'all 0.1s',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {name}
    </button>
  )
}
