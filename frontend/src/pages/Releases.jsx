import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getReleases, createRelease, updateRelease, deleteRelease, addToRelease, removeFromRelease, getSprints, getRequirements } from '../api';

const STATUS_COLORS = {
  Draft:     { bg: '#fffbeb', color: '#a16207', border: '#fde68a' },
  Published: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Archived:  { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' },
};

const TYPE_COLORS = {
  REQ:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Bug:    { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  Task:   { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  QA:     { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  Report: { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
  TI:     { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  Spike:  { bg: '#fefce8', color: '#854d0e', border: '#fef08a' },
  Adhoc:  { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
};

function Chip({ label, bg, color, border }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color, border: `1px solid ${border || bg}` }}>
      {label}
    </span>
  );
}

function StatCard({ icon, label, value, color = '#1a56db' }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid var(--border)', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, margin: '4px 0 2px' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
    </div>
  );
}

// ── New Release Modal ─────────────────────────────────────────────────────────
function NewReleaseModal({ sprints, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', version: '', sprint: '', description: '', released_at: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setErr('Name is required'); return; }
    setSaving(true);
    try {
      const res = await createRelease({
        name: form.name.trim(),
        version: form.version.trim(),
        sprint: form.sprint || null,
        description: form.description.trim(),
        released_at: form.released_at || null,
      });
      onSaved(res.data);
    } catch (e) {
      setErr(e?.response?.data?.name?.[0] || e?.response?.data?.error || e?.response?.data?.detail || 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>🚀 New Release</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Release Name *</label>
              <input value={form.name} onChange={F('name')} placeholder="e.g. Q2 Feature Release" autoFocus
                style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Version</label>
              <input value={form.version} onChange={F('version')} placeholder="e.g. v2.4.0"
                style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Sprint (optional)</label>
            <select value={form.sprint} onChange={F('sprint')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', background: 'white' }}>
              <option value="">— No sprint —</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea value={form.description} onChange={F('description')} rows={3} placeholder="What's included in this release…"
              style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Release Date</label>
            <input type="date" value={form.released_at} onChange={F('released_at')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
        </div>

        {err && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 10 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Creating…' : 'Create Release'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Push to Release Modal ─────────────────────────────────────────────────────
function PushToReleaseModal({ release, sprints, onClose, onPushed }) {
  const [filterSprint, setFilterSprint] = useState('');
  const [allReqs, setAllReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [pushing, setPushing] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    getRequirements({ status: 'Done' }).then(r => setAllReqs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const alreadyInRelease = new Set(release.items.map(i => String(i.requirement)));
  const doneReqs = allReqs.filter(r => {
    if (alreadyInRelease.has(String(r.id))) return false;
    if (filterSprint && String(r.sprint) !== filterSprint) return false;
    return true;
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handlePush = async () => {
    if (selected.size === 0) { setErr('Select at least one requirement'); return; }
    setPushing(true);
    try {
      await Promise.all([...selected].map(reqId => addToRelease(release.id, { requirement_id: reqId })));
      onPushed();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Push failed');
      setPushing(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 580, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>📦 Push to Release</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{release.id} · {release.name} — Select completed items to include</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>

        <div style={{ marginBottom: 12, flexShrink: 0 }}>
          <select value={filterSprint} onChange={e => setFilterSprint(e.target.value)} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', background: 'white' }}>
            <option value="">All Sprints</option>
            {sprints.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>Loading…</div>
          ) : doneReqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>No completed items available</div>
          ) : doneReqs.map(r => (
            <div key={r.id} onClick={() => toggleSelect(r.id)}
              style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 14px', cursor: 'pointer', background: selected.has(r.id) ? '#eff6ff' : 'white', borderBottom: '1px solid var(--border)' }}>
              <input type="checkbox" readOnly checked={selected.has(r.id)} style={{ cursor: 'pointer' }} />
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#065f46', fontWeight: 700, flexShrink: 0 }}>{r.id}</span>
              <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
              <Chip label={r.item_type} bg="#eff6ff" color="#1d4ed8" border="#bfdbfe" />
              {r.sprint_name && <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>🏃 {r.sprint_name}</span>}
            </div>
          ))}
        </div>

        {err && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 10 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handlePush} disabled={pushing || selected.size === 0}
            style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#065f46,#059669)', color: 'white', fontWeight: 700, fontSize: 13, cursor: (pushing || selected.size === 0) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: selected.size === 0 ? .5 : 1 }}>
            {pushing ? 'Pushing…' : `Push ${selected.size} item${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Release Detail Panel ──────────────────────────────────────────────────────
function ReleaseDetailPanel({ release, isSM, sprints, onClose, onUpdated }) {
  const sc = STATUS_COLORS[release.status] || STATUS_COLORS.Draft;
  const [removingId, setRemovingId] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [pushModal, setPushModal] = useState(false);

  const handleRemoveItem = async (itemId) => {
    setRemovingId(itemId);
    try {
      await removeFromRelease(release.id, itemId);
      onUpdated();
    } catch {}
    finally { setRemovingId(null); }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await updateRelease(release.id, { status: 'Published' });
      onUpdated();
    } catch {}
    finally { setPublishing(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,40,.35)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, background: 'white', zIndex: 201, overflowY: 'auto', boxShadow: '-8px 0 48px rgba(15,20,40,.18)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 4 }}>{release.id}</div>
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{release.name}</div>
              {release.version && <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 700, marginTop: 3 }}>v{release.version}</div>}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <Chip label={release.status} bg={sc.bg} color={sc.color} border={sc.border} />
            {release.sprint_name && <span style={{ fontSize: 12, color: 'var(--text2)' }}>🏃 {release.sprint_name}</span>}
            {release.released_at && <span style={{ fontSize: 12, color: 'var(--text2)' }}>📅 {release.released_at}</span>}
          </div>
        </div>

        {/* Actions (SM only) */}
        {isSM && (
          <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setPushModal(true)} style={{ flex: 1, padding: '8px 0', border: '1.5px solid #1a56db', borderRadius: 8, background: 'white', color: '#1a56db', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              📦 Push Requirements
            </button>
            {release.status === 'Draft' && (
              <button onClick={handlePublish} disabled={publishing} style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#065f46,#059669)', color: 'white', fontWeight: 700, fontSize: 12, cursor: publishing ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                {publishing ? 'Publishing…' : '🚀 Publish'}
              </button>
            )}
          </div>
        )}

        {/* Items list */}
        <div style={{ padding: '16px 22px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📋 Items ({release.items.length})</div>
          {release.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>No items in this release yet{isSM ? ' — push some requirements above' : ''}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {release.items.map(item => {
                const tc = TYPE_COLORS[item.req_type] || TYPE_COLORS.REQ;
                return (
                  <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#065f46', fontWeight: 700, flexShrink: 0 }}>{item.requirement}</span>
                          <Chip label={item.req_type} bg={tc.bg} color={tc.color} border={tc.border} />
                          <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>{item.req_status}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.req_title}</div>
                        {item.notes && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>{item.notes}</div>}
                      </div>
                      {isSM && (
                        <button onClick={() => handleRemoveItem(item.id)} disabled={removingId === item.id}
                          style={{ padding: '4px 10px', border: '1px solid #fca5a5', borderRadius: 6, background: 'white', color: '#dc2626', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                          {removingId === item.id ? '…' : '✕'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: '100%', padding: '9px 0', border: '1.5px solid var(--border)', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit' }}>Close</button>
        </div>
      </div>

      {pushModal && (
        <PushToReleaseModal
          release={release}
          sprints={sprints}
          onClose={() => setPushModal(false)}
          onPushed={() => { setPushModal(false); onUpdated(); }}
        />
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Releases() {
  const { user } = useAuth();
  const [releases, setReleases] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newModal, setNewModal] = useState(false);
  const [detailRelease, setDetailRelease] = useState(null);

  const isSM = user?.role === 'Scrum Master';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([getReleases(), getSprints()]);
      setReleases(rRes.data);
      setSprints(sRes.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalReleases = releases.length;
  const draft         = releases.filter(r => r.status === 'Draft').length;
  const published     = releases.filter(r => r.status === 'Published').length;

  // Keep detail panel in sync after updates
  const handleDetailUpdate = async () => {
    await loadData();
    if (detailRelease) {
      const updated = releases.find(r => r.id === detailRelease.id);
      if (updated) setDetailRelease(updated);
    }
  };

  const handleDetailUpdated = useCallback(async () => {
    try {
      const [rRes] = await Promise.all([getReleases()]);
      const updated = rRes.data;
      setReleases(updated);
      if (detailRelease) {
        const fresh = updated.find(r => r.id === detailRelease.id);
        if (fresh) setDetailRelease(fresh);
        else setDetailRelease(null);
      }
    } catch {}
  }, [detailRelease]);

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🚀 Releases</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: '3px 0 0' }}>Track software releases and shipped items</p>
        </div>
        {isSM && (
          <button onClick={() => setNewModal(true)} style={{ padding: '9px 20px', border: 'none', borderRadius: 9, background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            + New Release
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon="🚀" label="Total Releases" value={totalReleases} color="#1a56db" />
        <StatCard icon="📝" label="Draft"          value={draft}         color="#a16207" />
        <StatCard icon="✅" label="Published"      value={published}     color="#15803d" />
      </div>

      {/* Release cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading…</div>
      ) : releases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No releases yet{isSM ? ' — create your first release above' : ''}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {releases.map(release => {
            const sc = STATUS_COLORS[release.status] || STATUS_COLORS.Draft;
            return (
              <div
                key={release.id}
                onClick={() => setDetailRelease(release)}
                style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow .15s', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.05)'}
              >
                {/* ID + status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>{release.id}</span>
                  <Chip label={release.status} bg={sc.bg} color={sc.color} border={sc.border} />
                </div>

                {/* Name + version */}
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>{release.name}</div>
                {release.version && (
                  <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: 6, marginBottom: 8 }}>
                    v{release.version}
                  </div>
                )}

                {/* Meta */}
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text2)', flexWrap: 'wrap', marginTop: 8 }}>
                  <span>📦 {release.item_count} items</span>
                  {release.sprint_name && <span>🏃 {release.sprint_name}</span>}
                  {release.released_at && <span>📅 {release.released_at}</span>}
                </div>

                {release.created_by_name && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>by {release.created_by_name}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Release modal */}
      {newModal && (
        <NewReleaseModal
          sprints={sprints}
          onClose={() => setNewModal(false)}
          onSaved={(newRelease) => { setNewModal(false); setReleases(prev => [newRelease, ...prev]); setDetailRelease(newRelease); }}
        />
      )}

      {/* Detail panel */}
      {detailRelease && (
        <ReleaseDetailPanel
          release={detailRelease}
          isSM={isSM}
          sprints={sprints}
          onClose={() => setDetailRelease(null)}
          onUpdated={handleDetailUpdated}
        />
      )}
    </div>
  );
}
