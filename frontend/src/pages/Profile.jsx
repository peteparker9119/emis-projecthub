import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme, ACCENTS } from '../context/ThemeContext';
import Modal from '../components/Modal';

const CARTOON_AVS = ['🐱','🦊','🐼','🦁','🐯','🐺','🐻','🐧','🦉','🐲','🦄','🤖','👽','🥷','🧙','🦸','🎭','🧛','🧜','🧝','🤠','🧑‍💻','🧑‍🎨','🦝'];
const SNAP_AVS = ['😎','🤓','😄','🥳','😏','🤩','😤','🧐'];
const INITIALS_BGS = [
  { id: 's1', bg: 'linear-gradient(135deg,#1a56db,#0d9488)', label: 'Ocean' },
  { id: 's2', bg: 'linear-gradient(135deg,#7c3aed,#ec4899)', label: 'Galaxy' },
  { id: 's3', bg: 'linear-gradient(135deg,#d97706,#dc2626)', label: 'Ember' },
  { id: 's4', bg: 'linear-gradient(135deg,#16a34a,#0d9488)', label: 'Forest' },
  { id: 's5', bg: 'linear-gradient(135deg,#1a1d2e,#374151)', label: 'Night' },
  { id: 's6', bg: 'linear-gradient(135deg,#be185d,#f43f5e)', label: 'Rose' },
];

function loadAv(emisId) {
  try { const s = JSON.parse(localStorage.getItem('emisAv') || '{}'); return s[emisId] || null; } catch { return null; }
}
function saveAv(emisId, av) {
  try {
    const s = JSON.parse(localStorage.getItem('emisAv') || '{}');
    s[emisId] = av;
    localStorage.setItem('emisAv', JSON.stringify(s));
  } catch {}
}

function AvatarDisplay({ av, initials, size = 56, fontSize = 20 }) {
  if (av?.type === 'emoji') {
    return <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * .45) }}>{av.value}</div>;
  }
  if (av?.type === 'style') {
    return <div style={{ width: size, height: size, borderRadius: '50%', background: av.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: 700, color: '#fff' }}>{initials}</div>;
  }
  return <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: 800, color: 'white' }}>{initials}</div>;
}

