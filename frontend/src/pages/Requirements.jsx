import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getRequirements, createRequirement, updateRequirement, deleteRequirement,
  getReqChildren, createReqChild,
  getReqComments, createReqComment, deleteReqComment,
  getReqWorklogs, createReqWorklog, deleteReqWorklog,
  getReqAttachments, createReqAttachment, deleteReqAttachment,
  getReqLinks, addReqLink, removeReqLink,
  getSprints, getUsers,
} from '../api';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLOR = {
  Critical: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  High:     { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
  Medium:   { bg: '#fefce8', color: '#ca8a04', border: '#fde047' },
  Low:      { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
};
const STATUS_COLOR = {
  'Open':        { bg: '#eff6ff', color: '#1d4ed8' },
  'In Progress': { bg: '#fef9c3', color: '#a16207' },
  'Review':      { bg: '#fdf4ff', color: '#7e22ce' },
  'Done':        { bg: '#f0fdf4', color: '#15803d' },
};
const inputSt  = { width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };
const labelSt  = { fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 };

// ── Small helpers ─────────────────────────────────────────────────────────────

function Chip({ label, color, bg, border }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: bg, color, border: `1px solid ${border || bg}`, display: 'inline-block' }}>{label}</span>
  );
}

function Avatar({ name, size = 26 }) {
  const initials = name ? name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() : '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials}</div>
  );
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function timeAgo(dt) {
  const diff = Date.now() - new Date(dt);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(dt);
}

// ── Locked tab placeholder ────────────────────────────────────────────────────

function LockedTab({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text3)', gap: 10 }}>
      <span style={{ fontSize: 32 }}>🔒</span>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>Save requirement first</div>
      <div style={{ fontSize: 13 }}>Fill in the Details tab and click "Create" to enable {label}.</div>
    </div>
  );
}

// ── Sub-item inline form (reused inside the modal) ────────────────────────────

