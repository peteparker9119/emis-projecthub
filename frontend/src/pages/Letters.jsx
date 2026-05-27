import { useState, useEffect } from 'react';
import { getUsers } from '../api';
import Modal from '../components/Modal';

const ICONS = { Approval: '✅', Circular: '📢', Notice: '⚠️', Memo: '📝' };
const BGC = { Approval: 'var(--green-light)', Circular: 'var(--accent-light)', Notice: 'var(--amber-light)', Memo: 'var(--surface2)' };
const TYPE_BORDER = { Approval: 'var(--green)', Circular: 'var(--accent)', Notice: 'var(--amber)', Memo: 'var(--text3)' };
const STATUS_BADGE = { Sent: 'badge-green', Draft: 'badge-gray' };

let ltrCtr = 0;

function loadLetters() {
  try {
    const stored = JSON.parse(localStorage.getItem('emisLetters') || '[]');
    ltrCtr = stored.reduce((max, l) => {
      const n = parseInt((l.id || '').replace('LTR-', '')) || 0;
      return Math.max(max, n);
    }, 0);
    return stored;
  } catch { return []; }
}

export default function Letters() {
  const [letters, setLetters] = useState(loadLetters);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [typeF, setTypeF] = useState('');
  const [composing, setComposing] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState({ type: 'Approval', subject: '', to: 'All Teams', priority: 'Normal', ref: '', content: '' });

  useEffect(() => { getUsers().then(r => setUsers(r.data)).catch(console.error); }, []);

  const save = (ls) => {
    setLetters(ls);
    localStorage.setItem('emisLetters', JSON.stringify(ls));
  };

  const openCompose = () => {
    setForm({
      type: 'Approval',
      subject: '',
      to: 'All Teams',
      priority: 'Normal',
      ref: `TNEMIS/CTO/2025/${String(letters.length + 1).padStart(3, '0')}`,
      content: '',
    });
    setComposing(true);
  };

  const submit = (status) => {
    if (!form.subject.trim()) return;
    ltrCtr++;
    const letter = {
      id: `LTR-${String(ltrCtr).padStart(3, '0')}`,
      ...form,
      status,
      date: new Date().toISOString().split('T')[0],
    };
    save([letter, ...letters]);
    setComposing(false);
  };

  const sendById = (id) => {
    save(letters.map(l => l.id === id ? { ...l, status: 'Sent' } : l));
  };

  const filtered = letters.filter(l => {
    if (search && !l.subject.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeF && l.type !== typeF) return false;
    return true;
  });

  const ltrStats = [
    { val: letters.length, label: 'Total', color: 'var(--accent)' },
    { val: letters.filter(l => l.status === 'Sent').length, label: 'Sent', color: 'var(--green)' },
    { val: letters.filter(l => l.status === 'Draft' || l.status === 'Pending').length, label: 'Pending / Draft', color: 'var(--amber)' },
    { val: letters.filter(l => l.priority === 'Urgent').length, label: 'Urgent', color: 'var(--red)' },
  ];

  return (
    <div className="page-content">
      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <div className="letter-stats">
        {ltrStats.map(s => (
          <div key={s.label} className="letter-stat">
            <div className="letter-stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="letter-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <div className="search-wrap">
          <input className="search-input" placeholder="Search letters…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={typeF} onChange={e => setTypeF(e.target.value)}>
          <option value="">All Types</option>
          <option>Approval</option>
          <option>Circular</option>
          <option>Notice</option>
          <option>Memo</option>
        </select>
        <button className="btn btn-accent" style={{ marginLeft: 'auto' }} onClick={openCompose}>✉️ Compose</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">✉️</div>
          <div className="empty-text">No letters yet</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>Compose your first letter above</div>
        </div>
      ) : (
        filtered.map(l => (
          <div key={l.id} className="letter-card" style={{ borderLeft: `4px solid ${TYPE_BORDER[l.type] || 'var(--border)'}` }}>
            <div className="letter-icon" style={{ background: BGC[l.type] || 'var(--surface2)' }}>
              {ICONS[l.type] || '📄'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{l.subject}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`badge ${STATUS_BADGE[l.status] || 'badge-gray'}`}>{l.status}</span>
                <span className="badge badge-blue">{l.type}</span>
                {l.priority !== 'Normal' && <span className="badge badge-red">{l.priority}</span>}
                <span>To: <b>{l.to}</b></span>
                <span>{l.date}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 5 }}>
                {l.content ? l.content.substring(0, 100) + '…' : <em>No content</em>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setViewing(l)}>👁 View</button>
              {l.status === 'Draft' && (
                <button className="btn btn-accent btn-sm" onClick={() => sendById(l.id)}>📤 Send</button>
              )}
            </div>
          </div>
        ))
      )}

      {/* Compose Modal */}
      <Modal open={composing} onClose={() => setComposing(false)} title="✉️ Compose Letter">
        <div className="form-row">
          <div className="form-group">
            <label>Type</label>
            <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option>Approval</option>
              <option>Circular</option>
              <option>Notice</option>
              <option>Memo</option>
            </select>
            <span className="field-hint">Approval — for sign-off requests; Circular — broadcast to all; Notice — official announcements; Memo — internal notes.</span>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option>Normal</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
            <span className="field-hint">Urgent letters are flagged prominently for immediate attention.</span>
          </div>
        </div>
        <div className="form-group">
          <label>Subject</label>
          <input className="form-control" placeholder="Letter subject…" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />

        </div>
        <div className="form-row">
          <div className="form-group">
            <label>To</label>
            <select className="form-control" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))}>
              <option>All Teams</option>
              {users.map(u => <option key={u.id}>{u.name}</option>)}
            </select>
            <span className="field-hint">Select a specific recipient or "All Teams" to broadcast to everyone.</span>
          </div>
          <div className="form-group">
            <label>Reference No.</label>
            <input className="form-control" value={form.ref} onChange={e => setForm(f => ({ ...f, ref: e.target.value }))} />
            <span className="field-hint">Optional internal reference number for tracking. E.g. "LTR-2026-045".</span>
          </div>
        </div>
        <div className="form-group">
          <label>Content</label>
          <textarea className="form-control" rows={5} placeholder="Letter body…" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          <span className="field-hint">Write the full body of the letter. Use formal language for Approvals and Notices.</span>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => submit('Draft')}>💾 Save Draft</button>
          <button className="btn btn-accent" onClick={() => submit('Sent')}>📤 Send Letter</button>
        </div>
      </Modal>

      {/* View Modal */}
      {viewing && (
        <Modal open={!!viewing} onClose={() => setViewing(null)} title={`✉️ ${viewing.subject}`}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <span className={`badge ${STATUS_BADGE[viewing.status] || 'badge-gray'}`}>{viewing.status}</span>
            <span className="badge badge-blue">{viewing.type}</span>
            {viewing.priority !== 'Normal' && <span className="badge badge-red">{viewing.priority}</span>}
          </div>
          {[['To', viewing.to], ['Date', viewing.date], ['Ref', viewing.ref]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 60, fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{k}</div>
              <div style={{ fontSize: 13 }}>{v}</div>
            </div>
          ))}
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, fontSize: 13, lineHeight: 1.7, marginTop: 10, whiteSpace: 'pre-wrap' }}>
            {viewing.content || <em style={{ color: 'var(--text3)' }}>No content</em>}
          </div>
        </Modal>
      )}
    </div>
  );
}
