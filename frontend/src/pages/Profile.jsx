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

// ── Font size config ────────────────────────────────────────────────────────
const FONT_SIZES = [
  { key: 'xs',  label: 'Small',   scale: 0.88 },
  { key: 'sm',  label: 'Normal',  scale: 1.0  },
  { key: 'md',  label: 'Large',   scale: 1.1  },
  { key: 'lg',  label: 'X-Large', scale: 1.2  },
];

function applyFontSize(key) {
  const cfg = FONT_SIZES.find(f => f.key === key) || FONT_SIZES[1];
  document.documentElement.style.setProperty('--font-scale', String(cfg.scale));
  document.documentElement.style.fontSize = `${cfg.scale * 14}px`;
}

// ── Text color palettes ─────────────────────────────────────────────────────
const TEXT_PALETTES = [
  { key: 'default', label: 'Default', text: '#1a1d2e', text2: '#5a6080', text3: '#9298b5' },
  { key: 'warm',    label: 'Warm',    text: '#1c1410', text2: '#6b5a4e', text3: '#a89080' },
  { key: 'cool',    label: 'Cool',    text: '#0f1729', text2: '#415075', text3: '#8899b5' },
  { key: 'soft',    label: 'Soft',    text: '#2d2d3f', text2: '#6870a0', text3: '#9ea8cc' },
  { key: 'green',   label: 'Forest',  text: '#0a1f14', text2: '#3d6b50', text3: '#7aab8a' },
];

function applyTextPalette(key) {
  const p = TEXT_PALETTES.find(t => t.key === key) || TEXT_PALETTES[0];
  document.documentElement.style.setProperty('--text',  p.text);
  document.documentElement.style.setProperty('--text2', p.text2);
  document.documentElement.style.setProperty('--text3', p.text3);
}

// ── View preferences ────────────────────────────────────────────────────────
const VIEW_MODES = [
  { key: 'detailed',  label: 'Detailed',  icon: '☰', desc: 'Full cards with all metadata' },
  { key: 'abstract',  label: 'Abstract',  icon: '▤', desc: 'Compact summary view' },
];

const QUICK_FILTER_OPTIONS = [
  { key: 'assignee',    label: 'Assignee' },
  { key: 'created_by',  label: 'Created By' },
  { key: 'date',        label: 'Date' },
  { key: 'priority',    label: 'Priority' },
  { key: 'item_status', label: 'Item Status' },
  { key: 'sprint',      label: 'Sprint' },
  { key: 'user_group',  label: 'User Group' },
];

function loadPref(key, def) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? def; } catch { return def; }
}

export default function Profile() {
  const { user } = useAuth();
  const { mode, accent, setMode, setAccent } = useTheme();
  const [av, setAv] = useState(() => user ? loadAv(user.emis_id) : null);
  const [avOpen, setAvOpen] = useState(false);
  const [pick, setPick] = useState(null);

  // Font & text color prefs
  const [fontSize, setFontSize] = useState(() => loadPref('ep-font-size', 'sm'));
  const [textPalette, setTextPalette] = useState(() => loadPref('ep-text-palette', 'default'));

  // View prefs
  const [viewMode, setViewModePref] = useState(() => loadPref('ep-view-mode', 'detailed'));
  const [quickFilters, setQuickFilters] = useState(() => loadPref('ep-quick-filters', ['priority', 'item_status', 'sprint']));

  const applyAndSaveFontSize = (key) => {
    setFontSize(key);
    localStorage.setItem('ep-font-size', JSON.stringify(key));
    applyFontSize(key);
  };

  const applyAndSaveTextPalette = (key) => {
    setTextPalette(key);
    localStorage.setItem('ep-text-palette', JSON.stringify(key));
    if (mode !== 'dark') applyTextPalette(key);
  };

  const toggleQuickFilter = (key) => {
    const next = quickFilters.includes(key)
      ? quickFilters.filter(k => k !== key)
      : [...quickFilters, key];
    setQuickFilters(next);
    localStorage.setItem('ep-quick-filters', JSON.stringify(next));
  };

  const saveViewMode = (key) => {
    setViewModePref(key);
    localStorage.setItem('ep-view-mode', JSON.stringify(key));
  };

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

      {/* ── Font Size ──────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">🔡 Font Size</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10 }}>
            {FONT_SIZES.map(f => (
              <button key={f.key} onClick={() => applyAndSaveFontSize(f.key)}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  border: `2px solid ${fontSize === f.key ? 'var(--accent)' : 'var(--border)'}`,
                  background: fontSize === f.key ? 'var(--accent-light)' : 'var(--surface2)',
                  color: fontSize === f.key ? 'var(--accent)' : 'var(--text2)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'all .2s',
                }}>
                <span style={{ fontSize: `${f.scale * 18}px`, fontWeight: 700 }}>Aa</span>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{f.label}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text2)' }}>
            Current: <strong style={{ color: 'var(--accent)' }}>{FONT_SIZES.find(f => f.key === fontSize)?.label}</strong>
            {' · '}Applied to entire interface
          </div>
        </div>
      </div>

      {/* ── Text Color Palette ──────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">🎨 Text Colors</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TEXT_PALETTES.map(p => (
              <button key={p.key} onClick={() => applyAndSaveTextPalette(p.key)}
                style={{
                  padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  border: `2px solid ${textPalette === p.key ? 'var(--accent)' : 'var(--border)'}`,
                  background: textPalette === p.key ? 'var(--accent-light)' : 'var(--surface2)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'all .2s', minWidth: 80,
                }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ width: 32, height: 4, borderRadius: 2, background: p.text, display: 'block' }} />
                  <span style={{ width: 28, height: 3, borderRadius: 2, background: p.text2, display: 'block' }} />
                  <span style={{ width: 22, height: 2.5, borderRadius: 2, background: p.text3, display: 'block' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: textPalette === p.key ? 'var(--accent)' : 'var(--text2)' }}>{p.label}</span>
              </button>
            ))}
          </div>
          {mode === 'dark' && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
              ℹ️ Text color palettes apply in Light mode only
            </div>
          )}
        </div>
      </div>

      {/* ── View Preferences ───────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><span className="card-title">📐 View Preferences</span></div>
        <div className="card-body">
          {/* Default view mode */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', marginBottom: 10 }}>Default View Mode</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {VIEW_MODES.map(m => (
                <button key={m.key} onClick={() => saveViewMode(m.key)}
                  style={{
                    flex: 1, padding: '14px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                    border: `2px solid ${viewMode === m.key ? 'var(--accent)' : 'var(--border)'}`,
                    background: viewMode === m.key ? 'var(--accent-light)' : 'var(--surface2)',
                    color: viewMode === m.key ? 'var(--accent)' : 'var(--text2)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all .2s',
                  }}>
                  <span style={{ fontSize: 24 }}>{m.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{m.label}</span>
                  <span style={{ fontSize: 11, textAlign: 'center', opacity: .8 }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick filter defaults */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', marginBottom: 10 }}>Default Quick Filters</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_FILTER_OPTIONS.map(f => {
                const active = quickFilters.includes(f.key);
                return (
                  <button key={f.key} onClick={() => toggleQuickFilter(f.key)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'var(--accent-light)' : 'white',
                      color: active ? 'var(--accent)' : 'var(--text2)',
                      transition: 'all .15s',
                    }}>
                    {active ? '✓ ' : ''}{f.label}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text2)' }}>
              Selected filters will appear by default in item lists and sprint views.
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
