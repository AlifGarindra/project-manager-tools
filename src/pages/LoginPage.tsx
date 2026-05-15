import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { C } from '../components/ui/tokens'

export function LoginPage() {
  const { user, loading, signIn, configured } = useAuthStore()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate('/app', { replace: true })
  }, [user, loading, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const err = await signIn(email, password)
    if (err) {
      setError(err)
      setSubmitting(false)
    }
    // on success: useEffect above will redirect
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: C.surfaceEl, border: `1px solid ${C.border}`,
    borderRadius: 7, color: C.text, fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: 'Inter, sans-serif', color: C.text,
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Top bar */}
      <div style={{
        height: 52, borderBottom: `1px solid ${C.border}`, background: C.surface,
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 8,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: `${C.accent}20`, border: `1px solid ${C.accent}45`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: C.accent,
          }}>D</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em' }}>DCM</span>
        </a>
      </div>

      {/* Config warning banner */}
      {!configured && (
        <div style={{
          padding: '10px 24px', background: '#1a1200',
          borderBottom: `1px solid ${C.soft}35`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 13 }}>⚠️</span>
          <span style={{ fontSize: 12, color: C.soft }}>
            Supabase belum dikonfigurasi. Buat file{' '}
            <code style={{ background: '#ffffff10', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>
              .env.local
            </code>
            {' '}dengan <code style={{ background: '#ffffff10', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>VITE_SUPABASE_URL</code>
            {' '}dan <code style={{ background: '#ffffff10', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>VITE_SUPABASE_ANON_KEY</code>.
          </span>
        </div>
      )}

      {/* Card */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 16px',
      }}>
        <div style={{
          width: '100%', maxWidth: 380,
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '32px 28px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Welcome back
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: C.textMut }}>
              Sign in to your DCM account
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textSec, letterSpacing: '0.02em' }}>
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = C.accent)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textSec, letterSpacing: '0.02em' }}>
                  Password
                </label>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = C.accent)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
            </div>

            {error && (
              <div style={{
                padding: '9px 12px', borderRadius: 6,
                background: `${C.hard}12`, border: `1px solid ${C.hard}30`,
                color: C.hard, fontSize: 12, lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 4, padding: '11px 0',
                background: submitting ? `${C.accent}55` : C.accent,
                border: 'none', borderRadius: 7, color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
                boxShadow: submitting ? 'none' : `0 0 16px ${C.accent}30`,
              }}
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: C.textMut }}>No account yet? </span>
            <Link
              to="/register"
              style={{ fontSize: 12, color: C.accent, fontWeight: 600, textDecoration: 'none' }}
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