function SubItemForm({ reqId, sprints, users, onSaved, onCancel }) {
  const [form, setForm] = useState({ title: '', priority: 'Medium', status: 'Open', assignee: '', sprint: '', description: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    if (!form.title.trim()) return;
    const payload = { ...form, parent: reqId };
    if (!payload.assignee) delete payload.assignee;
    if (!payload.sprint) delete payload.sprint;
    await createReqChild(reqId, payload);
    onSaved();
  };
  return (
    <div style={{ background: 'var(--accent-light)', border: '1.5px solid var(--accent)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>New Sub-Item</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={form.title} onChange={set('title')} placeholder="Sub-item title *" style={inputSt} autoFocus />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <select value={form.priority} onChange={set('priority')} style={inputSt}>
            {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={form.status} onChange={set('status')} style={inputSt}>
            {['Open','In Progress','Review','Done'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={form.assignee} onChange={set('assignee')} style={inputSt}>
            <option value="">Unassigned</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={form.sprint} onChange={set('sprint')} style={inputSt}>
            <option value="">No Sprint</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Description (optional)" style={{ ...inputSt, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={submit} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}>Save Sub-Item</button>
        <button onClick={onCancel} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Unified Requirement Modal ─────────────────────────────────────────────────
// Pass req=null to create a new requirement. All tabs are shown; non-Details tabs
// are locked until the requirement is saved for the first time.

function ReqModal({ open, initialReq = null, onClose, onCreated, onUpdated, onDeleted, sprints, users, allReqs }) {
  const { user } = useAuth();

  // saved requirement (null until created)
  const [req, setReq] = useState(initialReq);

  // Details form state
  const BLANK = { title: '', priority: 'Medium', status: 'Open', assignee: '', sprint: '', description: '', department: '' };
  const [form, setForm] = useState(
    initialReq
      ? { title: initialReq.title, priority: initialReq.priority, status: initialReq.status,
          assignee: initialReq.assignee || '', sprint: initialReq.sprint || '', description: initialReq.description || '', department: initialReq.department || '' }
      : { ...BLANK }
  );
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [detailsBusy,  setDetailsBusy]  = useState(false);

  // Tab & sub-data
  const [tab, setTab]           = useState('details');
  const [children, setChildren] = useState([]);
  const [comments, setComments] = useState([]);
  const [worklogs, setWorklogs] = useState([]);
  const [attachments, setAtt]   = useState([]);
  const [links, setLinks]       = useState([]);

  // sub-item inline form
  const [showSubForm, setShowSubForm] = useState(false);
  // comment
  const [commentText, setCommentText]   = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const commentRef = useRef();
  const [commentBusy, setCommentBusy] = useState(false);
  // worklog
  const [wlForm, setWlForm] = useState({ hours: '', date: new Date().toISOString().slice(0, 10), description: '' });
  const [wlBusy, setWlBusy] = useState(false);
  // links
  const [linkSearch, setLinkSearch] = useState('');
  // attachments
  const fileRef = useRef();
  const [attBusy, setAttBusy] = useState(false);

  // Reset everything when modal opens/closes or initialReq changes
  useEffect(() => {
    if (!open) return;
    setReq(initialReq);
    setForm(initialReq
      ? { title: initialReq.title, priority: initialReq.priority, status: initialReq.status,
          assignee: initialReq.assignee || '', sprint: initialReq.sprint || '', description: initialReq.description || '', department: initialReq.department || '' }
      : { ...BLANK });
    setDetailsDirty(false);
    setTab('details');
    setChildren([]); setComments([]); setWorklogs([]); setAtt([]); setLinks([]);
    setCommentText(''); setLinkSearch(''); setShowSubForm(false);
    if (initialReq) loadAll(initialReq.id);
  }, [open, initialReq?.id]);

  const loadAll = async (id) => {
    const [ch, cm, wl, at, lk] = await Promise.all([
      getReqChildren(id).catch(() => ({ data: [] })),
      getReqComments(id).catch(() => ({ data: [] })),
      getReqWorklogs(id).catch(() => ({ data: [] })),
      getReqAttachments(id).catch(() => ({ data: [] })),
      getReqLinks(id).catch(() => ({ data: [] })),
    ]);
    setChildren(ch.data); setComments(cm.data);
    setWorklogs(wl.data); setAtt(at.data); setLinks(lk.data);
  };

  if (!open) return null;

  const saved = !!req; // true once the requirement has been created/exists
  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setDetailsDirty(true); };

  // ── Save Details ──
  const saveDetails = async () => {
    if (!form.title.trim()) return;
    setDetailsBusy(true);
    try {
      const payload = { ...form };
      if (!payload.assignee) delete payload.assignee;
      if (!payload.sprint) delete payload.sprint;

      if (!saved) {
        const res = await createRequirement(payload);
        setReq(res.data);
        setDetailsDirty(false);
        await loadAll(res.data.id);
        onCreated(res.data);
      } else {
        const res = await updateRequirement(req.id, payload);
        setReq(res.data);
        setDetailsDirty(false);
        onUpdated();
      }
    } finally { setDetailsBusy(false); }
  };

  // ── Comment ──
  const handleCommentInput = (e) => {
    const val = e.target.value;
    setCommentText(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && !val.slice(lastAt + 1).includes(' ')) {
      setMentionQuery(val.slice(lastAt + 1).toLowerCase());
      setShowMentions(true);
    } else { setShowMentions(false); }
  };
  const insertMention = (u) => {
    const lastAt = commentText.lastIndexOf('@');
    setCommentText(commentText.slice(0, lastAt) + `@${u.name} `);
    setShowMentions(false);
    commentRef.current?.focus();
  };
  const filteredMentions = users.filter(u => u.name.toLowerCase().includes(mentionQuery));

  const submitComment = async () => {
    if (!commentText.trim() || !req) return;
    setCommentBusy(true);
    try {
      const res = await createReqComment(req.id, { text: commentText });
      setComments(c => [...c, res.data]);
      setCommentText('');
      onUpdated();
    } finally { setCommentBusy(false); }
  };
  const removeComment = async (cid) => {
    await deleteReqComment(req.id, cid);
    setComments(c => c.filter(x => x.id !== cid));
    onUpdated();
  };

  // ── Work Log ──
  const submitWorklog = async () => {
    if (!wlForm.hours || !wlForm.date || !req) return;
    setWlBusy(true);
    try {
      const res = await createReqWorklog(req.id, { hours: parseFloat(wlForm.hours), date: wlForm.date, description: wlForm.description });
      setWorklogs(w => [res.data, ...w]);
      setWlForm({ hours: '', date: new Date().toISOString().slice(0, 10), description: '' });
      onUpdated();
    } finally { setWlBusy(false); }
  };
  const removeWorklog = async (lid) => {
    await deleteReqWorklog(req.id, lid);
    setWorklogs(w => w.filter(x => x.id !== lid));
    onUpdated();
  };

  // ── Attachments ──
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !req) return;
    const fd = new FormData();
    fd.append('file', file); fd.append('filename', file.name);
    setAttBusy(true);
    try {
      const res = await createReqAttachment(req.id, fd);
      setAtt(a => [res.data, ...a]);
      onUpdated();
    } finally { setAttBusy(false); e.target.value = ''; }
  };
  const removeAttachment = async (aid) => {
    await deleteReqAttachment(req.id, aid);
    setAtt(a => a.filter(x => x.id !== aid));
    onUpdated();
  };

  // ── Links ──
  const linkableReqs = allReqs.filter(r =>
    req && r.id !== req.id && !links.find(l => l.id === r.id) &&
    r.title.toLowerCase().includes(linkSearch.toLowerCase())
  );
  const addLink = async (targetId) => {
    if (!req) return;
    await addReqLink(req.id, targetId);
    const res = await getReqLinks(req.id);
    setLinks(res.data); setLinkSearch('');
    onUpdated();
  };
  const removeLink = async (targetId) => {
    await removeReqLink(req.id, targetId);
    setLinks(l => l.filter(x => x.id !== targetId));
    onUpdated();
  };

  // ── Sub-items ──
  const handleSubSaved = async () => {
    const res = await getReqChildren(req.id);
    setChildren(res.data);
    setShowSubForm(false);
    onUpdated();
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!req) { onClose(); return; }
    await deleteRequirement(req.id);
    onDeleted(req.id);
    onClose();
  };

  const totalHours = worklogs.reduce((s, w) => s + parseFloat(w.hours), 0);
  const pc = req ? (PRIORITY_COLOR[req.priority] || PRIORITY_COLOR.Medium) : PRIORITY_COLOR.Medium;
  const sc = req ? (STATUS_COLOR[req.status]   || STATUS_COLOR['Open'])    : STATUS_COLOR['Open'];

  const TABS = [
    { id: 'details',     label: 'Details',                                          locked: false },
    { id: 'subitems',    label: `Sub-Items${children.length ? ` (${children.length})` : ''}`,       locked: !saved },
    { id: 'worklog',     label: `Work Log${worklogs.length  ? ` (${worklogs.length})`  : ''}`,       locked: !saved },
    { id: 'comments',    label: `Comments${comments.length  ? ` (${comments.length})`  : ''}`,       locked: !saved },
    { id: 'links',       label: `Links${links.length        ? ` (${links.length})`      : ''}`,       locked: !saved },
    { id: 'attachments', label: `Attachments${attachments.length ? ` (${attachments.length})` : ''}`, locked: !saved },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'white', borderRadius: 18,
        width: '86vw', maxWidth: 860,
        height: '86vh', maxHeight: 780,
        boxShadow: '0 24px 80px rgba(0,0,0,.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '18px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {req && <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 3 }}>{req.id}</div>}
              <div style={{ fontSize: 16, fontWeight: 700, color: req ? 'var(--text)' : 'var(--text2)' }}>
                {req ? req.title : '➕ New Requirement'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
              {req && (
                <button onClick={handleDelete}
                  style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: 'var(--red-light)', color: 'var(--red)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600 }}>
                  🗑 Delete
                </button>
              )}
              <button onClick={onClose}
                style={{ padding: '5px 9px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 15, color: 'var(--text2)' }}>
                ✕
              </button>
            </div>
          </div>

          {/* Chips (only when saved) */}
          {req && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <Chip label={req.priority} color={pc.color} bg={pc.bg} border={pc.border} />
              <Chip label={req.status}   color={sc.color} bg={sc.bg} />
              {req.assignee_name && <Chip label={`👤 ${req.assignee_name}`} color="var(--text)"   bg="var(--surface2)" />}
              {req.sprint_name   && <Chip label={`🏃 ${req.sprint_name}`}   color="var(--accent)" bg="var(--accent-light)" />}
              {req.department    && <Chip label={`🏫 ${req.department}`}     color="var(--text2)"  bg="var(--surface2)" />}
            </div>
          )}

          {/* Stats row (only when saved) */}
          {req && (
            <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
              <span>⏱ <b style={{ color: 'var(--text)' }}>{totalHours.toFixed(1)}h</b> logged</span>
              <span>💬 <b style={{ color: 'var(--text)' }}>{comments.length}</b> comments</span>
              <span>📎 <b style={{ color: 'var(--text)' }}>{attachments.length}</b> files</span>
              <span>🔗 <b style={{ color: 'var(--text)' }}>{links.length}</b> linked</span>
              <span>📋 <b style={{ color: 'var(--text)' }}>{children.length}</b> sub-items</span>
            </div>
          )}

          {/* Tab bar */}
          <div style={{ display: 'flex', overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => !t.locked && setTab(t.id)} style={{
                padding: '7px 16px 10px', border: 'none', background: 'none',
                cursor: t.locked ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', fontSize: 12.5,
                fontWeight: tab === t.id ? 700 : 500,
                color: t.locked ? 'var(--text3)' : tab === t.id ? 'var(--accent)' : 'var(--text2)',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                whiteSpace: 'nowrap', opacity: t.locked ? 0.5 : 1,
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* ── Tab body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>

          {/* Details */}
          {tab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!saved && (
                <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>
                  💡 Fill in the details below, then click <b>Create</b> to save and unlock Sub-Items, Work Log, Comments, Links and Attachments.
                </div>
              )}
              <div>
                <label style={labelSt}>Title *</label>
                <input value={form.title} onChange={set('title')} placeholder="Requirement title" style={inputSt} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelSt}>Priority</label>
                  <select value={form.priority} onChange={set('priority')} style={inputSt}>
                    {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>Status</label>
                  <select value={form.status} onChange={set('status')} style={inputSt}>
                    {['Open','In Progress','Review','Done'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelSt}>Assignee</label>
                  <select value={form.assignee} onChange={set('assignee')} style={inputSt}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>Sprint</label>
                  <select value={form.sprint} onChange={set('sprint')} style={inputSt}>
                    <option value="">No Sprint</option>
                    {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelSt}>Description</label>
                <textarea value={form.description} onChange={set('description')} rows={4}
                  placeholder="Describe the requirement…"
                  style={{ ...inputSt, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelSt}>Department</label>
                <select value={form.department} onChange={set('department')} style={inputSt}>
                  <option value="">Select Department</option>
                  {['DSE','DEE','SS','MS','DGE','DPS','Other','Tech Initiatives'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={saveDetails} disabled={detailsBusy || !form.title.trim()}
                  style={{ padding: '9px 24px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, opacity: !form.title.trim() ? .5 : 1 }}>
                  {detailsBusy ? 'Saving…' : saved ? (detailsDirty ? '💾 Save Changes' : '✓ Saved') : '✨ Create'}
                </button>
                {saved && detailsDirty && (
                  <button onClick={() => {
                    setForm({ title: req.title, priority: req.priority, status: req.status, assignee: req.assignee || '', sprint: req.sprint || '', description: req.description || '', department: req.department || '' });
                    setDetailsDirty(false);
                  }} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
                    Discard
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Sub-Items */}
          {tab === 'subitems' && (
            saved ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Sub-Items ({children.length})</div>
                  {!showSubForm && (
                    <button onClick={() => setShowSubForm(true)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>
                      + Add Sub-Item
                    </button>
                  )}
                </div>
                {showSubForm && (
                  <SubItemForm reqId={req.id} sprints={sprints} users={users}
                    onSaved={handleSubSaved} onCancel={() => setShowSubForm(false)} />
                )}
                {children.length === 0 && !showSubForm
                  ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 13 }}>No sub-items yet. Click "+ Add Sub-Item" to create one.</div>
                  : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {children.map(c => {
                        const cpc = PRIORITY_COLOR[c.priority] || PRIORITY_COLOR.Medium;
                        const csc = STATUS_COLOR[c.status]   || STATUS_COLOR['Open'];
                        return (
                          <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${cpc.color}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>{c.id}</span>
                                <Chip label={c.priority} color={cpc.color} bg={cpc.bg} border={cpc.border} />
                                <Chip label={c.status}   color={csc.color} bg={csc.bg} />
                              </div>
                            </div>
                            {c.assignee_name && <Avatar name={c.assignee_name} size={24} />}
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </div>
            ) : <LockedTab label="Sub-Items" />
          )}

          {/* Work Log */}
          {tab === 'worklog' && (
            saved ? (
              <div>
                {/* Form */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Log Hours</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 10, marginBottom: 10, alignItems: 'end' }}>
                    <div>
                      <label style={labelSt}>Hours *</label>
                      <input type="number" min="0.25" step="0.25" value={wlForm.hours}
                        onChange={e => setWlForm(f => ({ ...f, hours: e.target.value }))}
                        placeholder="e.g. 2.5" style={inputSt} />
                    </div>
                    <div>
                      <label style={labelSt}>Date *</label>
                      <input type="date" value={wlForm.date}
                        onChange={e => setWlForm(f => ({ ...f, date: e.target.value }))} style={inputSt} />
                    </div>
                    <div>
                      <label style={labelSt}>Notes</label>
                      <input value={wlForm.description}
                        onChange={e => setWlForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="What did you work on?" style={inputSt} />
                    </div>
                  </div>
                  <button onClick={submitWorklog} disabled={wlBusy}
                    style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}>
                    {wlBusy ? 'Logging…' : '⏱ Log Hours'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1, background: 'var(--accent-light)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: 'var(--accent)' }}>{totalHours.toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>Total Hours</div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace' }}>{worklogs.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>Entries</div>
                  </div>
                </div>

                {worklogs.length === 0
                  ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>No hours logged yet.</div>
                  : worklogs.map(w => (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                      <Avatar name={w.user_name} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{w.user_name}</span>
                          <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--accent)', fontWeight: 700 }}>+{parseFloat(w.hours).toFixed(1)}h</span>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(w.date)}</span>
                        </div>
                        {w.description && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{w.description}</div>}
                      </div>
                      <button onClick={() => removeWorklog(w.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, padding: 4 }}>🗑</button>
                    </div>
                  ))
                }
              </div>
            ) : <LockedTab label="Work Log" />
          )}

          {/* Comments */}
          {tab === 'comments' && (
            saved ? (
              <div>
                {/* Input */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Avatar name={user?.name || '?'} size={32} />
                    <div style={{ flex: 1, position: 'relative' }}>
                      <textarea ref={commentRef} value={commentText} onChange={handleCommentInput}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitComment(); } }}
                        rows={3} placeholder="Write a comment… use @name to mention (Ctrl+Enter to post)"
                        style={{ ...inputSt, resize: 'vertical', padding: '10px 12px' }} />
                      {showMentions && filteredMentions.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)', zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                          {filteredMentions.slice(0, 6).map(u => (
                            <div key={u.id} onClick={() => insertMention(u)}
                              style={{ padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                              <Avatar name={u.name} size={22} />{u.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button onClick={submitComment} disabled={commentBusy || !commentText.trim()}
                      style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, opacity: !commentText.trim() ? .5 : 1 }}>
                      {commentBusy ? 'Posting…' : '💬 Post'}
                    </button>
                  </div>
                </div>

                {comments.length === 0
                  ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>No comments yet.</div>
                  : comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <Avatar name={c.author_name} size={32} />
                      <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{c.author_name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{timeAgo(c.created_at)}</span>
                          <button onClick={() => removeComment(c.id)}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12, padding: 2 }}>🗑</button>
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {c.text.split(/(@[\w ]+?)(?=\s|$|@)/g).map((part, i) =>
                            part.startsWith('@')
                              ? <span key={i} style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 4, padding: '1px 4px', fontWeight: 600, fontSize: 12 }}>{part}</span>
                              : part
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            ) : <LockedTab label="Comments" />
          )}

          {/* Links */}
          {tab === 'links' && (
            saved ? (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ ...labelSt, marginBottom: 8 }}>Link another requirement</label>
                  <div style={{ position: 'relative' }}>
                    <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
                      placeholder="Search by title or ID…" style={inputSt} />
                    {linkSearch && linkableReqs.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)', zIndex: 10, maxHeight: 220, overflowY: 'auto' }}>
                        {linkableReqs.slice(0, 8).map(r => {
                          const rpc = PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.Medium;
                          return (
                            <div key={r.id} onClick={() => addLink(r.id)}
                              style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                              <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>{r.id}</span>
                              <span style={{ flex: 1 }}>{r.title}</span>
                              <Chip label={r.priority} color={rpc.color} bg={rpc.bg} border={rpc.border} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {links.length === 0
                  ? <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>No linked requirements yet.</div>
                  : links.map(l => {
                    const lpc = PRIORITY_COLOR[l.priority] || PRIORITY_COLOR.Medium;
                    const lsc = STATUS_COLOR[l.status]   || STATUS_COLOR['Open'];
                    return (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${lpc.color}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>{l.id}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{l.title}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Chip label={l.priority} color={lpc.color} bg={lpc.bg} border={lpc.border} />
                            <Chip label={l.status}   color={lsc.color} bg={lsc.bg} />
                          </div>
                        </div>
                        <button onClick={() => removeLink(l.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, padding: 4 }}>✕</button>
                      </div>
                    );
                  })
                }
              </div>
            ) : <LockedTab label="Links" />
          )}

          {/* Attachments */}
          {tab === 'attachments' && (
            saved ? (
              <div>
                <input type="file" ref={fileRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                <button onClick={() => fileRef.current?.click()} disabled={attBusy}
                  style={{ width: '100%', padding: 14, borderRadius: 10, border: '2px dashed var(--border)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 18 }}>
                  {attBusy ? '⏳ Uploading…' : '📎 Click to attach a file'}
                </button>
                {attachments.length === 0
                  ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>No attachments yet.</div>
                  : attachments.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                      <span style={{ fontSize: 22 }}>📄</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.file_url
                            ? <a href={a.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{a.filename}</a>
                            : a.filename}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.uploaded_by_name} · {timeAgo(a.created_at)}</div>
                      </div>
                      <button onClick={() => removeAttachment(a.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, padding: 4 }}>🗑</button>
                    </div>
                  ))
                }
              </div>
            ) : <LockedTab label="Attachments" />
          )}

        </div>{/* end tab body */}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Requirements() {
  const [reqs, setReqs]                     = useState([]);
  const [sprints, setSprints]               = useState([]);
  const [users, setUsers]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Single modal state: null = closed, object = open (null req = new, req object = edit/view)
  const [modal, setModal] = useState(null); // { req: null | reqObj }

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, s, u] = await Promise.all([getRequirements(), getSprints(), getUsers()]);
      setReqs(r.data); setSprints(s.data); setUsers(u.data);
    } finally { setLoading(false); }
  };

  const refresh = async (currentReqId) => {
    const r = await getRequirements();
    setReqs(r.data);
    // keep modal's req in sync
    if (modal && currentReqId) {
      const updated = r.data.find(x => x.id === currentReqId);
      if (updated) setModal({ req: updated });
    }
  };

  const handleCreated = async (newReq) => {
    // update list + keep modal open on the new req
    const r = await getRequirements();
    setReqs(r.data);
    setModal({ req: newReq });
  };

  const handleDeleted = async (id) => {
    setModal(null);
    const r = await getRequirements();
    setReqs(r.data);
  };

  const filtered = reqs.filter(r => {
    if (r.parent) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus   && r.status   !== filterStatus)   return false;
    if (filterPriority && r.priority !== filterPriority) return false;
    return true;
  });

  const totalH   = reqs.reduce((s, r) => s + (r.total_logged_hours || 0), 0);
  const byStatus = (s) => reqs.filter(r => r.status === s).length;

  return (
    <div style={{ padding: '24px 28px', flex: 1 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Total',        val: reqs.length,             color: 'var(--text)' },
          { label: 'Open',         val: byStatus('Open'),         color: '#1d4ed8' },
          { label: 'In Progress',  val: byStatus('In Progress'),  color: '#a16207' },
          { label: 'Review',       val: byStatus('Review'),       color: '#7e22ce' },
          { label: 'Hours Logged', val: totalH.toFixed(1) + 'h', color: 'var(--accent)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requirements…"
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All Statuses</option>
          {['Open','In Progress','Review','Done'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          style={{ padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All Priorities</option>
          {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
        </select>
        <button onClick={() => setModal({ req: null })}
          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}>
          + New Requirement
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text2)' }}>Loading requirements…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text3)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No requirements found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Click "+ New Requirement" to get started.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(r => {
            const pc = PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.Medium;
            const sc = STATUS_COLOR[r.status]   || STATUS_COLOR['Open'];
            return (
              <div key={r.id} onClick={() => setModal({ req: r })}
                style={{ background: 'white', border: '1px solid var(--border)', borderLeft: `4px solid ${pc.color}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'box-shadow .15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', flexShrink: 0 }}>{r.id}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>{r.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip label={r.priority} color={pc.color} bg={pc.bg} border={pc.border} />
                      <Chip label={r.status}   color={sc.color} bg={sc.bg} />
                      {r.assignee_name && <span style={{ fontSize: 11, color: 'var(--text2)' }}>👤 {r.assignee_name}</span>}
                      {r.sprint_name   && <span style={{ fontSize: 11, color: 'var(--text2)' }}>🏃 {r.sprint_name}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {r.children_count > 0    && <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>📋 {r.children_count}</span>}
                    {r.total_logged_hours > 0 && <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-light)', borderRadius: 20, padding: '2px 8px' }}>⏱ {parseFloat(r.total_logged_hours).toFixed(1)}h</span>}
                    {r.comment_count > 0     && <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>💬 {r.comment_count}</span>}
                    {r.attachment_count > 0  && <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>📎 {r.attachment_count}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single unified modal */}
      {modal && (
        <ReqModal
          open={true}
          initialReq={modal.req}
          onClose={() => setModal(null)}
          onCreated={handleCreated}
          onUpdated={() => refresh(modal.req?.id)}
          onDeleted={handleDeleted}
          sprints={sprints}
          users={users}
          allReqs={reqs}
        />
      )}
    </div>
  );
}
