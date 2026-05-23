import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getScrumDashboard, getSprints, getRequirements, getUsers,
  pullReqToSprint, bulkPullToSprint,
  createStandup,
  getBreachedItems, createNotification,
} from '../api';

// ── Palette ──────────────────────────────────────────────────────────────────
const GSTATUS = {
  pending:           { label: 'Pending',             bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db', icon: '📝' },
  attachments_ready: { label: 'Attachments Ready',   bg: '#fffbeb', color: '#92400e', border: '#fcd34d', icon: '📎' },
  tl_reviewed:       { label: 'TL Reviewed',         bg: '#eff6ff', color: '#1e40af', border: '#93c5fd', icon: '👔' },
  ready_for_sprint:  { label: 'Ready for Sprint',    bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', icon: '🚀' },
};

const PRIORITY_COLORS = {
  Critical: { bg: '#fef2f2', color: '#dc2626' },
  High:     { bg: '#fff7ed', color: '#ea580c' },
  Medium:   { bg: '#fefce8', color: '#ca8a04' },
  Low:      { bg: '#f0fdf4', color: '#16a34a' },
};

const BREACH_TYPE_ICON = { task: '✅', requirement: '📋', bug: '🐛', sprint: '🏃' };

// ── Small helpers ─────────────────────────────────────────────────────────────
function Avatar({ initials, size = 36, bg = 'linear-gradient(135deg,#1a56db,#0d9488)' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * .36, fontWeight: 700, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function Pill({ label, bg, color }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: bg, color }}>{label}</span>;
}

function StatCard({ icon, label, value, color = '#1a56db', sub }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, margin: '4px 0 2px' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Standup Modal ─────────────────────────────────────────────────────────────
function StandupModal({ member, date, sprintId, onClose, onSaved }) {
  const [form, setForm] = useState({ yesterday: member.standup?.yesterday || '', today: member.standup?.today || '', blockers: member.standup?.blockers || '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const readOnly = !!member.standup;

  const handleSave = async () => {
    if (!form.today.trim()) { setErr("Today's plan is required"); return; }
    setSaving(true);
    try {
      await createStandup({ user: member.id, date, sprint: sprintId || null, ...form });
      onSaved();
      onClose();
    } catch (e) { setErr(e?.response?.data?.detail || 'Save failed'); setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 500, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <Avatar initials={member.initials} size={40} bg={member.submitted_today ? 'linear-gradient(135deg,#065f46,#059669)' : 'linear-gradient(135deg,#dc2626,#ef4444)'} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{member.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{member.role} · {date}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>
        {[
          { label: "What did you do yesterday?", key: 'yesterday', placeholder: 'e.g. Completed API integration' },
          { label: "What will you do today? *", key: 'today', placeholder: 'e.g. Dashboard charts + bug fixes' },
          { label: "Any blockers?", key: 'blockers', placeholder: 'e.g. Waiting for design approval' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{f.label}</label>
            {readOnly
              ? <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, minHeight: 38 }}>{form[f.key] || '—'}</div>
              : <textarea value={form[f.key]} onChange={F(f.key)} placeholder={f.placeholder} rows={2} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            }
          </div>
        ))}
        {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Close</button>
          {!readOnly && <button onClick={handleSave} disabled={saving} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#065f46,#059669)', color: 'white', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Saving…' : 'Submit Standup'}
          </button>}
        </div>
      </div>
    </div>
  );
}

// ── Bulk Pull Modal ───────────────────────────────────────────────────────────
function BulkPullModal({ selected, reqs, sprints, onClose, onPulled }) {
  const [sprintId, setSprintId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const selectedReqs = reqs.filter(r => selected.has(r.id));
  const activeSprints = sprints.filter(s => s.status === 'Active' || s.status === 'Planning');

  const handlePull = async () => {
    if (!sprintId) { setErr('Select a sprint'); return; }
    setBusy(true);
    try {
      await bulkPullToSprint([...selected], sprintId);
      onPulled();
      onClose();
    } catch (e) { setErr(e?.response?.data?.error || 'Pull failed'); setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>🚀 Bulk Pull to Sprint</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{selected.size} requirement{selected.size > 1 ? 's' : ''} selected</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>

        <div style={{ maxHeight: 180, overflowY: 'auto', background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          {selectedReqs.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', fontSize: 12.5 }}>
              <span style={{ fontFamily: 'monospace', color: '#065f46', fontWeight: 700 }}>{r.id}</span>
              <span style={{ color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
              <Pill label={r.priority} {...PRIORITY_COLORS[r.priority] || { bg: '#f8fafc', color: '#64748b' }} />
            </div>
          ))}
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Target Sprint *</label>
        <select value={sprintId} onChange={e => setSprintId(e.target.value)} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', background: 'white', marginBottom: 16 }}>
          <option value="">— Choose sprint —</option>
          {activeSprints.map(s => <option key={s.id} value={s.id}>{s.id} · {s.name} ({s.status})</option>)}
          {activeSprints.length === 0 && <option disabled>No active/planning sprints</option>}
        </select>

        {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={handlePull} disabled={busy || !sprintId} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#065f46,#059669)', color: 'white', fontWeight: 700, fontSize: 13, cursor: busy ? 'wait' : 'pointer', opacity: !sprintId ? .5 : 1 }}>
            {busy ? 'Pulling…' : `Pull ${selected.size} into Sprint`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Notify Modal ──────────────────────────────────────────────────────────────
function NotifyModal({ item, users, onClose, onSent }) {
  const { user } = useAuth();
  const defaultMsg = `Your ${item.type} "${item.title}" (${item.id}) is overdue by ${item.days_overdue} day${item.days_overdue !== 1 ? 's' : ''}. Please review and update the status urgently.`;
  const [msg, setMsg] = useState(defaultMsg);
  const [recipientId, setRecipientId] = useState(item.assignee_id || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleSend = async () => {
    if (!recipientId) { setErr('Select a recipient'); return; }
    if (!msg.trim()) { setErr('Message required'); return; }
    setBusy(true);
    try {
      await createNotification({
        recipient: recipientId,
        sender: user.id,
        title: `⚠️ Overdue ${item.type}: ${item.id}`,
        message: msg.trim(),
        item_type: item.type,
        item_id: item.id,
      });
      onSent();
      onClose();
    } catch (e) { setErr(e?.response?.data?.detail || 'Send failed'); setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 500, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>📢 Send Breach Notification</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{BREACH_TYPE_ICON[item.type]} {item.id} · {item.type} · overdue by {item.days_overdue}d</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Notify *</label>
        <select value={recipientId} onChange={e => setRecipientId(e.target.value)} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', background: 'white', marginBottom: 14 }}>
          <option value="">— Select recipient —</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}{item.assignee_id == u.id ? ' (assignee)' : ''}</option>)}
        </select>

        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Message *</label>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />

        {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={handleSend} disabled={busy} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#b45309,#d97706)', color: 'white', fontWeight: 700, fontSize: 13, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Sending…' : '📢 Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ScrumMaster() {
  const { user } = useAuth();
  const [dashData, setDashData]  = useState(null);
  const [reqs, setReqs]          = useState([]);
  const [sprints, setSprints]    = useState([]);
  const [users, setUsers]        = useState([]);
  const [breached, setBreached]  = useState([]);
  const [loading, setLoading]    = useState(true);

  const [tab, setTab]            = useState('standup');
  const [selected, setSelected]  = useState(new Set()); // req IDs for bulk pull
  const [pipeFilter, setPipeFilter] = useState('');

  // Modals
  const [standupModal, setStandupModal] = useState(null);
  const [bulkModal, setBulkModal]       = useState(false);
  const [notifyModal, setNotifyModal]   = useState(null);

  // Standup filters
  const [standupSearch, setStandupSearch]       = useState('');
  const [showOnlyMissing, setShowOnlyMissing]   = useState(false);
  const [sentCount, setSentCount]               = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, reqRes, spRes, usRes, brRes] = await Promise.all([
        getScrumDashboard(), getRequirements(), getSprints(), getUsers(), getBreachedItems(),
      ]);
      setDashData(dashRes.data);
      setReqs(reqRes.data);
      setSprints(spRes.data);
      setUsers(usRes.data);
      setBreached(brRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: '#065f46', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>Loading scrum dashboard…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!dashData) return <div style={{ padding: 32 }}>Failed to load.</div>;

  const { active_sprint, today, submitted_count, total_team, users: teamMembers, recent_standups, grooming_overview } = dashData;

  // Pipeline: backlog requirements (no sprint) by grooming status
  const backlog = reqs.filter(r => !r.parent && !r.sprint);
  const byStage = (s) => backlog.filter(r => r.grooming_status === s);
  const readyReqs = byStage('ready_for_sprint');

  const pipelineSearch = pipeFilter.toLowerCase();
  const filterReqs = (list) => pipelineSearch
    ? list.filter(r => r.title.toLowerCase().includes(pipelineSearch) || r.id.toLowerCase().includes(pipelineSearch))
    : list;

  const toggleSelect = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(readyReqs.map(r => r.id)));
  const clearAll  = () => setSelected(new Set());

  const completionPct = total_team > 0 ? Math.round((submitted_count / total_team) * 100) : 0;
  const filteredMembers = teamMembers.filter(m => {
    if (showOnlyMissing && m.submitted_today) return false;
    if (standupSearch && !m.name.toLowerCase().includes(standupSearch.toLowerCase())) return false;
    return true;
  });

  const TAB = (id, label) => (
    <button onClick={() => setTab(id)} style={{
      padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
      border: 'none', fontFamily: 'inherit', transition: 'all .15s',
      background: tab === id ? 'linear-gradient(135deg,#065f46,#059669)' : 'var(--surface2)',
      color: tab === id ? 'white' : 'var(--text2)',
    }}>{label}</button>
  );

  return (
    <div style={{ padding: '28px 32px', background: 'var(--surface)', minHeight: '100vh' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          🏆 Scrum Master Dashboard
        </h2>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          {active_sprint ? `Active Sprint: ${active_sprint.id} — ${active_sprint.name}` : 'No active sprint'}{' · '}{today}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 26 }}>
        <StatCard icon="📅" label="Standup Today" value={`${submitted_count}/${total_team}`} sub={`${completionPct}% submitted`} color="#065f46" />
        <StatCard icon="🚀" label="Ready to Pull" value={readyReqs.length} sub="Grooming complete" color="#1d4ed8" />
        <StatCard icon="🚨" label="Breached Items" value={breached.length} sub="Overdue in sprint" color="#dc2626" />
        <StatCard icon="⏳" label="In Pipeline" value={backlog.length} sub="Backlog requirements" color="#b45309" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {TAB('standup', '📅 Daily Standup')}
        {TAB('pipeline', `🔄 Grooming Pipeline${readyReqs.length > 0 ? ` (${readyReqs.length} ready)` : ''}`)}
        {TAB('breach', `🚨 Breach Alerts${breached.length > 0 ? ` (${breached.length})` : ''}`)}
      </div>

      {/* ═══ STANDUP TAB ═══════════════════════════════════════════════════════ */}
      {tab === 'standup' && (
        <div>
          {/* Progress bar */}
          <div style={{ background: 'white', borderRadius: 14, padding: '18px 22px', border: '1px solid var(--border)', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Team Standup Completion — {today}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: completionPct === 100 ? '#065f46' : '#b45309' }}>{completionPct}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${completionPct}%`, background: completionPct === 100 ? 'linear-gradient(90deg,#065f46,#059669)' : 'linear-gradient(90deg,#d97706,#f59e0b)', borderRadius: 4, transition: 'width .4s' }} />
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input value={standupSearch} onChange={e => setStandupSearch(e.target.value)} placeholder="Search member…"
              style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none' }} />
            <button onClick={() => setShowOnlyMissing(p => !p)}
              style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: showOnlyMissing ? '#fef2f2' : 'white', color: showOnlyMissing ? '#dc2626' : 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              {showOnlyMissing ? '🚨 Missing Only' : 'All Members'}
            </button>
          </div>

          {/* Member grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10, marginBottom: 28 }}>
            {filteredMembers.map(m => (
              <div key={m.id} onClick={() => setStandupModal(m)}
                style={{ background: 'white', borderRadius: 12, padding: '12px 16px', border: `1.5px solid ${m.submitted_today ? '#a7f3d0' : '#fecaca'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none'; }}>
                <Avatar initials={m.initials} size={38} bg={m.submitted_today ? 'linear-gradient(135deg,#065f46,#059669)' : 'linear-gradient(135deg,#dc2626,#ef4444)'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{m.role || `Team ${m.team}`}</div>
                </div>
                <span style={{ fontSize: 18 }}>{m.submitted_today ? '✅' : '🔴'}</span>
              </div>
            ))}
          </div>

          {/* Recent standups */}
          {recent_standups?.length > 0 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Recent Updates</div>
              <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {recent_standups.slice(0, 15).map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', gap: 12, padding: '12px 18px', borderBottom: i < 14 ? '1px solid var(--border)' : 'none' }}>
                    <Avatar initials={s.user_initials} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{s.user_name}</span>
                        <span style={{ fontSize: 10, background: 'var(--surface2)', padding: '1px 7px', borderRadius: 8, color: 'var(--text2)' }}>{s.date}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}><strong style={{ color: 'var(--text)' }}>Today:</strong> {s.today}</div>
                      {s.blockers && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}><strong>🚧</strong> {s.blockers}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ PIPELINE TAB ══════════════════════════════════════════════════════ */}
      {tab === 'pipeline' && (
        <div>
          {/* Search + bulk action bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={pipeFilter} onChange={e => setPipeFilter(e.target.value)} placeholder="Search backlog…"
              style={{ flex: 1, minWidth: 200, border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none' }} />
            {selected.size > 0 && (
              <>
                <span style={{ fontSize: 12, color: '#065f46', fontWeight: 700 }}>{selected.size} selected</span>
                <button onClick={() => setBulkModal(true)} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#065f46,#059669)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  🚀 Pull {selected.size} to Sprint
                </button>
                <button onClick={clearAll} style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', fontSize: 12, cursor: 'pointer', color: 'var(--text2)' }}>Clear</button>
              </>
            )}
          </div>

          {/* Pipeline stages */}
          {[
            { key: 'ready_for_sprint', selectable: true },
            { key: 'tl_reviewed', selectable: false },
            { key: 'attachments_ready', selectable: false },
            { key: 'pending', selectable: false },
          ].map(({ key, selectable }) => {
            const stageReqs = filterReqs(byStage(key));
            const cfg = GSTATUS[key];
            if (stageReqs.length === 0 && !pipelineSearch) return null;
            return (
              <div key={key} style={{ marginBottom: 24 }}>
                {/* Stage header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{stageReqs.length}</span>
                  {selectable && stageReqs.length > 0 && (
                    <button onClick={selectAll} style={{ marginLeft: 4, fontSize: 11, fontWeight: 600, color: '#065f46', background: '#d1fae5', border: 'none', borderRadius: 6, padding: '2px 10px', cursor: 'pointer' }}>Select All</button>
                  )}
                </div>

                {stageReqs.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 16px', background: 'white', borderRadius: 10, border: '1px dashed var(--border)' }}>
                    No requirements at this stage.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stageReqs.map(r => {
                      const pc = PRIORITY_COLORS[r.priority] || { bg: '#f8fafc', color: '#64748b' };
                      const isChecked = selected.has(r.id);
                      return (
                        <div key={r.id} style={{ background: 'white', borderRadius: 12, padding: '12px 16px', border: `1.5px solid ${isChecked ? '#059669' : cfg.border}`, display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color .15s', boxShadow: isChecked ? '0 0 0 2px #d1fae5' : 'none' }}>
                          {selectable && (
                            <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(r.id)}
                              style={{ width: 16, height: 16, flexShrink: 0, cursor: 'pointer', accentColor: '#059669' }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: cfg.color }}>{r.id}</span>
                              <Pill label={r.priority} {...pc} />
                              {r.department && <Pill label={r.department} bg="#f0fdf4" color="#15803d" />}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{r.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 12 }}>
                              {r.assignee_name && <span>👤 {r.assignee_name}</span>}
                              {r.children_count > 0 && <span>📋 {r.children_count} sub</span>}
                              {r.comment_count > 0 && <span>💬 {r.comment_count}</span>}
                            </div>
                          </div>
                          {selectable && (
                            <button onClick={() => { setSelected(new Set([r.id])); setBulkModal(true); }}
                              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#065f46,#059669)', color: 'white', fontWeight: 700, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                              🚀 Pull
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ BREACH ALERTS TAB ═════════════════════════════════════════════════ */}
      {tab === 'breach' && (
        <div>
          {sentCount > 0 && (
            <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: '#065f46', fontWeight: 600 }}>
              ✅ {sentCount} notification{sentCount > 1 ? 's' : ''} sent this session.
            </div>
          )}

          {breached.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 14, padding: 48, textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>No breached items</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>All sprint items are within their deadline.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {breached.map((item, i) => {
                const pc = PRIORITY_COLORS[item.priority] || { bg: '#f8fafc', color: '#64748b' };
                const overdueBg = item.days_overdue > 14 ? '#fef2f2' : item.days_overdue > 7 ? '#fff7ed' : '#fefce8';
                const overdueColor = item.days_overdue > 14 ? '#dc2626' : item.days_overdue > 7 ? '#ea580c' : '#ca8a04';
                return (
                  <div key={i} style={{ background: 'white', borderRadius: 12, padding: '14px 18px', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 22, flexShrink: 0 }}>{BREACH_TYPE_ICON[item.type] || '📋'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>{item.id}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#f1f5f9', color: '#475569', textTransform: 'capitalize' }}>{item.type}</span>
                        <Pill label={item.priority} {...pc} />
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#f1f5f9', color: '#475569' }}>{item.status}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {item.assignee_name && <span>👤 {item.assignee_name}</span>}
                        {item.sprint_name && <span>🏃 {item.sprint_name}</span>}
                        <span style={{ color: overdueColor, fontWeight: 700, background: overdueBg, padding: '1px 7px', borderRadius: 8 }}>+{item.days_overdue}d overdue</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifyModal(item)}
                      style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#b45309,#d97706)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      📢 Notify
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {standupModal && (
        <StandupModal member={standupModal} date={today} sprintId={active_sprint?.id}
          onClose={() => setStandupModal(null)} onSaved={load} />
      )}
      {bulkModal && selected.size > 0 && (
        <BulkPullModal selected={selected} reqs={reqs} sprints={sprints}
          onClose={() => setBulkModal(false)} onPulled={() => { load(); clearAll(); }} />
      )}
      {notifyModal && (
        <NotifyModal item={notifyModal} users={users}
          onClose={() => setNotifyModal(null)}
          onSent={() => { setSentCount(c => c + 1); setNotifyModal(null); }} />
      )}
    </div>
  );
}
