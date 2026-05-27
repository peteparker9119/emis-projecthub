import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEpics, createEpic, updateEpic, deleteEpic, getProjects, getRequirements, createRequirement, getSprints, getUsers } from '../api';

const STATUS_COLORS = {
  'Planning':    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'In Progress': { bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  'Done':        { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'On Hold':     { bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' },
};

const PRIORITY_COLORS = {
  Critical: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  High:     { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
  Medium:   { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  Low:      { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
};

const ITEM_TYPES = ['REQ', 'Bug', 'Task', 'QA', 'Report', 'TI', 'Spike', 'Adhoc'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

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

// ── Epic Form Modal ───────────────────────────────────────────────────────────
function EpicFormModal({ epic, projects, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: epic?.title || '',
    description: epic?.description || '',
    priority: epic?.priority || 'Medium',
    status: epic?.status || 'Planning',
    project: epic?.project || '',
    start_date: epic?.start_date || '',
    end_date: epic?.end_date || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const isEdit = !!epic;

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        status: form.status,
        project: form.project || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (isEdit) {
        await updateEpic(epic.id, payload);
      } else {
        await createEpic(payload);
      }
      onSaved();
    } catch (e) {
      setErr(e?.response?.data?.title?.[0] || e?.response?.data?.error || e?.response?.data?.detail || 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 560, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isEdit ? '✏️ Edit Epic' : '🗺️ Create Epic'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Title *</label>
            <input value={form.title} onChange={F('title')} placeholder="Epic title…" autoFocus
              style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />

          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea value={form.description} onChange={F('description')} rows={3} placeholder="Epic description…"
              style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Priority</label>
              <select value={form.priority} onChange={F('priority')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', background: 'white' }}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Status</label>
              <select value={form.status} onChange={F('status')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', background: 'white' }}>
                {['Planning', 'In Progress', 'Done', 'On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>

            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Project (optional)</label>
            <select value={form.project} onChange={F('project')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', background: 'white' }}>
              <option value="">— No project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Start Date</label>
              <input type="date" value={form.start_date} onChange={F('start_date')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />

            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>End Date</label>
              <input type="date" value={form.end_date} onChange={F('end_date')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />

            </div>
          </div>
        </div>

        {err && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 10 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Epic'}
          </button>
        </div>
      </div>
    </div>
  );
}

const DEPARTMENTS = ['DSE','DEE','SS','MS','DGE','DPS','Other','Tech Initiatives'];
const STATUSES    = ['Open','In Progress','Review','Done'];

// ── Full Requirement Modal ────────────────────────────────────────────────────
function FullReqModal({ epic, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    item_type: 'REQ',
    priority: 'Medium',
    status: 'Open',
    assignee: '',
    sprint: '',
    department: '',
    start_date: '',
    end_date: '',
    story_points: '',
  });
  const [users, setUsers]     = useState([]);
  const [sprints, setSprints] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    Promise.all([getUsers(), getSprints()])
      .then(([ur, sr]) => { setUsers(ur.data); setSprints(sr.data); })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!form.title.trim())  { setErr('Title is required'); return; }
    if (!form.start_date)    { setErr('Start date is required'); return; }
    if (!form.end_date)      { setErr('End date is required'); return; }
    setSaving(true);
    try {
      await createRequirement({
        title:       form.title.trim(),
        description: form.description.trim(),
        item_type:   form.item_type,
        priority:    form.priority,
        status:      form.status,
        assignee:    form.assignee   || null,
        sprint:      form.sprint     || null,
        department:  form.department || '',
        start_date:  form.start_date,
        end_date:    form.end_date,
        story_points: form.story_points ? Number(form.story_points) : null,
        epic:        epic.id,
      });
      onSaved();
    } catch (e) {
      setErr(e?.response?.data?.title?.[0] || e?.response?.data?.detail || 'Save failed');
      setSaving(false);
    }
  };

  const sel = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' };
  const inp = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const lab = { fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 620, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,.22)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>+ Add Requirement</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Epic: {epic.id} · {epic.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <div>
            <label style={lab}>Title *</label>
            <input value={form.title} onChange={F('title')} placeholder="Requirement title…" autoFocus style={inp} />
          </div>

          {/* Description */}
          <div>
            <label style={lab}>Description</label>
            <textarea value={form.description} onChange={F('description')} rows={3} placeholder="Describe the requirement…"
              style={{ ...inp, resize: 'vertical' }} />
          </div>

          {/* Type + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lab}>Type</label>
              <select value={form.item_type} onChange={F('item_type')} style={sel}>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lab}>Priority</label>
              <select value={form.priority} onChange={F('priority')} style={sel}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Status + Department */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lab}>Status</label>
              <select value={form.status} onChange={F('status')} style={sel}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={lab}>Department</label>
              <select value={form.department} onChange={F('department')} style={sel}>
                <option value="">— None —</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Assignee + Sprint */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lab}>Assignee</label>
              <select value={form.assignee} onChange={F('assignee')} style={sel}>
                <option value="">— Unassigned —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lab}>Sprint</label>
              <select value={form.sprint} onChange={F('sprint')} style={sel}>
                <option value="">— No Sprint —</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Start + End dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lab}>Start Date *</label>
              <input type="date" value={form.start_date} onChange={F('start_date')} style={inp} />
            </div>
            <div>
              <label style={lab}>End Date *</label>
              <input type="date" value={form.end_date} onChange={F('end_date')} style={inp} />
            </div>
          </div>

          {/* Story Points */}
          <div style={{ maxWidth: 160 }}>
            <label style={lab}>Story Points</label>
            <input type="number" value={form.story_points} onChange={F('story_points')} placeholder="0" min="0"
              style={inp} />
          </div>
        </div>

        {err && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 10 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Adding…' : 'Add Requirement'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Epic Detail Panel ─────────────────────────────────────────────────────────
function EpicDetailPanel({ epic, canEdit, onClose, onEdit, onAddReq, epicReqs }) {
  const sc = STATUS_COLORS[epic.status] || STATUS_COLORS['Planning'];
  const pc = PRIORITY_COLORS[epic.priority] || PRIORITY_COLORS.Medium;
  const dateRange = [epic.start_date, epic.end_date].filter(Boolean).join(' → ') || '—';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,40,.35)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: 'white', zIndex: 201, overflowY: 'auto',
        boxShadow: '-8px 0 48px rgba(15,20,40,.18)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 4 }}>{epic.id}</div>
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{epic.title}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            <Chip label={epic.status}   bg={sc.bg}   color={sc.color}   border={sc.border} />
            <Chip label={epic.priority} bg={pc.bg}   color={pc.color}   border={pc.border} />
          </div>
        </div>

        {/* Meta */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 3 }}>Project</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{epic.project_name || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 3 }}>Created By</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{epic.created_by_name || '—'}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 3 }}>Date Range</div>
            <div style={{ fontSize: 13 }}>{dateRange}</div>
          </div>
          {epic.description && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, background: 'var(--surface)', borderRadius: 8, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>{epic.description}</div>
            </div>
          )}
        </div>

        {/* Requirements list */}
        <div style={{ padding: '16px 22px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>📋 Requirements ({epicReqs.length})</div>
            {canEdit && (
              <button onClick={onAddReq} style={{ padding: '5px 12px', border: 'none', borderRadius: 7, background: '#1a56db', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                + Add Requirement
              </button>
            )}
          </div>
          {epicReqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>No requirements yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {epicReqs.map(r => {
                const rpc = PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.Medium;
                return (
                  <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>{r.id}</span>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <Chip label={r.item_type} bg="#eff6ff" color="#1d4ed8" border="#bfdbfe" />
                        <Chip label={r.priority} bg={rpc.bg} color={rpc.color} border={rpc.border} />
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{r.status}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 8 }}>
          {canEdit && (
            <button onClick={onEdit} style={{ flex: 1, padding: '9px 0', border: '1.5px solid #1a56db', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1a56db', fontFamily: 'inherit' }}>
              ✏️ Edit
            </button>
          )}
          <button onClick={onClose} style={{ flex: 1, padding: '9px 0', border: '1.5px solid var(--border)', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit' }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Epics() {
  const { user } = useAuth();
  const [epics, setEpics] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allReqs, setAllReqs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createModal, setCreateModal] = useState(false);
  const [editEpic, setEditEpic] = useState(null);
  const [detailEpic, setDetailEpic] = useState(null);
  const [addReqEpic, setAddReqEpic] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const canEdit = user?.role === 'Product Manager' || user?.role === 'PM Team Lead';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, pRes, rRes] = await Promise.all([getEpics(), getProjects(), getRequirements()]);
      setEpics(eRes.data);
      setProjects(pRes.data);
      setAllReqs(rRes.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this epic? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteEpic(id);
      setEpics(prev => prev.filter(e => e.id !== id));
      if (detailEpic?.id === id) setDetailEpic(null);
    } catch {}
    finally { setDeleting(null); }
  };

  const totalEpics   = epics.length;
  const planning     = epics.filter(e => e.status === 'Planning').length;
  const inProgress   = epics.filter(e => e.status === 'In Progress').length;
  const done         = epics.filter(e => e.status === 'Done').length;

  const epicReqs = detailEpic ? allReqs.filter(r => String(r.epic) === String(detailEpic.id)) : [];

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🗺️ Epics</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: '3px 0 0' }}>High-level initiative planning</p>
        </div>
        {canEdit && (
          <button onClick={() => setCreateModal(true)} style={{ padding: '9px 20px', border: 'none', borderRadius: 9, background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Create Epic
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon="🗺️" label="Total Epics"  value={totalEpics}  color="#1a56db" />
        <StatCard icon="📐" label="Planning"     value={planning}    color="#1d4ed8" />
        <StatCard icon="⚡" label="In Progress"  value={inProgress}  color="#a16207" />
        <StatCard icon="✅" label="Done"         value={done}        color="#15803d" />
      </div>

      {/* Epic cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading…</div>
      ) : epics.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No epics yet{canEdit ? ' — create your first epic above' : ''}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {epics.map(epic => {
            const sc = STATUS_COLORS[epic.status] || STATUS_COLORS['Planning'];
            const pc = PRIORITY_COLORS[epic.priority] || PRIORITY_COLORS.Medium;
            const dateRange = [epic.start_date, epic.end_date].filter(Boolean).join(' → ') || null;

            return (
              <div
                key={epic.id}
                onClick={() => setDetailEpic(epic)}
                style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow .15s', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.05)'}
              >
                {/* ID + chips */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>{epic.id}</span>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <Chip label={epic.status}   bg={sc.bg} color={sc.color} border={sc.border} />
                    <Chip label={epic.priority} bg={pc.bg} color={pc.color} border={pc.border} />
                  </div>
                </div>

                {/* Title */}
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: 8 }}>{epic.title}</div>

                {/* Meta */}
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text2)', flexWrap: 'wrap', marginBottom: 10 }}>
                  <span>📋 {epic.requirement_count} requirements</span>
                  {epic.project_name && <span>📁 {epic.project_name}</span>}
                  {dateRange && <span>📅 {dateRange}</span>}
                </div>

                {epic.created_by_name && (
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>by {epic.created_by_name}</div>
                )}

                {/* Add Requirement button */}
                {canEdit && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setAddReqEpic(epic)} style={{ flex: 1, padding: '6px 0', border: '1.5px dashed #1a56db', borderRadius: 7, background: 'transparent', color: '#1a56db', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      + Add Requirement
                    </button>
                    <button onClick={() => { setEditEpic(epic); }} style={{ padding: '6px 12px', border: '1.5px solid var(--border)', borderRadius: 7, background: 'white', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(epic.id)} disabled={deleting === epic.id} style={{ padding: '6px 12px', border: '1.5px solid #fca5a5', borderRadius: 7, background: 'white', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', color: '#dc2626' }}>
                      🗑
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      {(createModal || editEpic) && (
        <EpicFormModal
          epic={editEpic}
          projects={projects}
          onClose={() => { setCreateModal(false); setEditEpic(null); }}
          onSaved={() => { setCreateModal(false); setEditEpic(null); loadData(); }}
        />
      )}

      {/* Detail panel */}
      {detailEpic && !editEpic && (
        <EpicDetailPanel
          epic={detailEpic}
          canEdit={canEdit}
          epicReqs={epicReqs}
          onClose={() => setDetailEpic(null)}
          onEdit={() => { setEditEpic(detailEpic); setDetailEpic(null); }}
          onAddReq={() => setAddReqEpic(detailEpic)}
        />
      )}

      {/* Add requirement modal */}
      {addReqEpic && (
        <FullReqModal
          epic={addReqEpic}
          onClose={() => setAddReqEpic(null)}
          onSaved={() => { setAddReqEpic(null); loadData(); }}
        />
      )}
    </div>
  );
}
