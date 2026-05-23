import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getRequirements, createRequirement, updateRequirement, deleteRequirement,
  getReqChildren, createReqChild,
  getReqComments, createReqComment, deleteReqComment,
  getReqWorklogs, createReqWorklog, deleteReqWorklog,
  getReqAttachments, createReqAttachment, deleteReqAttachment,
  getReqLinks, addReqLink, removeReqLink,
  getSprints, getUsers, notifyBreaches,
} from '../api';

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEM_TYPES = ['REQ','Bug','Task','QA','Report','TI','Spike','Adhoc'];

const ITEM_TYPE_COLOR = {
  REQ:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Bug:    { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  Task:   { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
  QA:     { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  Report: { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
  TI:     { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7' },
  Spike:  { bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  Adhoc:  { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
};

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

const TIMER_CONFIG = {
  done:     { bg: '#f0fdf4', color: '#15803d', border: '#86efac', label: 'Done',     icon: '✅' },
  on_track: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'On Track', icon: '⏱' },
  at_risk:  { bg: '#fff7ed', color: '#ea580c', border: '#fdba74', label: 'At Risk',  icon: '⚠️' },
  breached: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', label: 'Breached', icon: '🚨' },
  pending:  { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'No Dates', icon: '📅' },
};

const inputSt = { width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };
const labelSt = { fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 };

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

// ── Timer Badge ───────────────────────────────────────────────────────────────

function TimerBadge({ timerStatus, daysRemaining, endDate, inline = false }) {
  if (!timerStatus || timerStatus === 'pending') return null;
  const cfg = TIMER_CONFIG[timerStatus] || TIMER_CONFIG.pending;

  const label =
    timerStatus === 'done'     ? 'Done' :
    timerStatus === 'breached' ? `${Math.abs(daysRemaining)}d over` :
    daysRemaining === 0        ? 'Due today' :
    daysRemaining === 1        ? '1d left' :
    `${daysRemaining}d left`;

  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: inline ? '2px 7px' : '3px 9px',
      borderRadius: 20, background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`, display: 'inline-flex', alignItems: 'center', gap: 3,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {cfg.icon} {label}
    </span>
  );
}

// Progress bar used inside the modal
function TimerProgress({ req }) {
  if (!req.start_date || !req.end_date) return null;
  const start = new Date(req.start_date);
  const end   = new Date(req.end_date);
  const today = new Date();
  const total = Math.max(1, (end - start) / 86400000);
  const elapsed = Math.min(total, Math.max(0, (today - start) / 86400000));
  const pct = Math.round((elapsed / total) * 100);
  const cfg = TIMER_CONFIG[req.timer_status] || TIMER_CONFIG.pending;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
        <span>📅 {formatDate(req.start_date)}</span>
        <span style={{ fontWeight: 700, color: cfg.color }}>{cfg.icon} {cfg.label}</span>
        <span>🏁 {formatDate(req.end_date)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 3, transition: 'width .4s' }} />
      </div>
      {req.story_points && (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
          Story Points: <b style={{ color: 'var(--text)' }}>{req.story_points} SP</b>
        </div>
      )}
    </div>
  );
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

// ── Sub-item inline form ──────────────────────────────────────────────────────

function SubItemForm({ reqId, sprints, users, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: '', priority: 'Medium', status: 'Open',
    assignee: '', sprint: '', description: '',
    item_type: 'Task', start_date: '', end_date: '', story_points: '',
  });
  const [err, setErr] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim()) return;
    if (!form.start_date || !form.end_date) { setErr('Start date and end date are mandatory.'); return; }
    if (new Date(form.end_date) < new Date(form.start_date)) { setErr('End date must be after start date.'); return; }
    setErr('');
    const payload = { ...form, parent: reqId };
    if (!payload.assignee) delete payload.assignee;
    if (!payload.sprint) delete payload.sprint;
    if (!payload.story_points) delete payload.story_points;
    await createReqChild(reqId, payload);
    onSaved();
  };

  return (
    <div style={{ background: 'var(--accent-light)', border: '1.5px solid var(--accent)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>New Sub-Item</div>
      {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{err}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={form.title} onChange={set('title')} placeholder="Sub-item title *" style={inputSt} autoFocus />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <select value={form.item_type} onChange={set('item_type')} style={inputSt}>
            {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={form.priority} onChange={set('priority')} style={inputSt}>
            {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={form.status} onChange={set('status')} style={inputSt}>
            {['Open','In Progress','Review','Done'].map(s => <option key={s}>{s}</option>)}
          </select>
          <input type="number" min="1" max="99" value={form.story_points} onChange={set('story_points')} placeholder="Story Pts" style={inputSt} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={labelSt}>Start Date *</label>
            <input type="date" value={form.start_date} onChange={set('start_date')} style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>End Date *</label>
            <input type="date" value={form.end_date} onChange={set('end_date')} style={inputSt} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

function ReqModal({ open, initialReq = null, onClose, onCreated, onUpdated, onDeleted, sprints, users, allReqs }) {
  const { user } = useAuth();

  const [req, setReq] = useState(initialReq);

  const BLANK = {
    title: '', item_type: 'REQ', priority: 'Medium', status: 'Open',
    assignee: '', sprint: '', description: '', department: '',
    start_date: '', end_date: '', story_points: '',
  };
  const fromReq = (r) => ({
    title: r.title, item_type: r.item_type || 'REQ',
    priority: r.priority, status: r.status,
    assignee: r.assignee || '', sprint: r.sprint || '',
    description: r.description || '', department: r.department || '',
    start_date: r.start_date || '', end_date: r.end_date || '',
    story_points: r.story_points != null ? String(r.story_points) : '',
  });

  const [form, setForm]           = useState(initialReq ? fromReq(initialReq) : { ...BLANK });
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [detailsBusy,  setDetailsBusy]  = useState(false);
  const [detailsErr,   setDetailsErr]   = useState('');

  const [tab, setTab]           = useState('details');
  const [children, setChildren] = useState([]);
  const [comments, setComments] = useState([]);
  const [worklogs, setWorklogs] = useState([]);
  const [attachments, setAtt]   = useState([]);
  const [links, setLinks]       = useState([]);

  const [showSubForm, setShowSubForm] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const commentRef = useRef();
  const [commentBusy, setCommentBusy] = useState(false);
  const [wlForm, setWlForm] = useState({ hours: '', date: new Date().toISOString().slice(0, 10), description: '' });
  const [wlBusy, setWlBusy] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const fileRef = useRef();
  const [attBusy, setAttBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReq(initialReq);
    setForm(initialReq ? fromReq(initialReq) : { ...BLANK });
    setDetailsDirty(false);
    setDetailsErr('');
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

  const saved = !!req;
  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setDetailsDirty(true); };

  const validateDates = () => {
    if (!form.start_date || !form.end_date) return 'Start date and end date are mandatory.';
    if (new Date(form.end_date) < new Date(form.start_date)) return 'End date must be after start date.';
    return '';
  };

  const saveDetails = async () => {
    if (!form.title.trim()) return;
    const dateErr = validateDates();
    if (dateErr) { setDetailsErr(dateErr); return; }
    setDetailsErr('');
    setDetailsBusy(true);
    try {
      const payload = { ...form };
      if (!payload.assignee) delete payload.assignee;
      if (!payload.sprint) delete payload.sprint;
      if (!payload.story_points) delete payload.story_points;
      else payload.story_points = parseInt(payload.story_points, 10);

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

  const handleSubSaved = async () => {
    const res = await getReqChildren(req.id);
    setChildren(res.data);
    setShowSubForm(false);
    onUpdated();
  };

  const handleDelete = async () => {
    if (!req) { onClose(); return; }
    await deleteRequirement(req.id);
    onDeleted(req.id);
    onClose();
  };

  const totalHours = worklogs.reduce((s, w) => s + parseFloat(w.hours), 0);
  const pc = req ? (PRIORITY_COLOR[req.priority] || PRIORITY_COLOR.Medium) : PRIORITY_COLOR.Medium;
  const sc = req ? (STATUS_COLOR[req.status]   || STATUS_COLOR['Open'])    : STATUS_COLOR['Open'];
  const itc = req ? (ITEM_TYPE_COLOR[req.item_type] || ITEM_TYPE_COLOR.REQ) : ITEM_TYPE_COLOR.REQ;

  const TABS = [
    { id: 'details',     label: 'Details',                                                           locked: false },
    { id: 'subitems',    label: `Sub-Items${children.length    ? ` (${children.length})`    : ''}`, locked: !saved },
    { id: 'worklog',     label: `Work Log${worklogs.length     ? ` (${worklogs.length})`    : ''}`, locked: !saved },
    { id: 'comments',    label: `Comments${comments.length     ? ` (${comments.length})`    : ''}`, locked: !saved },
    { id: 'links',       label: `Links${links.length           ? ` (${links.length})`        : ''}`, locked: !saved },
    { id: 'attachments', label: `Files${attachments.length     ? ` (${attachments.length})`  : ''}`, locked: !saved },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'white', borderRadius: 18,
        width: '88vw', maxWidth: 900,
        height: '88vh', maxHeight: 820,
        boxShadow: '0 24px 80px rgba(0,0,0,.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '18px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {req && <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 3 }}>{req.id}</div>}
              <div style={{ fontSize: 16, fontWeight: 700, color: req ? 'var(--text)' : 'var(--text2)' }}>
                {req ? req.title : '➕ New Item'}
              </div>
            </div>
            {/* Timer badge top-right for saved items */}
            {req && req.timer_status && (
              <TimerBadge timerStatus={req.timer_status} daysRemaining={req.days_remaining} endDate={req.end_date} />
            )}
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

          {req && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <Chip label={req.item_type || 'REQ'} color={itc.color} bg={itc.bg} border={itc.border} />
              <Chip label={req.priority}            color={pc.color}  bg={pc.bg}  border={pc.border} />
              <Chip label={req.status}              color={sc.color}  bg={sc.bg} />
              {req.assignee_name && <Chip label={`👤 ${req.assignee_name}`} color="var(--text)"   bg="var(--surface2)" />}
              {req.sprint_name   && <Chip label={`🏃 ${req.sprint_name}`}   color="var(--accent)" bg="var(--accent-light)" />}
              {req.department    && <Chip label={`🏫 ${req.department}`}     color="var(--text2)"  bg="var(--surface2)" />}
              {req.story_points  && <Chip label={`${req.story_points} SP`}   color="#7c3aed"       bg="#f5f3ff" border="#ddd6fe" />}
            </div>
          )}

          {req && (req.start_date || req.end_date) && (
            <div style={{ marginBottom: 10 }}>
              <TimerProgress req={req} />
            </div>
          )}

          {req && (
            <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
              <span>⏱ <b style={{ color: 'var(--text)' }}>{totalHours.toFixed(1)}h</b> logged</span>
              <span>💬 <b style={{ color: 'var(--text)' }}>{comments.length}</b> comments</span>
              <span>📎 <b style={{ color: 'var(--text)' }}>{attachments.length}</b> files</span>
              <span>🔗 <b style={{ color: 'var(--text)' }}>{links.length}</b> linked</span>
              <span>📋 <b style={{ color: 'var(--text)' }}>{children.length}</b> sub-items</span>
            </div>
          )}

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
                  💡 Fill in the details below, then click <b>Create</b> to save and unlock all tabs.
                </div>
              )}
              {detailsErr && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#dc2626', fontWeight: 600 }}>
                  ⚠️ {detailsErr}
                </div>
              )}
              <div>
                <label style={labelSt}>Title *</label>
                <input value={form.title} onChange={set('title')} placeholder="Item title" style={inputSt} autoFocus />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelSt}>Item Type</label>
                  <select value={form.item_type} onChange={set('item_type')} style={inputSt}>
                    {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
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

              {/* Date range + story points — MANDATORY */}
              <div style={{ background: '#fafafa', border: '1.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 10 }}>⏱ Timeline &amp; Estimation <span style={{ color: '#dc2626' }}>*</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelSt}>Start Date <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="date" value={form.start_date} onChange={set('start_date')} style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>End Date <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="date" value={form.end_date} onChange={set('end_date')} style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>Story Points</label>
                    <input type="number" min="1" max="99" value={form.story_points} onChange={set('story_points')} placeholder="e.g. 5" style={inputSt} />
                  </div>
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
                  placeholder="Describe the item…"
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
                  <button onClick={() => { setForm(fromReq(req)); setDetailsDirty(false); setDetailsErr(''); }}
                    style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
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
                        const cpc  = PRIORITY_COLOR[c.priority]   || PRIORITY_COLOR.Medium;
                        const csc  = STATUS_COLOR[c.status]       || STATUS_COLOR['Open'];
                        const citc = ITEM_TYPE_COLOR[c.item_type] || ITEM_TYPE_COLOR.REQ;
                        return (
                          <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${cpc.color}`, borderRadius: 10, padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>{c.id}</span>
                                  <Chip label={c.item_type || 'REQ'} color={citc.color} bg={citc.bg} border={citc.border} />
                                  <Chip label={c.priority}           color={cpc.color}  bg={cpc.bg}  border={cpc.border} />
                                  <Chip label={c.status}             color={csc.color}  bg={csc.bg} />
                                  {c.story_points && <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>{c.story_points}SP</span>}
                                </div>
                              </div>
                              <TimerBadge timerStatus={c.timer_status} daysRemaining={c.days_remaining} inline />
                              {c.assignee_name && <Avatar name={c.assignee_name} size={24} />}
                            </div>
                            {(c.start_date || c.end_date) && (
                              <div style={{ marginTop: 8 }}>
                                <TimerProgress req={c} />
                              </div>
                            )}
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
                  <label style={{ ...labelSt, marginBottom: 8 }}>Link another item</label>
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
                  ? <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>No linked items yet.</div>
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

        </div>
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
  const [filterType, setFilterType]         = useState('');

  const [modal, setModal] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [dragId,   setDragId]   = useState(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    loadData();
    // Check for newly breached items and notify SM (silent background call)
    notifyBreaches().catch(() => {});
  }, []);

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
    if (modal && currentReqId) {
      const updated = r.data.find(x => x.id === currentReqId);
      if (updated) setModal({ req: updated });
    }
    // Re-check breaches after any update
    notifyBreaches().catch(() => {});
  };

  const handleCreated = async (newReq) => {
    const r = await getRequirements();
    setReqs(r.data);
    setModal({ req: newReq });
  };

  const handleDeleted = async () => {
    setModal(null);
    const r = await getRequirements();
    setReqs(r.data);
  };

  const filtered = reqs.filter(r => {
    if (r.parent) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus   && r.status    !== filterStatus)   return false;
    if (filterPriority && r.priority  !== filterPriority) return false;
    if (filterType     && r.item_type !== filterType)     return false;
    return true;
  });

  const totalH   = reqs.filter(r => !r.parent).reduce((s, r) => s + (r.total_logged_hours || 0), 0);
  const byStatus = (s) => reqs.filter(r => !r.parent && r.status === s).length;
  const breachedCount = reqs.filter(r => !r.parent && r.timer_status === 'breached').length;

  return (
    <div style={{ padding: '24px 28px', flex: 1 }}>
      {/* Stats */}
      <div className="anim-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Total',       val: reqs.filter(r => !r.parent).length, color: 'var(--text)' },
          { label: 'Open',        val: byStatus('Open'),                    color: '#1d4ed8' },
          { label: 'In Progress', val: byStatus('In Progress'),             color: '#a16207' },
          { label: 'Review',      val: byStatus('Review'),                  color: '#7e22ce' },
          { label: 'Hours',       val: totalH.toFixed(1) + 'h',            color: 'var(--accent)' },
          { label: 'Breached',    val: breachedCount,                       color: '#dc2626' },
        ].map(s => (
          <div key={s.label} className="card-lift" style={{ background: 'white', border: `1px solid ${s.label === 'Breached' && s.val > 0 ? '#fca5a5' : 'var(--border)'}`, borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All Types</option>
          {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
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
          + New Item
        </button>
        {/* View toggle: list / board */}
        <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            style={{ padding: '7px 12px', border: 'none', background: viewMode === 'list' ? 'var(--accent)' : 'white', color: viewMode === 'list' ? 'white' : 'var(--text2)', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit', borderRight: '1px solid var(--border)' }}
          >☰</button>
          <button
            onClick={() => setViewMode('board')}
            title="Board view"
            style={{ padding: '7px 12px', border: 'none', background: viewMode === 'board' ? 'var(--accent)' : 'white', color: viewMode === 'board' ? 'white' : 'var(--text2)', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }}
          >⊞</button>
        </div>
      </div>

      {/* List / Board */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text2)' }}>Loading…</div>
      ) : viewMode === 'list' ? (
        filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>No items found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Click "+ New Item" to get started.</div>
          </div>
        ) : (
          <div className="anim-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(r => {
              const pc  = PRIORITY_COLOR[r.priority]   || PRIORITY_COLOR.Medium;
              const sc  = STATUS_COLOR[r.status]        || STATUS_COLOR['Open'];
              const itc = ITEM_TYPE_COLOR[r.item_type]  || ITEM_TYPE_COLOR.REQ;
              return (
                <div key={r.id} onClick={() => setModal({ req: r })}
                  className="card-lift"
                  style={{
                    background: 'white',
                    border: `1px solid ${r.timer_status === 'breached' ? '#fca5a5' : 'var(--border)'}`,
                    borderLeft: `4px solid ${pc.color}`,
                    borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', flexShrink: 0 }}>{r.id}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>{r.title}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip label={r.item_type || 'REQ'} color={itc.color} bg={itc.bg} border={itc.border} />
                        <Chip label={r.priority}            color={pc.color}  bg={pc.bg}  border={pc.border} />
                        <Chip label={r.status}              color={sc.color}  bg={sc.bg} />
                        {r.assignee_name && <span style={{ fontSize: 11, color: 'var(--text2)' }}>👤 {r.assignee_name}</span>}
                        {r.sprint_name   && <span style={{ fontSize: 11, color: 'var(--text2)' }}>🏃 {r.sprint_name}</span>}
                        {r.story_points  && <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>{r.story_points} SP</span>}
                      </div>
                      {r.end_date && (
                        <div style={{ marginTop: 6 }}>
                          <TimerProgress req={r} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                      <TimerBadge timerStatus={r.timer_status} daysRemaining={r.days_remaining} endDate={r.end_date} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        {r.children_count > 0    && <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>📋 {r.children_count}</span>}
                        {r.total_logged_hours > 0 && <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-light)', borderRadius: 20, padding: '2px 8px' }}>⏱ {parseFloat(r.total_logged_hours).toFixed(1)}h</span>}
                        {r.comment_count > 0     && <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>💬 {r.comment_count}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ── Kanban Board View ── */
        (() => {
          // Board uses all filters EXCEPT status (columns segment by status)
          const boardItems = reqs.filter(r => {
            if (r.parent) return false;
            if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterPriority && r.priority  !== filterPriority) return false;
            if (filterType     && r.item_type !== filterType)     return false;
            return true;
          });

          const COLUMNS = [
            { status: 'Open',        label: 'Open',        headerBg: '#dbeafe', headerColor: '#1e40af', borderColor: '#93c5fd' },
            { status: 'In Progress', label: 'In Progress', headerBg: '#fef9c3', headerColor: '#854d0e', borderColor: '#fde047' },
            { status: 'Review',      label: 'Review',      headerBg: '#f3e8ff', headerColor: '#6b21a8', borderColor: '#d8b4fe' },
            { status: 'Done',        label: 'Done',        headerBg: '#dcfce7', headerColor: '#15803d', borderColor: '#86efac' },
          ];

          const handleDrop = async (colStatus) => {
            if (!dragId || dragId === colStatus) return;
            const item = reqs.find(r => r.id === dragId);
            if (!item || item.status === colStatus) { setDragId(null); setDragOver(null); return; }
            try {
              await updateRequirement(dragId, { status: colStatus });
              await refresh();
            } catch {}
            setDragId(null);
            setDragOver(null);
          };

          return (
            <div className="anim-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
              {COLUMNS.map(col => {
                const colItems = boardItems.filter(r => r.status === col.status);
                const isOver = dragOver === col.status;
                return (
                  <div
                    key={col.status}
                    onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
                    onDragEnter={e => { e.preventDefault(); setDragOver(col.status); }}
                    onDragLeave={e => {
                      // Only clear if leaving the column container entirely
                      if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null);
                    }}
                    onDrop={e => { e.preventDefault(); handleDrop(col.status); }}
                    style={{
                      background: isOver ? col.headerBg : 'var(--surface)',
                      border: `2px solid ${isOver ? col.borderColor : 'var(--border)'}`,
                      borderRadius: 14,
                      minHeight: 200,
                      transition: 'border-color .15s, background .15s',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Column header */}
                    <div style={{ background: col.headerBg, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: col.headerColor }}>{col.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: col.headerColor, background: 'rgba(255,255,255,.6)', borderRadius: 20, padding: '2px 8px' }}>{colItems.length}</span>
                    </div>

                    {/* Cards */}
                    <div className="anim-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 10px 12px' }}>
                      {colItems.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 12, fontStyle: 'italic' }}>
                          {isOver ? '⬇ Drop here' : 'No items'}
                        </div>
                      )}
                      {colItems.map(r => {
                        const pc  = PRIORITY_COLOR[r.priority]   || PRIORITY_COLOR.Medium;
                        const itc = ITEM_TYPE_COLOR[r.item_type] || ITEM_TYPE_COLOR.REQ;
                        const isDragging = dragId === r.id;
                        return (
                          <div
                            key={r.id}
                            draggable
                            onDragStart={() => setDragId(r.id)}
                            onDragEnd={() => { setDragId(null); setDragOver(null); }}
                            onClick={() => setModal({ req: r })}
                            className="card-lift"
                            style={{
                              background: isDragging ? '#f1f5f9' : 'white',
                              border: `1px solid ${r.timer_status === 'breached' ? '#fca5a5' : 'var(--border)'}`,
                              borderLeft: `3px solid ${pc.color}`,
                              borderRadius: 10,
                              padding: '10px 12px',
                              cursor: isDragging ? 'grabbing' : 'grab',
                              opacity: isDragging ? 0.45 : 1,
                              transition: 'opacity .15s',
                              userSelect: 'none',
                            }}
                          >
                            {/* ID + timer badge row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 6 }}>
                              <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.id}</span>
                              <TimerBadge timerStatus={r.timer_status} daysRemaining={r.days_remaining} endDate={r.end_date} inline />
                            </div>

                            {/* Title */}
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {r.title}
                            </div>

                            {/* Chips row */}
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                              <Chip label={r.item_type || 'REQ'} color={itc.color} bg={itc.bg} border={itc.border} />
                              <Chip label={r.priority}            color={pc.color}  bg={pc.bg}  border={pc.border} />
                              {r.story_points && <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>{r.story_points}SP</span>}
                            </div>

                            {/* Assignee + counters */}
                            {(r.assignee_name || r.children_count > 0 || r.comment_count > 0) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                                {r.assignee_name && (
                                  <span style={{ fontSize: 10.5, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <Avatar name={r.assignee_name} size={18} />
                                    <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.assignee_name.split(' ')[0]}</span>
                                  </span>
                                )}
                                {r.children_count > 0 && <span style={{ fontSize: 10, color: 'var(--text3)' }}>📋 {r.children_count}</span>}
                                {r.comment_count  > 0 && <span style={{ fontSize: 10, color: 'var(--text3)' }}>💬 {r.comment_count}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}

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
