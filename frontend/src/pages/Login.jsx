import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  {
    role: 'CTO',
    icon: '⭐',
    title: 'CTO',
    subtitle: 'Chief Technology Officer',
    desc: 'Full access — track team, manage sprints, letters, admin controls and all reports.',
    gradient: 'linear-gradient(135deg,#0e3a9c,#1a56db)',
    glow: 'rgba(26,86,219,.35)',
    label: 'Login as CTO',
  },
  {
    role: 'MANAGER',
    icon: '🗂️',
    title: 'Manager',
    subtitle: 'Project / Team Manager',
    desc: 'Create sprints, manage tasks, view reports and team members.',
    gradient: 'linear-gradient(135deg,#0d9488,#0891b2)',
    glow: 'rgba(13,148,136,.35)',
    label: 'Login as Manager',
  },
  {
    role: 'EMPLOYEE',
    icon: '👤',
    title: 'Employee',
    subtitle: 'Team Member / Developer',
    desc: 'Work on tasks, log bugs, submit ideas, track your own sprint items.',
    gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    glow: 'rgba(124,58,237,.35)',
    label: 'Login as Employee',
  },
  {
    role: 'TL',
    icon: '👔',
    title: 'Team Lead',
    subtitle: 'PM Team Lead — Jones / Yasar',
    desc: 'Review grooming checklists, sign off on requirements before sprint.',
    gradient: 'linear-gradient(135deg,#b45309,#d97706)',
    glow: 'rgba(217,119,6,.35)',
    label: 'Login as TL',
  },
  {
    role: 'SM',
    icon: '🏆',
    title: 'Scrum Master',
    subtitle: 'Gunaseelan Peter S',
    desc: 'Monitor daily standups, pull backlog into sprints, oversee grooming pipeline.',
    gradient: 'linear-gradient(135deg,#065f46,#059669)',
    glow: 'rgba(5,150,105,.35)',
    label: 'Login as SM',
  },
  {
    role: 'PM',
    icon: '📋',
    title: 'Product Manager',
    subtitle: 'Abishek J & Team',
    desc: 'Log daily work — docs, learnings, discussions, grooming & PMU sessions.',
    gradient: 'linear-gradient(135deg,#6d28d9,#7c3aed)',
    glow: 'rgba(124,58,237,.3)',
    label: 'Login as PM',
  },
];

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function Login() {
  const { loginAs } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');
  const now = useClock();

  const handleLogin = async (role) => {
    setLoading(role);
    setError('');
    try {
      await loginAs(role);
    } catch {
      setError('Login failed. Please ensure the backend is running.');
      setLoading(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(145deg,#060d24 0%,#0e3a9c 40%,#0d4f46 100%)',
      padding: '24px 20px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background blobs */}
      <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,86,219,.18) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,.15) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', top: '40%', left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,.1) 0%, transparent 70%)' }} />

      <div style={{ width: '100%', maxWidth: 940, position: 'relative', zIndex: 1 }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 40, color: 'white' }}>

          {/* Brand */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, fontWeight: 800, fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)',
              backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,.3)',
              color: 'white', letterSpacing: '-.5px',
            }}>EP</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.3px' }}>EMIS ProjectHub</div>
              <div style={{ fontSize: 11, opacity: .6, letterSpacing: '1px', textTransform: 'uppercase', marginTop: 1 }}>TN Education Management</div>
            </div>
          </div>

          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, marginBottom: 8, lineHeight: 1.15 }}>
            Welcome back
          </div>
          <div style={{ fontSize: 14, opacity: .65, marginBottom: 22 }}>
            Select your role to continue to ProjectHub
          </div>

          {/* Live clock pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 16,
            background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)',
            borderRadius: 40, padding: '9px 24px', backdropFilter: 'blur(12px)',
          }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, opacity: .85 }}>
              📅 {now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,.25)', flexShrink: 0 }} />
            <span style={{ fontSize: 14.5, fontWeight: 800, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>
              🕐 {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>
        </div>

        {/* ── Role Cards ───────────────────────────────────────────────────── */}
        <div className="login-role-grid" style={{ marginBottom: 24 }}>
          {ROLES.map(r => {
            const isLoading = loading === r.role;
            const isDimmed  = !!loading && !isLoading;
            return (
              <button
                key={r.role}
                onClick={() => handleLogin(r.role)}
                disabled={!!loading}
                className={`login-role-card${isLoading ? ' loading' : ''}`}
                style={{
                  opacity: isDimmed ? .55 : 1,
                  transform: isDimmed ? 'scale(.97)' : undefined,
                  cursor: loading ? (isLoading ? 'wait' : 'not-allowed') : 'pointer',
                  outline: 'none',
                }}
              >
                {/* Icon */}
                <div className="login-role-icon" style={{ background: r.gradient, boxShadow: `0 6px 20px ${r.glow}` }}>
                  {isLoading
                    ? <div className="login-role-spinner" />
                    : <span style={{ fontSize: 26 }}>{r.icon}</span>
                  }
                </div>

                {/* Text */}
                <div className="login-role-name">{r.title}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text3)', marginBottom: 8, fontWeight: 500, position: 'relative', zIndex: 1 }}>{r.subtitle}</div>
                <div className="login-role-desc">{r.desc}</div>

                {/* CTA pill */}
                <div style={{
                  display: 'inline-block', marginTop: 14, padding: '6px 18px', borderRadius: 20,
                  background: r.gradient, color: 'white', fontSize: 12, fontWeight: 700,
                  boxShadow: `0 3px 12px ${r.glow}`, position: 'relative', zIndex: 1,
                  transition: 'box-shadow .2s',
                }}>
                  {isLoading ? '⏳ Signing in…' : r.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background: 'rgba(220,38,38,.18)', border: '1.5px solid rgba(220,38,38,.35)',
            borderRadius: 12, padding: '13px 18px', textAlign: 'center',
            color: '#fca5a5', fontSize: 13, marginBottom: 16, fontWeight: 600,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Footer hint ───────────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 14, padding: '14px 22px', backdropFilter: 'blur(8px)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.8px' }}>
            🔐 Role Access Summary
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {ROLES.map(r => (
              <span key={r.role} style={{ fontSize: 11.5, color: 'rgba(255,255,255,.65)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>{r.icon}</span>
                <strong style={{ color: 'rgba(255,255,255,.85)' }}>{r.title}</strong>
                <span style={{ opacity: .6 }}>—</span>
                <span style={{ opacity: .75 }}>{r.desc.split(' ').slice(0,5).join(' ')}…</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
