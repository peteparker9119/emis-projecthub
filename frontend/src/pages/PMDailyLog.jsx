import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import PageLoader from '../components/PageLoader';
import {
  getPMWork, createPMWork, updatePMWork, deletePMWork,
  uploadPMWorkAttachment, deletePMWorkAttachment,
  createPMWorkComment, deletePMWorkComment,
} from '../api';

// ── Category config ────────────────────────────────────────────────────────
const CATS = {
  documentation:       { label: 'Documentation',       icon: '📄', color: '#1d4ed8', bg: '#dbeafe' },
  learning:            { label: 'Learning',             icon: '📚', color: '#7c3aed', bg: '#ede9fe' },
  internal_discussion: { label: 'Internal Discussion',  icon: '💬', color: '#0d9488', bg: '#ccfbf1' },
  external_discussion: { label: 'External Discussion',  icon: '🤝', color: '#b45309', bg: '#fef3c7' },
  online_discussion:   { label: 'Online Discussion',    icon: '🌐', color: '#0369a1', bg: '#e0f2fe' },
  grooming_discussion: { label: 'Grooming Discussion',  icon: '🌱', color: '#15803d', bg: '#dcfce7' },
  tech_discussion:     { label: 'Tech Discussion',      icon: '⚙️',  color: '#475569', bg: '#f1f5f9' },
  pmu_discussion:      { label: 'PMU Discussion',       icon: '📊', color: '#be185d', bg: '#fce7f3' },
};

const BLANK = { category: 'documentation', title: '', description: '', hours: '' };

const iStyle = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const lStyle = { fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 };

// ── Small helpers ──────────────────────────────────────────────────────────
function CatBadge({ cat }) {
  const c = CATS[cat] || { label: cat, icon: '📌', color: '#64748b', bg: '#f8fafc' };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {c.icon} {c.label}
    </span>
  );
}

