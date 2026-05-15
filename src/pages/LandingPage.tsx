import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C } from '../components/ui/tokens'

const FEATURES = [
  {
    icon: '⚡',
    title: 'Smart Conflict Detection',
    desc: 'Automatically detects hard and soft conflicts based on deployment ranges, shared modules, and environment overlap — before they hit production.',
    color: C.hard,
  },
  {
    icon: '📅',
    title: 'Deployment Timeline',
    desc: 'Visualize every deployment across all environments on one timeline. Drag markers to reschedule, see bezier flows between env promotions.',
    color: C.accent,
  },
  {
    icon: '📋',
    title: 'Kanban Board',
    desc: 'Track ticket status from Planned to Done. Drag cards between columns, see conflict badges inline so nothing slips through.',
    color: C.green,
  },
]

const STATS = [
  { value: '< 1ms', label: 'Conflict compute time' },
  { value: '∞', label: 'Projects supported' },
  { value: '2', label: 'Conflict types (Hard / Soft)' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [hoverPrimary, setHoverPrimary] = useState(false)
  const [hoverSecondary, setHoverSecondary] = useState(false)

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: 'Inter, sans-serif', color: C.text,
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Nav */}
      <nav style={{
        height: 56, flexShrink: 0, borderBottom: `1px solid ${C.border}`,
        background: `${C.surface}ee`, backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: 12,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: `${C.accent}20`, border: `1px solid ${C.accent}45`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: C.accent,
          }}>D</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em' }}>DCM</span>
        </div>

        <NavLink onClick={() => navigate('/login')}>Sign In</NavLink>
        <PillBtn onClick={() => navigate('/register')} primary>
          Get Started →
        </PillBtn>
      </nav>

      {/* Hero */}
      <section style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '100px 24px 80px', textAlign: 'center',
        background: `radial-gradient(ellipse 70% 40% at 50% 0%, ${C.accent}12 0%, transparent 70%)`,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 99,
          background: `${C.accent}15`, border: `1px solid ${C.accent}30`,
          fontSize: 11, fontWeight: 600, color: C.accent,
          marginBottom: 28, letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          ⚡ Deployment Conflict Manager
        </div>

        <h1 style={{
          margin: '0 0 20px', fontSize: 'clamp(32px, 5vw, 58px)',
          fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em',
          maxWidth: 700,
        }}>
          Stop deployment conflicts{' '}
          <span style={{
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentHov})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            before they happen
          </span>
        </h1>

        <p style={{
          margin: '0 0 40px', fontSize: 16, color: C.textMut,
          maxWidth: 520, lineHeight: 1.7,
        }}>
          Track deployment tickets across every environment. Detect hard and soft
          conflicts automatically. Ship with confidence.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/register')}
            onMouseEnter={() => setHoverPrimary(true)}
            onMouseLeave={() => setHoverPrimary(false)}
            style={{
              padding: '12px 28px', borderRadius: 8,
              background: hoverPrimary ? C.accentHov : C.accent,
              border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
              boxShadow: `0 0 24px ${C.accent}40`,
            }}
          >
            Create free account
          </button>
          <button
            onClick={() => navigate('/login')}
            onMouseEnter={() => setHoverSecondary(true)}
            onMouseLeave={() => setHoverSecondary(false)}
            style={{
              padding: '12px 28px', borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${hoverSecondary ? C.borderEl : C.border}`,
              color: hoverSecondary ? C.textSec : C.textMut,
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
            }}
          >
            Sign in
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: 48, marginTop: 72,
          borderTop: `1px solid ${C.border}`, paddingTop: 40,
        }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.textMut, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Everything a PM needs
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: C.textMut }}>
            Built for teams shipping to multiple environments simultaneously.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {FEATURES.map(f => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{
        padding: '80px 24px',
        background: `${C.surface}88`,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
            How conflict detection works
          </h2>
          <p style={{ margin: '0 0 40px', fontSize: 14, color: C.textMut, lineHeight: 1.7 }}>
            Two tickets conflict when they share a module AND their deployment windows overlap.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            {[
              { badge: '⚡ Hard', color: C.hard, desc: 'Same environment + same module + date overlap. Direct conflict — one deployment can break the other.' },
              { badge: '◎ Soft', color: C.soft, desc: 'Different environments + same module. Schema or API contract mismatch risk as code promotes between envs.' },
              { badge: '✓ Safe', color: C.green, desc: 'No shared modules, or no date overlap. Clean to ship.' },
            ].map(r => (
              <div key={r.badge} style={{
                padding: '14px 16px', borderRadius: 8,
                background: C.bg, border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: r.color,
                  background: `${r.color}18`, border: `1px solid ${r.color}35`,
                  padding: '3px 8px', borderRadius: 4, flexShrink: 0, marginTop: 1,
                }}>{r.badge}</span>
                <span style={{ fontSize: 13, color: C.textMut, lineHeight: 1.6 }}>{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 24px', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Ready to deploy without fear?
        </h2>
        <p style={{ margin: '0 0 36px', fontSize: 14, color: C.textMut }}>
          Free to use. No credit card required.
        </p>
        <button
          onClick={() => navigate('/register')}
          style={{
            padding: '13px 36px', borderRadius: 8,
            background: C.accent, border: 'none',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            boxShadow: `0 0 32px ${C.accent}40`,
          }}
        >
          Get started free
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${C.border}`,
        padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: `${C.accent}20`, border: `1px solid ${C.accent}45`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, color: C.accent,
          }}>D</div>
          <span style={{ fontSize: 12, color: C.textMut }}>Deployment Conflict Manager</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: C.textMut }}>Built for PMs who ship fast</span>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: string }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '24px', borderRadius: 10,
        background: hov ? C.surfaceEl : C.surface,
        border: `1px solid ${hov ? C.borderEl : C.border}`,
        transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: C.text }}>{title}</div>
        <div style={{ fontSize: 13, color: C.textMut, lineHeight: 1.65 }}>{desc}</div>
      </div>
    </div>
  )
}

function NavLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif',
        color: hov ? C.textSec : C.textMut, transition: 'color 0.1s',
        padding: '4px 8px',
      }}
    >{children}</button>
  )
}

function PillBtn({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '6px 16px', borderRadius: 99,
        background: primary
          ? hov ? C.accentHov : C.accent
          : hov ? C.surfaceEl : 'transparent',
        border: primary ? 'none' : `1px solid ${hov ? C.borderEl : C.border}`,
        color: primary ? '#fff' : hov ? C.textSec : C.textMut,
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
      }}
    >{children}</button>
  )
}
