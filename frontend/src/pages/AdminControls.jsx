import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUsers } from '../api';

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
  { id: 'tags', icon: '🏷️', label: 'Tags', sub: 'Label management' },
  { id: 'emailtpl', icon: '✉️', label: 'Email Templates', sub: 'Notification messages' },
  { id: 'usermgmt', icon: '👥', label: 'User Management', sub: 'Roles & access' },
  { id: 'shortcuts', icon: '⌨️', label: 'Shortcut Keys', sub: 'Keyboard navigation' },
  { id: 'audit', icon: '📜', label: 'Audit Log', sub: 'Track changes' },
];

const DEFAULT_TAGS = [
  { id: 1, name: 'Priority', color: '#dc2626' },
  { id: 2, name: 'In Review', color: '#d97706' },
  { id: 3, name: 'Blocked', color: '#7c3aed' },
  { id: 4, name: 'Quick Win', color: '#16a34a' },
  { id: 5, name: 'Tech Debt', color: '#64748b' },
  { id: 6, name: 'Customer Request', color: '#0369a1' },
];

const DEFAULT_EMAIL_TEMPLATES = [
  { id: 'breach', name: 'Sprint Breach Alert', subject: 'Sprint Item Overdue: {{item_id}}', body: 'Hi {{name}},\n\nYour assigned item {{item_id}} "{{title}}" is overdue by {{days}} days.\n\nPlease update the status urgently.\n\nRegards,\nEMIS ProjectHub' },
  { id: 'standup', name: 'Daily Standup Reminder', subject: 'Daily Standup Reminder — {{date}}', body: 'Hi {{name}},\n\nPlease submit your daily standup for {{date}}.\n\nLogin and update: {{link}}\n\nRegards,\nEMIS ProjectHub' },
  { id: 'assign', name: 'New Assignment', subject: 'You have been assigned: {{item_id}}', body: 'Hi {{name}},\n\nYou have been assigned to {{item_id}} "{{title}}".\n\nPriority: {{priority}}\nDue: {{due_date}}\n\nRegards,\nEMIS ProjectHub' },
  { id: 'welcome', name: 'Welcome User', subject: 'Welcome to EMIS ProjectHub', body: 'Hi {{name}},\n\nWelcome to EMIS ProjectHub. Your account has been created.\n\nEmail: {{email}}\nRole: {{role}}\n\nLogin at: {{link}}\n\nRegards,\nEMIS Admin' },
];

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], action: 'Quick search' },
  { keys: ['Ctrl', '/'], action: 'Show all shortcuts' },
  { keys: ['N'], action: 'New requirement / task (context-sensitive)' },
  { keys: ['S'], action: 'Save / submit form' },
  { keys: ['Esc'], action: 'Close modal / cancel' },
  { keys: ['←', '→'], action: 'Navigate between dates (PM Activity)' },
  { keys: ['Tab'], action: 'Switch between sections' },
  { keys: ['Ctrl', 'Enter'], action: 'Submit standup / send notification' },
];

