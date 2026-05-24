import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getScrumDashboard, getSprints, getRequirements, getUsers,
  pullReqToSprint, bulkPullToSprint,
  createStandup,
  getBreachedItems, createNotification,
  createScrumAlert, deactivateScrumAlert, getScrumAlerts,
  getTeams, getTeamStandups,
  updateSprint,
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

// ── Sprint Control Panel ──────────────────────────────────────────────────────
function SprintControlPanel({ sprints, busy, msg, onAction }) {
  const actionable = sprints.filter(s => s.status !== 'Completed');
  if (actionable.length === 0) return null;

  const statusConfig = {
    Planning:  { next: [{ label: '▶ Start', to: 'Active', color: '#065f46', bg: 'linear-gradient(135deg,#065f46,#059669)' }], badge: { bg: '#ede9fe', color: '#7c3aed' } },
    Active:    { next: [
      { label: '⏸ Hold', to: 'On Hold', color: '#b45309', bg: 'linear-gradient(135deg,#b45309,#d97706)' },
      { label: '✓ Close', to: 'Completed', color: '#dc2626', bg: 'linear-gradient(135deg,#dc2626,#ef4444)' },
    ], badge: { bg: '#d1fae5', color: '#065f46' } },
    'On Hold': { next: [
      { label: '▶ Resume', to: 'Active', color: '#065f46', bg: 'linear-gradient(135deg,#065f46,#059669)' },
      { label: '✓ Close', to: 'Completed', color: '#dc2626', bg: 'linear-gradient(135deg,#dc2626,#ef4444)' },
    ], badge: { bg: '#fef9c3', color: '#92400e' } },
  };

  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #6ee7b7', padding: '16px 22px', marginBottom: 22, boxShadow: '0 2px 12px rgba(5,150,105,.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#065f46', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        🏃 Sprint Controls
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 10 }}>Manage sprint lifecycle</span>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('✅') ? '#d1fae5' : '#fef2f2', border: `1px solid ${msg.startsWith('✅') ? '#6ee7b7' : '#fecaca'}`, borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 12.5, color: msg.startsWith('✅') ? '#065f46' : '#dc2626', fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {actionable.map(sprint => {
          const cfg = statusConfig[sprint.status];
          if (!cfg) return null;
          return (
            <div key={sprint.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              {/* Sprint info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#065f46' }}>{sprint.id}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '1px 8px', borderRadius: 10, background: cfg.badge.bg, color: cfg.badge.color }}>{sprint.status}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sprint.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                  {sprint.start_date} → {sprint.end_date} · {sprint.task_count ?? '?'} items
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {cfg.next.map(action => (
                  <button
                    key={action.to}
                    disabled={busy}
                    onClick={() => onAction(sprint.id, action.to)}
                    style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: busy ? 'var(--surface2)' : action.bg, color: busy ? 'var(--text3)' : 'white', fontWeight: 700, fontSize: 12, cursor: busy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all .15s', boxShadow: busy ? 'none' : '0 2px 8px rgba(0,0,0,.15)' }}>
                    {busy ? '⏳' : action.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
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
  const [sprintActionBusy, setSprintActionBusy] = useState(false);
  const [sprintActionMsg, setSprintActionMsg]   = useState('');
  const [selected, setSelected]  = useState(new Set()); // req IDs for bulk pull
  const [pipeFilter, setPipeFilter] = useState('');

  // Modals
  const [standupModal, setStandupModal]   = useState(null);
  const [bulkModal, setBulkModal]         = useState(false);
  const [notifyModal, setNotifyModal]     = useState(null);
  const [pipelineModal, setPipelineModal] = useState(false);

  // Standup filters
  const [standupSearch, setStandupSearch]       = useState('');
  const [showOnlyMissing, setShowOnlyMissing]   = useState(false);
  const [sentCount, setSentCount]               = useState(0);

  // Daily tasks tab
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberHistory, setMemberHistory]   = useState(null); // standups for selected member

  // Scrum Meeting tab
  const [scrumDate, setScrumDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [scrumTeamId, setScrumTeamId] = useState('');
  const [scrumData, setScrumData]     = useState(null);
  const [scrumMember, setScrumMember] = useState(null);
  const [teams, setTeams]             = useState([]);
  const [scrumLoading, setScrumLoading] = useState(false);

  // Scrum Alert push
  const [alertForm, setAlertForm]       = useState({ alert_type: 'standup', message: '' });
  const [alertSending, setAlertSending] = useState(false);
  const [alertSent, setAlertSent]       = useState(false);
  const [alertErr, setAlertErr]         = useState('');
  const [activeAlert, setActiveAlert]   = useState(null);

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

  // Load teams list once
  useEffect(() => {
    getTeams().then(r => setTeams(r.data)).catch(() => {});
  }, []);

  // Load scrum meeting standups when team or date changes
  useEffect(() => {
    if (!scrumTeamId) { setScrumData(null); return; }
    setScrumLoading(true);
    setScrumMember(null);
    getTeamStandups(scrumTeamId, scrumDate)
      .then(r => setScrumData(r.data))
      .catch(() => setScrumData(null))
      .finally(() => setScrumLoading(false));
  }, [scrumTeamId, scrumDate]);

  // Load latest active alert for display
  useEffect(() => {
    getScrumAlerts().then(r => {
      const active = r.data.find(a => a.is_active);
      setActiveAlert(active || null);
    }).catch(() => {});
  }, [alertSent]);

  const handlePushAlert = async () => {
    if (!alertForm.message.trim()) { setAlertErr('Message is required'); return; }
    setAlertSending(true); setAlertErr('');
    try {
      await createScrumAlert(alertForm);
      setAlertSent(p => !p); // toggle to re-trigger useEffect
      setAlertForm({ alert_type: 'standup', message: '' });
    } catch (e) {
      setAlertErr(e?.response?.data?.error || 'Failed to push alert');
    } finally { setAlertSending(false); }
  };

  const handleDeactivateAlert = async (id) => {
    try { await deactivateScrumAlert(id); setActiveAlert(null); } catch {}
  };

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

  const TAB = (id, label, onClick) => (
    <button onClick={onClick || (() => setTab(id))} style={{
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

      {/* ── Push Global Alert Card ─────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #6ee7b7', padding: '18px 22px', marginBottom: 22, boxShadow: '0 2px 12px rgba(5,150,105,.08)' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#065f46', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          📣 Push Global Alert
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 10 }}>Broadcasts to all open sessions</span>
        </div>

        {activeAlert && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <span style={{ flex: 1, color: '#92400e' }}><strong>Active alert:</strong> {activeAlert.message}</span>
            <button onClick={() => handleDeactivateAlert(activeAlert.id)}
              style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid #fcd34d', background: 'white', color: '#92400e', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
              Deactivate
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 10, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>Alert Type</div>
            <select value={alertForm.alert_type} onChange={e => setAlertForm(p => ({ ...p, alert_type: e.target.value }))}
              style={{ width: '100%', padding: '9px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
              <option value="standup">🏆 Standup Time</option>
              <option value="breach">🚨 Sprint Breach</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="info">📢 General Info</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>Message</div>
            <input value={alertForm.message} onChange={e => setAlertForm(p => ({ ...p, message: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handlePushAlert()}
              placeholder="e.g. Daily standup starting now — join the call!" style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handlePushAlert} disabled={alertSending || !alertForm.message.trim()}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: alertSending || !alertForm.message.trim() ? 'var(--surface2)' : 'linear-gradient(135deg,#065f46,#0d9488)', color: alertSending || !alertForm.message.trim() ? 'var(--text3)' : 'white', fontWeight: 700, fontSize: 13, cursor: !alertForm.message.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            {alertSending ? '⏳ Sending…' : '🚀 Push to All'}
          </button>
        </div>
        {alertErr && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{alertErr}</div>}
      </div>

      {/* ── Sprint Control Panel ──────────────────────────────────── */}
      <SprintControlPanel
        sprints={sprints}
        busy={sprintActionBusy}
        msg={sprintActionMsg}
        onAction={async (sprintId, newStatus) => {
          setSprintActionBusy(true);
          setSprintActionMsg('');
          try {
            await updateSprint(sprintId, { status: newStatus });
            setSprintActionMsg(`✅ Sprint moved to ${newStatus}`);
            load();
          } catch (e) {
            setSprintActionMsg('❌ ' + (e?.response?.data?.error || 'Action failed'));
          } finally {
            setSprintActionBusy(false);
          }
        }}
      />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 26 }}>
        <StatCard icon="📅" label="Standup Today" value={`${submitted_count}/${total_team}`} sub={`${completionPct}% submitted`} color="#065f46" />
        <StatCard icon="🚀" label="Ready to Pull" value={readyReqs.length} sub="Grooming complete" color="#1d4ed8" />
        <StatCard icon="🚨" label="Breached Items" value={breached.length} sub="Overdue in sprint" color="#dc2626" />
        <StatCard icon="⏳" label="In Pipeline" value={backlog.length} sub="Backlog requirements" color="#b45309" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {TAB('standup', '📅 Daily Standup')}
        {TAB('pipeline', `🔄 Grooming Pipeline${readyReqs.length > 0 ? ` (${readyReqs.length} ready)` : ''}`, () => setPipelineModal(true))}
        {TAB('breach', `🚨 Breach Alerts${breached.length > 0 ? ` (${breached.length})` : ''}`)}
        {TAB('dailytasks', '📋 Daily Tasks')}
        {TAB('scrummeeting', '🏟️ Scrum Meeting')}
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

      {/* Pipeline tab renders as a popup modal — see pipelineModal below */}

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

      {/* ═══ DAILY TASKS TAB ════════════════════════════════════════════════ */}
      {tab === 'dailytasks' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 18, alignItems: 'start' }}>
          {/* Left: member list */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
              👥 Team Members
            </div>
            <div>
              {teamMembers.map(m => (
                <div
                  key={m.id}
                  onClick={() => { setSelectedMember(m); setMemberHistory(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                    cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    background: selectedMember?.id === m.id ? '#eff6ff' : 'white',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => { if (selectedMember?.id !== m.id) e.currentTarget.style.background = 'var(--surface)'; }}
                  onMouseLeave={e => { if (selectedMember?.id !== m.id) e.currentTarget.style.background = 'white'; }}
                >
                  <Avatar initials={m.initials} size={34}
                    bg={m.submitted_today ? 'linear-gradient(135deg,#065f46,#059669)' : 'linear-gradient(135deg,#9ca3af,#6b7280)'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text2)' }}>{m.role || `Team ${m.team}`}</div>
                  </div>
                  <span style={{ fontSize: 14 }}>{m.submitted_today ? '✅' : '⬜'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: standup detail for selected member */}
          <div>
            {!selectedMember ? (
              <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--border)', padding: '48px 32px', textAlign: 'center', color: 'var(--text3)' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Select a team member</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>View their daily standup details here</div>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {/* Member header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar initials={selectedMember.initials} size={42}
                    bg={selectedMember.submitted_today ? 'linear-gradient(135deg,#065f46,#059669)' : 'linear-gradient(135deg,#9ca3af,#6b7280)'} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedMember.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{selectedMember.role || `Team ${selectedMember.team}`}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: selectedMember.submitted_today ? '#d1fae5' : '#fef2f2', color: selectedMember.submitted_today ? '#065f46' : '#dc2626' }}>
                    {selectedMember.submitted_today ? '✅ Submitted Today' : '🔴 Not Submitted'}
                  </span>
                </div>

                {/* Standup content */}
                {selectedMember.standup ? (
                  <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {[
                      { label: '📅 Yesterday', key: 'yesterday', color: '#1d4ed8', bg: '#eff6ff' },
                      { label: '⚡ Today',     key: 'today',     color: '#15803d', bg: '#f0fdf4' },
                      { label: '🚧 Blockers',  key: 'blockers',  color: '#dc2626', bg: '#fef2f2' },
                    ].map(({ label, key, color, bg }) => (
                      <div key={key}>
                        <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{label}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', background: bg, borderRadius: 10, padding: '12px 16px', whiteSpace: 'pre-wrap', minHeight: 40 }}>
                          {selectedMember.standup[key] || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Not provided</span>}
                        </div>
                      </div>
                    ))}

                    {/* View all history link */}
                    <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <button
                        onClick={async () => {
                          try {
                            const { getStandups } = await import('../api');
                            const res = await getStandups({ user: selectedMember.id });
                            setMemberHistory(res.data);
                          } catch {}
                        }}
                        style={{ padding: '7px 16px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text2)', fontFamily: 'inherit' }}
                      >
                        📋 View All Standups
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '32px 22px', textAlign: 'center', color: 'var(--text3)' }}>
                    <div style={{ fontSize: 30, marginBottom: 8 }}>📝</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>No standup submitted today</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Check back after the daily standup session</div>
                  </div>
                )}

                {/* Standup history */}
                {memberHistory && memberHistory.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 22px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📋 Standup History ({memberHistory.length})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                      {memberHistory.map(s => (
                        <div key={s.id} style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', padding: '2px 8px', borderRadius: 8 }}>{s.date}</span>
                            {s.sprint_name && <span style={{ fontSize: 10, color: 'var(--text3)' }}>🏃 {s.sprint_name}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}><strong style={{ color: 'var(--text)' }}>Today:</strong> {s.today}</div>
                          {s.yesterday && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}><strong style={{ color: 'var(--text)' }}>Yesterday:</strong> {s.yesterday}</div>}
                          {s.blockers && <div style={{ fontSize: 12, color: '#dc2626' }}><strong>🚧 Blockers:</strong> {s.blockers}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ SCRUM MEETING TAB ══════════════════════════════════════════════ */}
      {tab === 'scrummeeting' && (
        <div>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>Date</div>
              <input
                type="date"
                value={scrumDate}
                onChange={e => setScrumDate(e.target.value)}
                style={{ padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>Team</div>
              <select
                value={scrumTeamId}
                onChange={e => { setScrumTeamId(e.target.value); setScrumMember(null); }}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'white' }}
              >
                <option value="">— Select a team —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.department})</option>)}
              </select>
            </div>
          </div>

          {!scrumTeamId && (
            <div style={{ background: 'white', borderRadius: 14, padding: '48px 32px', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text3)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🏟️</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Select a team to view standups</div>
            </div>
          )}

          {scrumTeamId && scrumLoading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text2)', fontSize: 13 }}>Loading…</div>
          )}

          {scrumTeamId && !scrumLoading && scrumData && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
              {/* Member grid */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text2)' }}>
                  {scrumData.team} — {scrumData.date} · {scrumData.members.filter(m => m.submitted).length}/{scrumData.members.length} submitted
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {scrumData.members.map(m => (
                    <div
                      key={m.user_id}
                      onClick={() => setScrumMember(scrumMember?.user_id === m.user_id ? null : m)}
                      style={{
                        background: scrumMember?.user_id === m.user_id ? (m.submitted ? '#d1fae5' : '#fef2f2') : 'white',
                        border: `1.5px solid ${m.submitted ? '#a7f3d0' : '#fecaca'}`,
                        borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                        transition: 'all .15s',
                        boxShadow: scrumMember?.user_id === m.user_id ? '0 4px 16px rgba(0,0,0,.1)' : 'none',
                      }}
                      onMouseEnter={e => { if (scrumMember?.user_id !== m.user_id) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,.08)'; }}
                      onMouseLeave={e => { if (scrumMember?.user_id !== m.user_id) e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <Avatar initials={m.initials} size={36}
                          bg={m.submitted ? 'linear-gradient(135deg,#065f46,#059669)' : 'linear-gradient(135deg,#dc2626,#ef4444)'} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text2)' }}>{m.role}</div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: m.submitted ? '#d1fae5' : '#fef2f2',
                        color: m.submitted ? '#065f46' : '#dc2626',
                      }}>
                        {m.submitted ? '✅ Submitted' : '🔴 Missing'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detail panel */}
              {scrumMember && (
                <div style={{ width: 340, background: 'white', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={scrumMember.initials} size={40}
                      bg={scrumMember.submitted ? 'linear-gradient(135deg,#065f46,#059669)' : 'linear-gradient(135deg,#dc2626,#ef4444)'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{scrumMember.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>{scrumMember.role}</div>
                    </div>
                    <button onClick={() => setScrumMember(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text3)' }}>✕</button>
                  </div>
                  {scrumMember.submitted ? (
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { label: '📅 Yesterday', key: 'yesterday', color: '#1d4ed8', bg: '#eff6ff' },
                        { label: '⚡ Today',     key: 'today',     color: '#15803d', bg: '#f0fdf4' },
                        { label: '🚧 Blockers',  key: 'blockers',  color: '#dc2626', bg: '#fef2f2' },
                      ].map(({ label, key, color, bg }) => (
                        <div key={key}>
                          <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 13, lineHeight: 1.6, background: bg, borderRadius: 10, padding: '10px 14px', whiteSpace: 'pre-wrap', minHeight: 36, color: 'var(--text)' }}>
                            {scrumMember[key] || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Not provided</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>No standup submitted</div>
                    </div>
                  )}
                </div>
              )}
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

      {/* ═══ PIPELINE MODAL ═══════════════════════════════════════════════════ */}
      {pipelineModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }}
          onClick={e => e.target === e.currentTarget && setPipelineModal(false)}>
          <div style={{ background: 'white', borderRadius: 20, width: '82vw', maxWidth: 860, height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.22)' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
              <span style={{ fontSize: 22 }}>🔄</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>Grooming Pipeline</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                  {backlog.length} items in backlog · {readyReqs.length} ready to pull
                </div>
              </div>
              {selected.size > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#065f46', fontWeight: 700 }}>{selected.size} selected</span>
                  <button onClick={() => setBulkModal(true)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#065f46,#059669)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    🚀 Pull {selected.size} to Sprint
                  </button>
                  <button onClick={clearAll} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', fontSize: 12, cursor: 'pointer', color: 'var(--text2)' }}>Clear</button>
                </div>
              )}
              <button onClick={() => setPipelineModal(false)}
                style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '5px 9px', cursor: 'pointer', fontSize: 16, color: 'var(--text2)' }}>✕</button>
            </div>

            {/* Search */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <input value={pipeFilter} onChange={e => setPipeFilter(e.target.value)} placeholder="Search by title or ID…"
                style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} autoFocus />
            </div>

            {/* Scrollable stages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
              {[
                { key: 'ready_for_sprint', selectable: true },
                { key: 'tl_reviewed',      selectable: false },
                { key: 'attachments_ready',selectable: false },
                { key: 'pending',          selectable: false },
              ].map(({ key, selectable }) => {
                const stageReqs = filterReqs(byStage(key));
                const cfg = GSTATUS[key];
                if (stageReqs.length === 0 && !pipelineSearch) return null;
                return (
                  <div key={key} style={{ marginBottom: 26 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>{cfg.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{stageReqs.length}</span>
                      {selectable && stageReqs.length > 0 && (
                        <button onClick={selectAll} style={{ marginLeft: 4, fontSize: 11, fontWeight: 600, color: '#065f46', background: '#d1fae5', border: 'none', borderRadius: 6, padding: '2px 10px', cursor: 'pointer' }}>Select All</button>
                      )}
                    </div>

                    {stageReqs.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 16px', background: 'var(--surface)', borderRadius: 10, border: '1px dashed var(--border)' }}>
                        No requirements at this stage.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {stageReqs.map(r => {
                          const pc = PRIORITY_COLORS[r.priority] || { bg: '#f8fafc', color: '#64748b' };
                          const isChecked = selected.has(r.id);
                          return (
                            <div key={r.id} style={{ background: isChecked ? '#f0fdf4' : 'var(--surface)', borderRadius: 12, padding: '12px 16px', border: `1.5px solid ${isChecked ? '#059669' : cfg.border}`, display: 'flex', alignItems: 'center', gap: 12, transition: 'all .15s', boxShadow: isChecked ? '0 0 0 2px #d1fae5' : 'none' }}>
                              {selectable && (
                                <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(r.id)}
                                  style={{ width: 17, height: 17, flexShrink: 0, cursor: 'pointer', accentColor: '#059669' }} />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: cfg.color }}>{r.id}</span>
                                  <Pill label={r.priority} {...pc} />
                                  {r.item_type && r.item_type !== 'REQ' && <Pill label={r.item_type} bg="#ede9fe" color="#6d28d9" />}
                                  {r.department && <Pill label={r.department} bg="#f0fdf4" color="#15803d" />}
                                  {r.story_points && <Pill label={`${r.story_points} SP`} bg="#f5f3ff" color="#7c3aed" />}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{r.title}</div>
                                <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                  {r.assignee_name && <span>👤 {r.assignee_name}</span>}
                                  {r.end_date && <span>🏁 {new Date(r.end_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</span>}
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
          </div>
        </div>
      )}
    </div>
  );
}
