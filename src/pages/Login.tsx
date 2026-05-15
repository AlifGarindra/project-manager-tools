import { useState, FormEvent } from 'react'
import { useAuthStore } from '../stores/authStore'
import { C } from '../components/ui/tokens'

type Mode = 'signin' | 'signup'

export function Login() {
  const { signIn, signUp } = useAuthStore()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    if (mode === 'signin') {
      const err = await signIn(email, password)
      if (err) setError(err)
    } else {
      const err = await signUp(email, password)
      if (err) {
        setError(err)
      } else {
        setInfo('Account created — check your email to confirm, then sign in.')
        setMode('signin')
      }
    }

    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: C.surfaceEl, border: `1px solid ${C.border}`,
    borderRadius: 6, color: C.text, fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        width: 360, background: C.surface,
        border: `1px solid ${C.border}`, borderRadius: 10,
        padding: '32px 28px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: `${C.accent}20`, border: `1px solid ${C.accent}45`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: C.accent,
          }}>D</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em' }}>
            Deployment Conflict Manager
          </span>
        </div>

        {/* Mode tabs */}
        <div style={{
          display: 'flex', gap: 2,
          background: '#0c0c0e', borderRadius: 6, padding: 3,
          border: `1px solid ${C.border}`, marginBottom: 22,
        }}>
          {(['signin', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setInfo(null) }}
              style={{
                flex: 1, padding: '5px 0',
                background: mode === m ? C.surfaceEl : 'transparent',
                border: mode === m ? `1px solid ${C.border}` : '1px solid transparent',
                borderRadius: 4, color: mode === m ? C.text : C.textMut,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.1s',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: C.textSec }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              autoComplete="email"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: C.textSec }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div style={{
              padding: '8px 12px', borderRadius: 6,
              background: `${C.hard}15`, border: `1px solid ${C.hard}35`,
              color: C.hard, fontSize: 12,
            }}>
              {error}
            </div>
          )}

          {info && (
            <div style={{
              padding: '8px 12px', borderRadius: 6,
              background: `${C.green}15`, border: `1px solid ${C.green}35`,
              color: C.green, fontSize: 12,
            }}>
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, padding: '9px 0',
              background: loading ? `${C.accent}60` : C.accent,
              border: 'none', borderRadius: 6,
              color: '#fff', fontSize: 13, fontWeight: 600,
              fontFamily: 'Inter, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.1s',
            }}
          >
            {loading ? '…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
