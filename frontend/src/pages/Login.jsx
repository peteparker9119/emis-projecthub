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
    badge: 'badge-purple',
  },
  {
    role: 'MANAGER',
    icon: '🗂',
    title: 'Manager',
    subtitle: 'Project / Team Manager',
    desc: 'Create sprints, manage tasks, view reports and team members.',
    gradient: 'linear-gradient(135deg,#0d9488,#0891b2)',
    badge: 'badge-teal',
  },
  {
    role: 'EMPLOYEE',
    icon: '👤',
    title: 'Employee',
    subtitle: 'Team Member / Developer',
    desc: 'Work on tasks, log bugs, submit ideas, track your own sprint items.',
    gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    badge: 'badge-blue',
  },
  {
    role: 'TL',
    icon: '👔',
    title: 'Team Lead',
    subtitle: 'PM Team Lead — Jones / Yasar',
    desc: 'Review grooming checklists, sign off on requirements before sprint.',
    gradient: 'linear-gradient(135deg,#b45309,#d97706)',
    badge: 'badge-amber',
  },
  {
    role: 'SM',
    icon: '🏆',
    title: 'Scrum Master',
    subtitle: 'Gunaseelan Peter S',
    desc: 'Monitor daily standups, pull backlog into sprints, oversee grooming pipeline.',
    gradient: 'linear-gradient(135deg,#065f46,#059669)',
    badge: 'badge-green',
  },
  {
    role: 'PM',
    icon: '📋',
    title: 'Product Manager',
    subtitle: 'Abishek J & Team',
    desc: 'Log daily work — docs, learnings, discussions, grooming & PMU sessions.',
    gradient: 'linear-gradient(135deg,#6d28d9,#7c3aed)',
    badge: 'badge-purple',
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
      background: 'linear-gradient(135deg,#0e3a9c 0%,#1a56db 45%,#0d9488 100%)',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />

      <div style={{ width: '100%', maxWidth: 900, position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40, color: 'white' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,.15)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, border: '1px solid rgba(255,255,255,.2)' }}>EP</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>EMIS ProjectHub</div>
              <div style={{ fontSize: 12, opacity: .7, letterSpacing: '.5px', textTransform: 'uppercase' }}>TN Education Management</div>
            </div>
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Welcome back</div>
          <div style={{ fontSize: 14, opacity: .75, marginBottom: 16 }}>Select your role to continue</div>
          {/* Live date + time */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 40, padding: '8px 24px', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, opacity: .9 }}>
              📅 {now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,.3)' }} />
            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>
              🕐 {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Role cards — 2 rows × 3 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          {ROLES.map(r => (
            <button
              key={r.role}
              onClick={() => handleLogin(r.role)}
              disabled={!!loading}
              style={{
                background: 'white', border: '2px solid transparent', borderRadius: 16,
                padding: '24px 18px', textAlign: 'center', cursor: loading ? 'wait' : 'pointer',
                transition: 'all .2s', boxShadow: '0 8px 32px rgba(0,0,0,.15)',
                opacity: loading && loading !== r.role ? .6 : 1,
                outline: 'none', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,.2)'; e.currentTarget.style.borderColor = 'var(--accent)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.15)'; e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <div style={{ width: 58, height: 58, borderRadius: '50%', background: r.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 12px', boxShadow: '0 4px 16px rgba(0,0,0,.15)' }}>
                {loading === r.role ? <div style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : r.icon}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{r.title}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text2)', marginBottom: 8 }}>{r.subtitle}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 12 }}>{r.desc}</div>
              <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 20, background: r.gradient, color: 'white', fontSize: 11.5, fontWeight: 700 }}>
                {loading === r.role ? 'Signing in…' : `Login as ${r.title}`}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,.15)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Footer hint */}
        <div style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, padding: '14px 20px', color: 'rgba(255,255,255,.8)', fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, opacity: .9 }}>🔐 Role Access</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span>⭐ CTO — Full system access</span>
            <span>🗂 Manager — Sprints, reports, team</span>
            <span>👤 Employee — Tasks, bugs, ideas</span>
            <span>👔 Team Lead — Grooming checklist review</span>
            <span>🏆 Scrum Master — Standups &amp; sprint pull-in</span>
            <span>📋 Product Manager — Daily work log</span>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
