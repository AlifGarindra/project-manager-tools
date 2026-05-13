import { useState, type CSSProperties, type ReactNode, type ChangeEvent } from 'react'
import { C } from './tokens'

const inputBase: CSSProperties = {
  background: '#0c0c0e',
  borderRadius: 5,
  padding: '5px 9px',
  fontSize: 12,
  color: C.text,
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.1s',
}

interface InputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  style?: CSSProperties
  autoFocus?: boolean
}

export function Input({ value, onChange, placeholder, type = 'text', style: extra, autoFocus }: InputProps) {
  const [foc, setFoc] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onFocus={() => setFoc(true)}
      onBlur={() => setFoc(false)}
      style={{ ...inputBase, border: `1px solid ${foc ? C.borderEl : C.border}`, ...extra }}
    />
  )
}

interface SelProps {
  value: string
  onChange: (v: string) => void
  children: ReactNode
  style?: CSSProperties
}

export function Sel({ value, onChange, children, style: extra }: SelProps) {
  return (
    <select
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      style={{ ...inputBase, border: `1px solid ${C.border}`, cursor: 'pointer', ...extra }}
    >
      {children}
    </select>
  )
}

interface TextareaProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  style?: CSSProperties
}

export function Textarea({ value, onChange, placeholder, rows = 3, style: extra }: TextareaProps) {
  const [foc, setFoc] = useState(false)
  return (
    <textarea
      value={value}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFoc(true)}
      onBlur={() => setFoc(false)}
      style={{
        ...inputBase,
        border: `1px solid ${foc ? C.borderEl : C.border}`,
        resize: 'vertical',
        lineHeight: 1.6,
        ...extra,
      }}
    />
  )
}

interface FieldProps {
  label: string
  children: ReactNode
  style?: CSSProperties
}

export function Field({ label, children, style: extra }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...extra }}>
      <label style={{
        fontSize: 10, fontWeight: 600, color: C.textMut,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function Hr({ style: extra }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: C.border, flexShrink: 0, ...extra }} />
}