export default function Profile() {
  const { user } = useAuth();
  const { mode, accent, setMode, setAccent } = useTheme();
  const [av, setAv] = useState(() => user ? loadAv(user.emis_id) : null);
  const [avOpen, setAvOpen] = useState(false);
  const [pick, setPick] = useState(null);

  if (!user) return null;
  const isCTO = user.perfiq === 'CTO';

  const applyAv = () => {
    if (!pick) return;
    setAv(pick);
    saveAv(user.emis_id, pick);
    setAvOpen(false);
    setPick(null);
  };

  const resetAv = () => { setAv(null); saveAv(user.emis_id, null); setAvOpen(false); };

  const AvOpt = ({ children, selected, onClick, style = {} }) => (
    <div
      onClick={onClick}
      style={{
        width: 52, height: 52, borderRadius: '50%', border: `2.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        boxShadow: selected ? '0 0 0 3px var(--accent-light)' : 'none',
        transition: 'all .15s', ...style,
      }}
    >{children}</div>
  );

  return (
    <div className="page-content">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <div className="profile-hero">
        <div className="profile-av" onClick={() => setAvOpen(true)} title="Change avatar">
          <div style={{ width: 76, height: 76, borderRadius: '50%', border: '3px solid rgba(255,255,255,.4)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AvatarDisplay av={av} initials={user.initials} size={76} fontSize={28} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700 }}>{user.name}</div>
          <div style={{ opacity: .8, fontSize: 13, marginTop: 2 }}>{user.designation}</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {isCTO && <span style={{ background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '.5px', display: 'inline-flex', alignItems: 'center' }}>⭐ CTO</span>}
            {user.level && <span className="badge badge-blue">{user.level}</span>}
            <span className="badge badge-gray">Team {user.team}</span>
          </div>
        </div>
      </div>

      {/* ── Info grid ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">👤 Info</span></div>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            {[
              ['📧', user.email],
              ['🆔', user.emis_id],
              ['🏢', user.role],
              ['👥', `Team ${user.team}`],
              ['🔑', user.perfiq],
              ['📋', user.cohort ? `Cohort ${user.cohort}` : '—'],
            ].map(([ic, val]) => (
              <div key={ic} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 14, width: 22 }}>{ic}</span>
                <span style={{ fontSize: 12.5 }}>{val || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Profile picture card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🎨 Profile Picture</span>
            <button className="btn btn-accent btn-sm" onClick={() => setAvOpen(true)}>Change</button>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AvatarDisplay av={av} initials={user.initials} size={56} fontSize={20} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Current Avatar</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>Pick cartoon · snap face · styled initials</div>
              {av && (
                <button className="btn btn-outline btn-sm" style={{ marginTop: 8, fontSize: 11 }} onClick={resetAv}>↩ Reset to initials</button>
              )}
            </div>
          </div>

          {/* Details */}
          <div style={{ padding: '0 20px 20px' }}>
            {[
              ['Designation', user.designation],
              ['Level', user.level],
              ['Reports To', user.reports_to_name || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                <div style={{ width: 110, fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px', flexShrink: 0 }}>{k}</div>
                <div style={{ fontSize: 13 }}>{v || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Appearance ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">🎨 Appearance</span></div>
        <div className="card-body">

          {/* Mode toggle */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', marginBottom: 12 }}>Theme Mode</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { id: 'light', icon: '☀️', label: 'Light' },
                { id: 'dark',  icon: '🌙', label: 'Dark'  },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    flex: 1, padding: '14px 10px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                    border: `2px solid ${mode === m.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: mode === m.id ? 'var(--accent-light)' : 'var(--surface2)',
                    color: mode === m.id ? 'var(--accent)' : 'var(--text2)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all .2s', boxShadow: mode === m.id ? '0 0 0 3px var(--accent-light)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{m.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Accent color */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', marginBottom: 12 }}>Accent Color</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {Object.entries(ACCENTS).map(([key, a]) => (
                <button
                  key={key}
                  onClick={() => setAccent(key)}
                  title={a.label}
                  style={{
                    width: 52, height: 52, borderRadius: '50%', background: a.grad, cursor: 'pointer',
                    border: `3px solid ${accent === key ? a.accent : 'transparent'}`,
                    boxShadow: accent === key ? `0 0 0 3px ${a.accentLight}, 0 4px 14px ${a.accent}55` : '0 2px 8px rgba(0,0,0,.15)',
                    transition: 'all .2s', transform: accent === key ? 'scale(1.15)' : 'scale(1)',
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {accent === key && <span style={{ fontSize: 18, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.4))' }}>✓</span>}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text2)' }}>
              Selected: <strong style={{ color: 'var(--accent)' }}>{ACCENTS[accent]?.label}</strong>
            </div>

            {/* Preview strip */}
            <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-accent btn-sm">Primary Button</button>
              <span className="badge badge-blue">Badge</span>
              <div style={{ width: 80, height: 8, borderRadius: 4, background: 'var(--accent-light)', overflow: 'hidden' }}>
                <div style={{ width: '60%', height: '100%', background: 'var(--accent)', borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>Link text</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Avatar picker modal ────────────────────────────────────── */}
      <Modal
        open={avOpen}
        onClose={() => { setAvOpen(false); setPick(null); }}
        title="🎭 Choose Avatar"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setAvOpen(false); setPick(null); }}>Cancel</button>
            <button className="btn btn-accent" onClick={applyAv} disabled={!pick}>Apply</button>
          </>
        }
      >
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', marginBottom: 10 }}>Cartoon Characters</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CARTOON_AVS.map(em => (
              <AvOpt key={em} selected={pick?.value === em} onClick={() => setPick({ type: 'emoji', value: em })}>
                <span style={{ fontSize: 22 }}>{em}</span>
              </AvOpt>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', marginBottom: 10 }}>Snap Face</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SNAP_AVS.map(em => (
              <AvOpt key={em} selected={pick?.value === em} onClick={() => setPick({ type: 'emoji', value: em })}>
                <span style={{ fontSize: 26 }}>{em}</span>
              </AvOpt>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', marginBottom: 10 }}>Styled Initials</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {INITIALS_BGS.map(s => (
              <AvOpt key={s.id} selected={pick?.id === s.id} onClick={() => setPick({ type: 'style', id: s.id, bg: s.bg })} style={{ background: s.bg, border: `2.5px solid ${pick?.id === s.id ? 'var(--accent)' : 'transparent'}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{user.initials}</span>
              </AvOpt>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
