import { useState, useEffect } from 'react';

const MB_ICONS = [
  { em: '📁', name: 'Folder' },   { em: '📊', name: 'Charts' },   { em: '🎯', name: 'Target' },   { em: '📋', name: 'Tasks' },
  { em: '🔧', name: 'Tools' },    { em: '⚙️', name: 'Settings' }, { em: '🗂', name: 'Files' },    { em: '📈', name: 'Growth' },
  { em: '💼', name: 'Work' },     { em: '🧩', name: 'Modules' },  { em: '👥', name: 'Team' },     { em: '🔔', name: 'Alerts' },
  { em: '📌', name: 'Pinned' },   { em: '🏷', name: 'Labels' },   { em: '📝', name: 'Notes' },    { em: '💡', name: 'Ideas' },
  { em: '🛡', name: 'Security' }, { em: '📦', name: 'Archive' },  { em: '🗓', name: 'Calendar' }, { em: '📢', name: 'Announce' },
  { em: '🔍', name: 'Search' },   { em: '📬', name: 'Inbox' },    { em: '⭐', name: 'Starred' },  { em: '🔗', name: 'Links' },
];

function loadMenus() {
  try { return JSON.parse(localStorage.getItem('emisDynMenus') || '[]'); } catch { return []; }
}
function saveMenus(menus) {
  localStorage.setItem('emisDynMenus', JSON.stringify(menus));
}

const EMPTY_FORM = { icon: '📁', label: '', description: '', visible: true, roles: ['CTO'], subs: [] };

