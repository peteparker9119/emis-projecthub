import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const MANAGER_OPTIONS = [
  {
    name: 'Manoj Kumar',
    display: 'Manoj Kumar R',
    subtitle: 'Senior Project Manager · Team 3',
    gradient: 'linear-gradient(135deg,#6d28d9,#7c3aed)',
    glow: 'rgba(124,58,237,.3)',
  },
  {
    name: 'Mohana krishnan',
    display: 'Mohana Krishnan',
    subtitle: 'Project Manager · Team 4',
    gradient: 'linear-gradient(135deg,#0f766e,#0d9488)',
    glow: 'rgba(13,148,136,.3)',
  },
  {
    name: 'Vaseekaran',
    display: 'Vaseekaran',
    subtitle: 'Architect Manager · Team 6',
    gradient: 'linear-gradient(135deg,#9d174d,#db2777)',
    glow: 'rgba(219,39,119,.3)',
  },
];

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
    label: 'Select Manager',
    hasSubOptions: true,
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
  const [loading,      setLoading]      = useState(null);
  const [error,        setError]        = useState('');
  const [expandedRole, setExpandedRole] = useState(null); // 'MANAGER' when expanded
  const now = useClock();

  const handleLogin = async (role, name) => {
    const key = name ? `${role}:${name}` : role;
    setLoading(key);
    setError('');
    try {
      await loginAs(role, name);
    } catch {
      setError('Login failed. Please ensure the backend is running.');
      setLoading(null);
    }
  };

  const handleCardClick = (r) => {
    if (loading) return;
    if (r.hasSubOptions) {
      setExpandedRole(prev => prev === r.role ? null : r.role);
    } else {
      handleLogin(r.role, r.name);
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
            const key       = r.role;
            const isLoading = loading === key;
            const isDimmed  = !!loading && !isLoading;
            const isExpanded = expandedRole === r.role;

            return (
              <div key={key} style={{ position: 'relative' }}>
                <button
                  onClick={() => handleCardClick(r)}
                  disabled={!!loading}
                  className={`login-role-card${isLoading ? ' loading' : ''}${isExpanded ? ' expanded' : ''}`}
                  style={{
                    opacity: isDimmed ? .55 : 1,
                    transform: isDimmed ? 'scale(.97)' : undefined,
                    cursor: loading ? (isLoading ? 'wait' : 'not-allowed') : 'pointer',
                    outline: 'none',
                    width: '100%',
                    border: isExpanded ? '2px solid rgba(13,148,136,.6)' : undefined,
                    boxShadow: isExpanded ? '0 0 0 3px rgba(13,148,136,.2)' : undefined,
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
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    marginTop: 14, padding: '6px 18px', borderRadius: 20,
                    background: r.gradient, color: 'white', fontSize: 12, fontWeight: 700,
                    boxShadow: `0 3px 12px ${r.glow}`, position: 'relative', zIndex: 1,
                    transition: 'box-shadow .2s',
                  }}>
                    {isLoading ? '⏳ Signing in…' : r.label}
                    {r.hasSubOptions && !isLoading && (
                      <span style={{ fontSize: 10, opacity: .8, transition: 'transform .2s', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</span>
                    )}
                  </div>
                </button>

                {/* ── Manager sub-options panel ─────────────────────────── */}
                {r.hasSubOptions && isExpanded && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 50,
                    background: 'white', borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,.22)',
                    border: '1.5px solid rgba(13,148,136,.25)', overflow: 'hidden',
                    animation: 'fadeIn .15s ease',
                  }}>
                    <div style={{ padding: '10px 14px 6px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.6px', borderBottom: '1px solid #f1f5f9' }}>
                      Choose a manager
                    </div>
                    {MANAGER_OPTIONS.map(opt => {
                      const optKey = `MANAGER:${opt.name}`;
                      const optLoading = loading === optKey;
                      return (
                        <button
                          key={opt.name}
                          onClick={e => { e.stopPropagation(); handleLogin('MANAGER', opt.name); }}
                          disabled={!!loading}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            width: '100%', padding: '12px 14px', border: 'none',
                            background: optLoading ? '#f0fdf4' : 'white', cursor: 'pointer',
                            borderBottom: '1px solid #f8fafc', transition: 'background .15s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => { if (!optLoading) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={e => { if (!optLoading) e.currentTarget.style.background = 'white'; }}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            background: opt.gradient, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 800,
                            boxShadow: `0 3px 10px ${opt.glow}`,
                          }}>
                            {opt.display.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{opt.display}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{opt.subtitle}</div>
                          </div>
                          {optLoading
                            ? <div className="login-role-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                            : <span style={{ fontSize: 12, color: '#94a3b8' }}>→</span>
                          }
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
