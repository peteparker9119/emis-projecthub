import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
  try { const s = JSON.parse(localStorage.getItem('emisAv') || '{}'); s[emisId] = av; localStorage.setItem('emisAv', JSON.stringify(s)); } catch {}
}

function AvatarDisplay({ av, initials, size = 56, fontSize = 20 }) {
  if (av?.type === 'emoji') return <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * .45), flexShrink: 0 }}>{av.value}</div>;
  if (av?.type === 'style') return <div style={{ width: size, height: size, borderRadius: '50%', background: av.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>;
  return <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: 800, color: 'white', flexShrink: 0 }}>{initials}</div>;
}

const SIDEBAR_MENUS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', roles: ['CTO', 'MANAGER', 'EMPLOYEE'] },
  { id: 'sprints', label: 'Sprints', icon: '🏃', roles: ['CTO', 'MANAGER', 'EMPLOYEE'] },
  { id: 'reports', label: 'Reports', icon: '📊', roles: ['CTO', 'MANAGER'] },
  { id: 'members', label: 'Team Members', icon: '👥', roles: ['CTO', 'MANAGER'] },
  { id: 'track', label: 'Track Employees', icon: '🎯', roles: ['CTO'] },
  { id: 'mytasks', label: 'My Tasks', icon: '📌', roles: ['CTO'] },
  { id: 'sprintactivity', label: 'Sprint Activity', icon: '⚡', roles: ['CTO'] },
  { id: 'letters', label: 'Letter Management', icon: '✉️', roles: ['CTO'] },
  { id: 'admin', label: 'Admin Controls', icon: '🛡️', roles: ['CTO'] },
];

const PERMISSIONS = [
  ['Create Sprint', '✅', '✅', '❌'],
  ['Manage Members', '✅', '✅', '❌'],
  ['Reports', '✅', '✅', '❌'],
  ['Letters', '✅', '❌', '❌'],
  ['Admin', '✅', '❌', '❌'],
  ['Track Team', '✅', '❌', '❌'],
  ['Create Tasks', '✅', '✅', '✅'],
  ['Ideas', '✅', '✅', '✅'],
];

const THEMES = [
  { name: 'Ocean Blue', accent: '#1a56db', teal: '#0d9488' },
  { name: 'Forest', accent: '#16a34a', teal: '#0891b2' },
  { name: 'Royal', accent: '#7c3aed', teal: '#0d9488' },
  { name: 'Ember', accent: '#dc2626', teal: '#d97706' },
];

const TILES = [
  { id: 'profile', icon: '🎨', label: 'Profile Customization', sub: 'Avatar & photo' },
  { id: 'menus', icon: '🗂️', label: 'Menu Management', sub: 'Configure nav' },
  { id: 'perms', icon: '🛡️', label: 'Permissions', sub: 'Access control' },
  { id: 'theme', icon: '🖌️', label: 'Theme Settings', sub: 'Colors' },
  { id: 'audit', icon: '📜', label: 'Audit Log', sub: 'Track changes' },
];

export default function AdminControls() {
  const { user } = useAuth();
  const [sub, setSub] = useState(null);
  const [av, setAv] = useState(() => user ? loadAv(user.emis_id) : null);
  const [pick, setPick] = useState(null);
  const [menuVis, setMenuVis] = useState(() => {
    try { return JSON.parse(localStorage.getItem('emisMenuVis') || '{}'); } catch { return {}; }
  });

  const toggleMenu = (id, checked) => {
    const next = { ...menuVis, [id]: checked };
    setMenuVis(next);
    localStorage.setItem('emisMenuVis', JSON.stringify(next));
  };

  const applyTheme = (accent, teal) => {
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--teal', teal);
  };

  const applyAv = () => {
    if (!pick) return;
    setAv(pick);
    saveAv(user.emis_id, pick);
    setPick(null);
  };

  const resetAv = () => { setAv(null); saveAv(user.emis_id, null); };

  const AvOpt = ({ children, selected, onClick, style: s = {} }) => (
    <div onClick={onClick} style={{ width: 52, height: 52, borderRadius: '50%', border: `2.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: selected ? '0 0 0 3px var(--accent-light)' : 'none', transition: 'all .15s', ...s }}>{children}</div>
  );

  const renderSub = () => {
    if (!sub) return null;

    if (sub === 'profile') return (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <span className="card-title">🎨 Profile Customization</span>
        </div>
        <div className="card-body">
          {/* Current avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: 16, background: 'var(--accent-light)', borderRadius: 12 }}>
            <AvatarDisplay av={av} initials={user?.initials} size={64} fontSize={24} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{user?.designation}</div>
              {av && <button className="btn btn-outline btn-sm" style={{ marginTop: 8, fontSize: 11 }} onClick={resetAv}>↩ Reset to initials</button>}
            </div>
          </div>

          {/* Cartoon */}
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

          {/* Snap face */}
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

          {/* Styled initials */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', marginBottom: 10 }}>Styled Initials</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {INITIALS_BGS.map(s => (
                <AvOpt key={s.id} selected={pick?.id === s.id} onClick={() => setPick({ type: 'style', id: s.id, bg: s.bg })} style={{ background: s.bg, border: `2.5px solid ${pick?.id === s.id ? 'var(--accent)' : 'transparent'}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{user?.initials}</span>
                </AvOpt>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-accent" onClick={applyAv} disabled={!pick}>🎭 Apply Avatar</button>
            <button className="btn btn-outline" onClick={() => setPick(null)} disabled={!pick}>Cancel</button>
          </div>
        </div>
      </div>
    );

    if (sub === 'menus') return (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="card-title">🗂️ Menu Management</span></div>
        <div className="card-body">
          {SIDEBAR_MENUS.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{m.roles.join(', ')}</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={menuVis[m.id] !== false} onChange={e => toggleMenu(m.id, e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      </div>
    );

    if (sub === 'perms') return (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="card-title">🛡️ Permissions Matrix</span></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th style={{ textAlign: 'center' }}>CTO</th>
                <th style={{ textAlign: 'center' }}>Manager</th>
                <th style={{ textAlign: 'center' }}>Employee</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(([feat, ...vals]) => (
                <tr key={feat}>
                  <td style={{ fontWeight: 600 }}>{feat}</td>
                  {vals.map((v, i) => <td key={i} style={{ textAlign: 'center', fontSize: 16 }}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );

    if (sub === 'theme') return (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="card-title">🖌️ Theme Settings</span></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {THEMES.map(t => (
              <div key={t.name} onClick={() => applyTheme(t.accent, t.teal)}
                style={{ border: '2px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center', cursor: 'pointer', transition: 'all .2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = t.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: t.accent }} />
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: t.teal }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    if (sub === 'audit') return (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="card-title">📜 Audit Log</span></div>
        <div className="card-body">
          <div className="empty">
            <div className="empty-icon">📜</div>
            <div className="empty-text">Audit log coming soon</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>Will show all system actions with timestamps</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-content">
      <div className="admin-tiles">
        {TILES.map(t => (
          <div
            key={t.id}
            className="admin-tile"
            onClick={() => setSub(sub === t.id ? null : t.id)}
            style={sub === t.id ? { borderColor: 'var(--accent)', background: 'var(--accent-light)', transform: 'translateY(-2px)' } : {}}
          >
            <div style={{ fontSize: 30 }}>{t.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</div>
            <div style={{ fontSize: 12, color: sub === t.id ? 'var(--accent)' : 'var(--text2)' }}>{t.sub}</div>
          </div>
        ))}
      </div>
      {renderSub()}
    </div>
  );
}