export default function AdminControls() {
  const { user } = useAuth();
  const [sub, setSub] = useState(null);
  const [av, setAv] = useState(() => user ? loadAv(user.emis_id) : null);
  const [pick, setPick] = useState(null);
  const [menuVis, setMenuVis] = useState(() => {
    try { return JSON.parse(localStorage.getItem('emisMenuVis') || '{}'); } catch { return {}; }
  });

  // Tags state
  const [tags, setTags] = useState(() => {
    try { return JSON.parse(localStorage.getItem('emisTags') || 'null') || DEFAULT_TAGS; } catch { return DEFAULT_TAGS; }
  });
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#1a56db');

  // Email templates state
  const [emailTpls, setEmailTpls] = useState(() => {
    try { return JSON.parse(localStorage.getItem('emisEmailTpls') || 'null') || DEFAULT_EMAIL_TEMPLATES; } catch { return DEFAULT_EMAIL_TEMPLATES; }
  });
  const [editingTpl, setEditingTpl] = useState(null); // { id, name, subject, body }

  // User management state
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  const toggleMenu = (id, checked) => {
    const next = { ...menuVis, [id]: checked };
    setMenuVis(next);
    localStorage.setItem('emisMenuVis', JSON.stringify(next));
  };

  const addTag = () => {
    if (!newTagName.trim()) return;
    const next = [...tags, { id: Date.now(), name: newTagName.trim(), color: newTagColor }];
    setTags(next);
    localStorage.setItem('emisTags', JSON.stringify(next));
    setNewTagName('');
  };

  const removeTag = (id) => {
    const next = tags.filter(t => t.id !== id);
    setTags(next);
    localStorage.setItem('emisTags', JSON.stringify(next));
  };

  const saveTpl = (tpl) => {
    const next = emailTpls.map(t => t.id === tpl.id ? tpl : t);
    setEmailTpls(next);
    localStorage.setItem('emisEmailTpls', JSON.stringify(next));
    setEditingTpl(null);
  };

  const loadUsersForMgmt = () => {
    if (allUsers.length > 0) return;
    setUsersLoading(true);
    getUsers().then(r => setAllUsers(r.data || [])).catch(() => {}).finally(() => setUsersLoading(false));
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

    if (sub === 'tags') return (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="card-title">🏷️ Tags</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {tags.map(t => (
              <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: `${t.color}22`, color: t.color, border: `1.5px solid ${t.color}44` }}>
                🏷️ {t.name}
                <button onClick={() => removeTag(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: t.color, padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>New tag name</label>
              <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="e.g. High Impact"
                onKeyDown={e => e.key === 'Enter' && addTag()}
                style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Color</label>
              <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)}
                style={{ width: 40, height: 36, border: '1.5px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
            </div>
            <button onClick={addTag} disabled={!newTagName.trim()}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: newTagName.trim() ? 'var(--accent)' : 'var(--surface2)', color: newTagName.trim() ? 'white' : 'var(--text3)', fontWeight: 700, fontSize: 13, cursor: newTagName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
              + Add Tag
            </button>
          </div>
        </div>
      </div>
    );

    if (sub === 'emailtpl') return (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="card-title">✉️ Email Templates</span></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {editingTpl ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Editing: {editingTpl.name}</div>
              {[
                { key: 'subject', label: 'Subject', rows: 1 },
                { key: 'body', label: 'Body', rows: 8 },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <textarea value={editingTpl[f.key]} rows={f.rows}
                    onChange={e => setEditingTpl(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'DM Mono, monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 12 }}>
                Available variables: <code style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>{'{{name}}'}</code>{' '}
                <code style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>{'{{item_id}}'}</code>{' '}
                <code style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>{'{{title}}'}</code>{' '}
                <code style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>{'{{date}}'}</code>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => saveTpl(editingTpl)} className="btn btn-accent">💾 Save Template</button>
                <button onClick={() => setEditingTpl(null)} className="btn btn-outline">Cancel</button>
              </div>
            </div>
          ) : (
            emailTpls.map(tpl => (
              <div key={tpl.id} style={{ border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>✉️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{tpl.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>
                    <strong>Subject:</strong> {tpl.subject}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.body.slice(0, 80)}…</div>
                </div>
                <button onClick={() => setEditingTpl({ ...tpl })} className="btn btn-outline btn-sm">Edit</button>
              </div>
            ))
          )}
        </div>
      </div>
    );

    if (sub === 'usermgmt') {
      if (!usersLoading && allUsers.length === 0) loadUsersForMgmt();
      const roles = [...new Set(allUsers.map(u => u.role).filter(Boolean))].sort();
      const visibleUsers = allUsers.filter(u => {
        if (userSearch && !u.name.toLowerCase().includes(userSearch.toLowerCase()) && !(u.email || '').toLowerCase().includes(userSearch.toLowerCase())) return false;
        if (userRoleFilter && u.role !== userRoleFilter) return false;
        return true;
      });
      return (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <span className="card-title">👥 User Management</span>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{allUsers.length} users</span>
          </div>
          <div style={{ padding: '14px 20px 8px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email…"
              style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none' }} />
            <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}
              style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontFamily: 'inherit', background: 'white' }}>
              <option value="">All Roles</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {usersLoading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text2)' }}>Loading users…</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Level</th>
                    <th>Team</th>
                    <th style={{ textAlign: 'center' }}>Active</th>
                    <th>Perfiq</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                            {u.name.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase()}
                          </div>
                          {u.name}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>{u.email}</td>
                      <td><span style={{ fontSize: 11, background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>{u.role || '—'}</span></td>
                      <td><span className="badge badge-gray">{u.level || '—'}</span></td>
                      <td style={{ fontSize: 12 }}>{u.team ? `Team ${u.team}` : '—'}</td>
                      <td style={{ textAlign: 'center' }}>{u.is_active ? '✅' : '❌'}</td>
                      <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: u.perfiq === 'CTO' ? '#dbeafe' : u.perfiq === 'MANAGER' ? '#d1fae5' : '#f1f5f9', color: u.perfiq === 'CTO' ? '#1d4ed8' : u.perfiq === 'MANAGER' ? '#065f46' : '#64748b' }}>{u.perfiq}</span></td>
                    </tr>
                  ))}
                  {visibleUsers.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>No users match your search</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (sub === 'shortcuts') return (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="card-title">⌨️ Shortcut Keys</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SHORTCUTS.map((sc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {sc.keys.map((k, ki) => (
                    <span key={ki}>
                      <kbd style={{ background: 'white', border: '1.5px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'DM Mono, monospace', boxShadow: '0 2px 0 var(--border)' }}>{k}</kbd>
                      {ki < sc.keys.length - 1 && <span style={{ fontSize: 11, color: 'var(--text3)', margin: '0 2px' }}>+</span>}
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{sc.action}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--accent-light)', borderRadius: 10, fontSize: 12, color: 'var(--text2)' }}>
            💡 <strong>Tip:</strong> Press <kbd style={{ background: 'white', border: '1.5px solid var(--border)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>Ctrl</kbd>+<kbd style={{ background: 'white', border: '1.5px solid var(--border)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>/</kbd> from anywhere to see this list.
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
