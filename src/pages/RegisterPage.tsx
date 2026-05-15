import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { C } from '../components/ui/tokens'

export function RegisterPage() {
  const { user, loading, signUp, configured } = useAuthStore()
  const navigate = useNavigate()

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate('/app', { replace: true })
  }, [user, loading, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSubmitting(true)
    const err = await signUp(email, password)
    if (err) {
      setError(err)
      setSubmitting(false)
    } else {
      setSuccess(true)
      setSubmitting(false)
    }
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

          {success ? (
            <SuccessState email={email} onGoLogin={() => navigate('/login')} />
          ) : (
            <>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  Create your account
                </h1>
                <p style={{ margin: 0, fontSize: 13, color: C.textMut }}>
                  Start managing deployment conflicts for free
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
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.textSec, letterSpacing: '0.02em' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = C.accent)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.textSec, letterSpacing: '0.02em' }}>
                    Confirm password
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      ...inputStyle,
                      borderColor: confirm && confirm !== password ? C.hard : C.border,
                    }}
                    onFocus={e => (e.target.style.borderColor = confirm !== password ? C.hard : C.accent)}
                    onBlur={e => (e.target.style.borderColor = confirm && confirm !== password ? C.hard : C.border)}
                  />
                  {confirm && confirm !== password && (
                    <span style={{ fontSize: 11, color: C.hard }}>Passwords don't match</span>
                  )}
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

                {/* Benefits */}
                <div style={{
                  padding: '10px 12px', borderRadius: 6,
                  background: `${C.accent}08`, border: `1px solid ${C.accent}20`,
                  display: 'flex', flexDirection: 'column', gap: 5,
                }}>
                  {['Free forever', 'Unlimited projects & tickets', 'Real-time conflict detection'].map(b => (
                    <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: C.textMut }}>
                      <span style={{ color: C.green, fontSize: 10 }}>✓</span>
                      {b}
                    </div>
                  ))}
                </div>

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
                  {submitting ? 'Creating account…' : 'Create Account'}
                </button>
              </form>

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: C.textMut }}>Already have an account? </span>
                <Link
                  to="/login"
                  style={{ fontSize: 12, color: C.accent, fontWeight: 600, textDecoration: 'none' }}
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SuccessState({ email, onGoLogin }: { email: string; onGoLogin: () => void }) {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: `${C.green}18`, border: `1px solid ${C.green}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>✓</div>
      <div>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Check your email</h2>
        <p style={{ margin: 0, fontSize: 13, color: C.textMut, lineHeight: 1.6 }}>
          We've sent a confirmation link to{' '}
          <strong style={{ color: C.textSec }}>{email}</strong>.
          Click the link to activate your account.
        </p>
      </div>
      <div style={{
        padding: '10px 14px', borderRadius: 7,
        background: `${C.accent}08`, border: `1px solid ${C.accent}20`,
        fontSize: 12, color: C.textMut, lineHeight: 1.55, textAlign: 'left', width: '100%',
      }}>
        If you don't see the email, check your spam folder. Confirmation links expire after 24 hours.
      </div>
      <button
        onClick={onGoLogin}
        style={{
          padding: '10px 24px', borderRadius: 7,
          background: C.accent, border: 'none', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Go to Sign In
      </button>
    </div>
  )
}