export default function MenuBuilder() {
  const [menus, setMenus] = useState(loadMenus);
  const [form, setForm] = useState(EMPTY_FORM);
  const [subIcon, setSubIcon] = useState('');
  const [subLabel, setSubLabel] = useState('');

  const setAndSave = (next) => { setMenus(next); saveMenus(next); };

  const toggleRole = (role) => {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role],
    }));
  };

  const addSub = () => {
    if (!subLabel.trim()) return;
    setForm(f => ({ ...f, subs: [...f.subs, { icon: subIcon.trim() || '🔧', label: subLabel.trim() }] }));
    setSubIcon(''); setSubLabel('');
  };

  const removeSub = (i) => setForm(f => ({ ...f, subs: f.subs.filter((_, idx) => idx !== i) }));

  const createMenu = () => {
    if (!form.label.trim()) return;
    const newMenu = { ...form, id: 'dyn-' + Date.now(), label: form.label.trim() };
    setAndSave([...menus, newMenu]);
    setForm(EMPTY_FORM);
  };

  const deleteMenu = (id) => {
    if (!confirm('Delete this custom menu?')) return;
    setAndSave(menus.filter(m => m.id !== id));
  };

  const toggleVisible = (id) => {
    setAndSave(menus.map(m => m.id === id ? { ...m, visible: !m.visible } : m));
  };

  return (
    <div className="page-content">
      {/* ── Intro banner ──────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#0e3a9c,#1a56db 55%,#0d9488)', borderRadius: 14, padding: '22px 26px', color: '#fff', display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
        <div style={{ fontSize: 44, flexShrink: 0 }}>🧩</div>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Menu Builder</div>
          <div style={{ fontSize: 13, opacity: .85, lineHeight: 1.6 }}>Create custom navigation menus and assign them to specific roles. Each menu appears instantly in the sidebar and can have its own sub-items and visibility controls.</div>
        </div>
      </div>

      {/* ── Existing custom menus ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          Your Custom Menus
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text2)', marginLeft: 8 }}>{menus.length} created</span>
        </div>
      </div>

      {menus.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 28 }}>
          {menus.map(m => (
            <div key={m.id} className="card" style={{ padding: 0 }}>
              <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{m.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.4 }}>{m.description || 'No description'}</div>
                </div>
              </div>
              <div style={{ padding: '0 16px 10px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {m.roles.map(r => <span key={r} className="badge badge-blue">{r}</span>)}
                {m.subs.length > 0 && <span className="badge badge-gray">{m.subs.length} subs</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: m.visible ? 'var(--green)' : 'var(--text3)' }}>● {m.visible ? 'Visible' : 'Hidden'}</span>
              </div>
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => toggleVisible(m.id)}>
                  {m.visible ? '👁 Hide' : '👁 Show'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteMenu(m.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, border: '2px dashed var(--border)', borderRadius: 12, color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          No custom menus yet. Use the form below to create your first one.
        </div>
      )}

      {/* ── Create form ───────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">✨ Create New Menu</span>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Fill in the details below</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 28, alignItems: 'start' }}>

            {/* Sidebar preview */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', marginBottom: 10 }}>Sidebar Preview</div>
              <div style={{ background: 'var(--text)', borderRadius: 12, padding: '12px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, background: 'rgba(26,86,219,.4)' }}>
                  <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{form.icon}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'white' }}>{form.label || 'Menu Name'}</span>
                </div>
                {form.subs.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 26px', fontSize: 12.5, color: 'rgba(255,255,255,.5)', borderRadius: 6, margin: '1px 4px' }}>
                    {s.icon} {s.label}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, textAlign: 'center', lineHeight: 1.5 }}>How it looks in the sidebar</div>
            </div>

            {/* Form fields */}
            <div>
              {/* Icon picker */}
              <div className="form-group">
                <label>Choose Icon</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                  {MB_ICONS.map(ic => (
                    <div
                      key={ic.em}
                      onClick={() => setForm(f => ({ ...f, icon: ic.em }))}
                      title={ic.name}
                      style={{
                        borderRadius: 8, border: `1.5px solid ${form.icon === ic.em ? 'var(--accent)' : 'var(--border)'}`,
                        background: form.icon === ic.em ? 'var(--accent-light)' : 'white',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: '6px 2px', gap: 2, height: 52, transition: 'all .15s',
                      }}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{ic.em}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text2)', textAlign: 'center', lineHeight: 1 }}>{ic.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Label + Visibility */}
              <div className="form-row">
                <div className="form-group">
                  <label>Menu Label *</label>
                  <input className="form-control" placeholder="e.g. My Reports" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Visibility</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8 }}>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={form.visible} onChange={e => setForm(f => ({ ...f, visible: e.target.checked }))} />
                      <span className="toggle-slider" />
                    </label>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>Show in sidebar</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" placeholder="What will this menu be used for?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 70 }} />
              </div>

              {/* Roles */}
              <div className="form-group">
                <label>Assign to Roles</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                  {[['CTO', '⭐'], ['MANAGER', '🗂'], ['EMPLOYEE', '👤']].map(([role, icon]) => (
                    <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: `1.5px solid ${form.roles.includes(role) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: form.roles.includes(role) ? 'var(--accent-light)' : 'white', transition: 'all .15s' }}>
                      <input type="checkbox" checked={form.roles.includes(role)} onChange={() => toggleRole(role)} style={{ cursor: 'pointer' }} />
                      {icon} {role}
                    </label>
                  ))}
                </div>
              </div>

              {/* Sub-items */}
              <div className="form-group">
                <label>Sub-Menu Items <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>(optional)</span></label>
                {form.subs.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                    <span>{s.icon}</span>
                    <span style={{ flex: 1 }}>{s.label}</span>
                    <button onClick={() => removeSub(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14 }}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <input className="form-control" placeholder="Icon" value={subIcon} onChange={e => setSubIcon(e.target.value)} style={{ textAlign: 'center' }} />
                  <input className="form-control" placeholder="Sub-item label, e.g. Weekly View" value={subLabel} onChange={e => setSubLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSub()} />
                  <button className="btn btn-outline btn-sm" onClick={addSub} style={{ whiteSpace: 'nowrap' }}>+ Add</button>
                </div>
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 4 }}>
                <button className="btn btn-accent" onClick={createMenu} disabled={!form.label.trim()} style={{ padding: '11px 28px', fontSize: 14 }}>🧩 Create Menu</button>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>The new menu will appear in the sidebar immediately after creation.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