function dateStr(d) { return d.toISOString().slice(0, 10); }
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Entry Detail Modal ─────────────────────────────────────────────────────
function EntryModal({ entry, currentUser, onClose, onUpdated, onDeleted }) {
  const [comment, setComment]   = useState('');
  const [cBusy, setCBusy]       = useState(false);
  const [attBusy, setAttBusy]   = useState(false);
  const [err, setErr]           = useState('');
  const fileRef = useRef();

  const attachments = entry.attachments || [];
  const comments    = entry.comments    || [];

  const handleComment = async () => {
    if (!comment.trim()) return;
    setCBusy(true);
    try {
      await createPMWorkComment(entry.id, { text: comment.trim(), author: currentUser.id });
      setComment('');
      onUpdated();
    } catch { setErr('Failed to post comment'); }
    finally { setCBusy(false); }
  };

  const handleDeleteComment = async (cId) => {
    try { await deletePMWorkComment(entry.id, cId); onUpdated(); } catch {}
  };

  const handleAttach = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    setAttBusy(true);
    try { await uploadPMWorkAttachment(entry.id, fd); onUpdated(); }
    catch { setErr('Upload failed'); }
    finally { setAttBusy(false); }
  };

  const handleDeleteAtt = async (attId) => {
    try { await deletePMWorkAttachment(entry.id, attId); onUpdated(); } catch {}
  };

  const cat = CATS[entry.category] || CATS.documentation;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 20, width: '92vw', maxWidth: 820, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 28px 90px rgba(0,0,0,.22)' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', background: cat.bg, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <span style={{ fontSize: 28 }}>{cat.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: cat.color }}>{entry.title}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              <CatBadge cat={entry.category} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#065f46', background: '#d1fae5', padding: '2px 10px', borderRadius: 10 }}>⏱ {entry.hours}h</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{entry.date}</span>
            </div>
          </div>
          <button onClick={() => onDeleted(entry.id)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🗑 Delete</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)', padding: '0 4px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Description */}
          {entry.description && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>Description</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>{entry.description}</div>
            </div>
          )}

          {/* Attachments */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              📎 Attachments
              <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) { handleAttach(e.target.files[0]); e.target.value = ''; } }} />
              <button onClick={() => fileRef.current?.click()} disabled={attBusy}
                style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 8, border: '1.5px solid var(--accent)', background: 'var(--accent-light)', color: 'var(--accent)', cursor: attBusy ? 'not-allowed' : 'pointer' }}>
                {attBusy ? '⏳ Uploading…' : '+ Attach'}
              </button>
            </div>
            {attachments.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>No attachments yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {attachments.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 14px' }}>
                    <span style={{ fontSize: 18 }}>📄</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{a.filename}</span>
                    {a.file_url && <a href={a.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', background: 'var(--accent-light)', padding: '3px 10px', borderRadius: 6 }}>📥 Download</a>}
                    <button onClick={() => handleDeleteAtt(a.id)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#dc2626', padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>💬 Comments</div>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{c.author_initials}</div>
                <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{c.author_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{c.text}</div>
                </div>
                {c.author === currentUser.id && (
                  <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#dc2626', padding: '0 4px', alignSelf: 'flex-start', marginTop: 6 }}>×</button>
                )}
              </div>
            ))}
            {err && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                placeholder="Add a comment… (Enter to send)"
                style={{ flex: 1, ...iStyle }}
              />
              <button onClick={handleComment} disabled={cBusy || !comment.trim()} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 13, cursor: cBusy ? 'wait' : 'pointer', opacity: !comment.trim() ? .5 : 1 }}>
                {cBusy ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Entry Form ─────────────────────────────────────────────────────────
function AddEntryForm({ date, userId, onCreated, onCancel }) {
  const [form, setForm]   = useState({ ...BLANK });
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');
  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim())  { setErr('Title is required'); return; }
    if (!form.hours || isNaN(form.hours) || Number(form.hours) <= 0) { setErr('Hours must be > 0'); return; }
    setBusy(true); setErr('');
    try {
      await createPMWork({ ...form, hours: Number(form.hours), date, user: userId });
      onCreated();
    } catch (e) { setErr(e?.response?.data?.title?.[0] || 'Failed to save'); setBusy(false); }
  };

  return (
    <div style={{ background: 'white', border: '2px solid var(--accent)', borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: '0 4px 24px rgba(26,86,219,.08)' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', marginBottom: 16 }}>+ Log Activity</div>
      {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#dc2626', marginBottom: 12 }}>{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={lStyle}>Title *</label>
          <input value={form.title} onChange={F('title')} placeholder="What did you work on?" style={iStyle} autoFocus />
        </div>
        <div>
          <label style={lStyle}>Category *</label>
          <select value={form.category} onChange={F('category')} style={iStyle}>
            {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lStyle}>Hours *</label>
          <input value={form.hours} onChange={F('hours')} type="number" min="0.25" step="0.25" placeholder="0.5" style={iStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lStyle}>Description / Notes</label>
        <textarea value={form.description} onChange={F('description')} rows={3} placeholder="Add details, context, outcomes…" style={{ ...iStyle, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={submit} disabled={busy || !form.title.trim()} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: !form.title.trim() ? .5 : 1 }}>
          {busy ? 'Saving…' : '✅ Log Activity'}
        </button>
        <button onClick={onCancel} style={{ padding: '9px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function PMDailyLog() {
  const { user } = useAuth();
  const [date, setDate]         = useState(dateStr(new Date()));
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [detail, setDetail]     = useState(null);
  const [catFilter, setCatFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPMWork({ date, user: user.id });
      setEntries(res.data);
    } catch {}
    finally { setLoading(false); }
  }, [date, user.id]);

  useEffect(() => { load(); }, [load]);

  const handleDeleted = async (id) => {
    try { await deletePMWork(id); setDetail(null); load(); } catch {}
  };

  const navigate = (days) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(dateStr(d));
  };

  // Totals
  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
  const catTotals  = Object.fromEntries(Object.keys(CATS).map(k => [k, entries.filter(e => e.category === k).reduce((s, e) => s + Number(e.hours), 0)]));
  const filtered   = catFilter ? entries.filter(e => e.category === catFilter) : entries;

  // Refresh detail after attachment/comment
  const handleDetailUpdated = async () => {
    try {
      const res = await getPMWork({ date, user: user.id });
      setEntries(res.data);
      const updated = res.data.find(e => e.id === detail?.id);
      if (updated) setDetail(updated);
    } catch {}
  };

  return (
    <div style={{ padding: '28px 32px', background: 'var(--surface)', minHeight: '100vh' }}>

      {/* Date navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 18 }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{fmtDate(date)}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            {date === dateStr(new Date()) ? '📅 Today' : date}
          </div>
        </div>
        <button onClick={() => navigate(1)} disabled={date >= dateStr(new Date())} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 18, opacity: date >= dateStr(new Date()) ? .3 : 1 }}>›</button>
        <button onClick={() => setDate(dateStr(new Date()))} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Today</button>
      </div>

      {/* Summary bar */}
      {entries.length > 0 && (
        <div style={{ background: 'white', borderRadius: 14, padding: '16px 22px', border: '1px solid var(--border)', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#1a56db' }}>{totalHours.toFixed(1)}h</span>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{entries.length} activities logged</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            {Object.entries(catTotals).filter(([, h]) => h > 0).map(([k, h]) => {
              const c = CATS[k];
              return (
                <button key={k} onClick={() => setCatFilter(catFilter === k ? '' : k)}
                  style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: catFilter === k ? c.color : c.bg, color: catFilter === k ? 'white' : c.color, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all .15s' }}>
                  {c.icon} {c.label} · {h.toFixed(1)}h
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {date === dateStr(new Date()) && !showAdd && (
          <button onClick={() => setShowAdd(true)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,86,219,.25)' }}>
            + Log Activity
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <AddEntryForm date={date} userId={user.id} onCreated={() => { setShowAdd(false); load(); }} onCancel={() => setShowAdd(false)} />
      )}

      {/* Entries */}
      {loading ? <PageLoader message="Loading work log…" /> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📓</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{catFilter ? 'No entries for this category.' : 'No activities logged for this day.'}</div>
          {date === dateStr(new Date()) && !catFilter && <div style={{ fontSize: 13, marginTop: 8 }}>Click "+ Log Activity" to get started.</div>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(e => {
            const cat = CATS[e.category] || CATS.documentation;
            return (
              <div
                key={e.id}
                onClick={() => setDetail(e)}
                style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1.5px solid var(--border)', borderLeft: `5px solid ${cat.color}`, cursor: 'pointer', transition: 'all .15s', display: 'flex', gap: 16, alignItems: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = ''; }}
              >
                <span style={{ fontSize: 28, flexShrink: 0 }}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{e.title}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <CatBadge cat={e.category} />
                    {e.description && <span style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{e.description}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: cat.color }}>{Number(e.hours).toFixed(1)}h</span>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--text2)' }}>
                    {e.attachment_count > 0 && <span>📎 {e.attachment_count}</span>}
                    {e.comment_count    > 0 && <span>💬 {e.comment_count}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <EntryModal
          entry={detail}
          currentUser={user}
          onClose={() => setDetail(null)}
          onUpdated={handleDetailUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
