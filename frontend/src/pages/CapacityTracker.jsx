import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getSprints, getUsers,
  getSprintCapacity, setSprintCapacity,
  getUserLeaves, createUserLeave, deleteUserLeave,
  getCapacitySummary,
} from '../api';

const LEAVE_TYPES = [
  { value: 'planned', label: 'Planned Leave', color: '#1a56db', bg: '#e8eeff' },
  { value: 'sick',    label: 'Sick Leave',    color: '#dc2626', bg: '#fef2f2' },
  { value: 'holiday', label: 'Public Holiday',color: '#d97706', bg: '#fef3c7' },
];

const leaveStyle = (type) => LEAVE_TYPES.find(t => t.value === type) || LEAVE_TYPES[0];

function UtilBar({ pct, over, under }) {
  const color = over ? '#dc2626' : under ? '#d97706' : '#16a34a';
  const bg    = over ? '#fef2f2' : under ? '#fef3c7' : '#f0fdf4';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap', minWidth: 42, textAlign: 'center' }}>
        {pct}%
      </span>
    </div>
  );
}

function LeaveModal({ user, sprint, leaves, onClose, onSaved, showToast }) {
  const { user: me } = useAuth();
  const [date, setDate]     = useState('');
  const [type, setType]     = useState('planned');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!date) return;
    setSaving(true);
    try {
      await createUserLeave({ user: user.id, sprint: sprint, date, leave_type: type, notes });
      showToast(`Leave recorded for ${user.name}`, 'success');
      setDate(''); setNotes('');
      onSaved();
    } catch (e) {
      showToast(e?.response?.data?.non_field_errors?.[0] || 'Failed to save leave', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteUserLeave(id);
      showToast('Leave removed', 'info');
      onSaved();
    } catch { showToast('Delete failed', 'error'); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 500, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>📅 Manage Leaves — {user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{user.role || user.team}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
        </div>

        {/* Add Leave */}
        <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>Add Leave</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none' }}>
                {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
          <button onClick={handleAdd} disabled={!date || saving}
            style={{ width: '100%', padding: '9px', borderRadius: 9, border: 'none', background: !date ? 'var(--surface2)' : 'linear-gradient(135deg,#065f46,#059669)', color: !date ? 'var(--text3)' : 'white', fontWeight: 700, fontSize: 13, cursor: !date ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Saving…' : '+ Add Leave Day'}
          </button>
        </div>

        {/* Existing leaves */}
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {leaves.length === 0
            ? <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>No leaves recorded</div>
            : leaves.map(l => {
                const ls = leaveStyle(l.leave_type);
                return (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: ls.bg, color: ls.color }}>{ls.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{l.date}</span>
                    {l.notes && <span style={{ fontSize: 11, color: 'var(--text2)' }}>{l.notes}</span>}
                    <button onClick={() => handleDelete(l.id)}
                      style={{ background: 'var(--red-light)', border: 'none', color: 'var(--red)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                  </div>
                );
              })
          }
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 9, border: 'none', background: 'var(--surface2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function CapacityTracker() {
  const { user }   = useAuth();
  const showToast  = useToast();
  const isManager  = user?.perfiq === 'MANAGER' || user?.perfiq === 'CTO';
  const isReadOnly = !isManager; // SM can view but not edit

  const [sprints,   setSprints]   = useState([]);
  const [users,     setUsers]     = useState([]);
  const [sprintId,  setSprintId]  = useState('');
  const [caps,      setCaps]      = useState([]);
  const [leaves,    setLeaves]    = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [leaveModal, setLeaveModal] = useState(null); // { user }
  const [editSp,    setEditSp]    = useState({}); // { userId: value }
  const [savingIds, setSavingIds] = useState(new Set());

  // Load sprints + users once
  useEffect(() => {
    getSprints().then(r => {
      const active = r.data.filter(s => s.status !== 'Completed');
      setSprints(active);
      if (active.length) setSprintId(active[0].id);
    });
    getUsers().then(r => setUsers(r.data));
  }, []);

  const loadCapacity = useCallback(async () => {
    if (!sprintId) return;
    setLoading(true);
    try {
      const [capRes, lvRes, sumRes] = await Promise.all([
        getSprintCapacity({ sprint: sprintId }),
        getUserLeaves({ sprint: sprintId }),
        getCapacitySummary({ sprint: sprintId }),
      ]);
      setCaps(capRes.data);
      setLeaves(lvRes.data);
      setSummary(sumRes.data?.[0] || null);
    } catch {}
    setLoading(false);
  }, [sprintId]);

  useEffect(() => { loadCapacity(); }, [loadCapacity]);

  const getCapForUser = (userId) => caps.find(c => c.user === userId);
  const getLeavesForUser = (userId) => leaves.filter(l => l.user === userId);

  const handleSpSave = async (userId) => {
    const sp = parseInt(editSp[userId], 10);
    if (isNaN(sp) || sp < 0) return;
    setSavingIds(p => new Set(p).add(userId));
    try {
      await setSprintCapacity({ user: userId, sprint: sprintId, base_story_points: sp });
      showToast('Capacity saved', 'success');
      loadCapacity();
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Save failed', 'error');
    }
    setSavingIds(p => { const n = new Set(p); n.delete(userId); return n; });
    setEditSp(p => { const n = { ...p }; delete n[userId]; return n; });
  };

  const sprint = sprints.find(s => s.id === sprintId);

  if (!isManager && user?.role !== 'Scrum Master' && user?.perfiq !== 'CTO') {
    return <div className="page-content"><div className="empty"><div className="empty-icon">🔒</div><div className="empty-text">Manager access required</div></div></div>;
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">📊 Team Capacity Tracker</div>
          <div className="page-subtitle">Plan story points, track leaves, and monitor sprint capacity</div>
        </div>
        <select value={sprintId} onChange={e => setSprintId(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', background: 'white', minWidth: 220, outline: 'none' }}>
          <option value="">— Select sprint —</option>
          {sprints.map(s => <option key={s.id} value={s.id}>{s.id} · {s.name} ({s.status})</option>)}
        </select>
      </div>

      {/* Sprint summary banner */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { icon: '📅', label: 'Working Days', val: summary.working_days, color: 'blue' },
            { icon: '🎯', label: 'Total Available SP', val: summary.total_available_sp, color: 'teal' },
            { icon: '📋', label: 'Total Planned SP',   val: summary.total_planned_sp,   color: summary.total_planned_sp > summary.total_available_sp ? 'red' : 'green' },
            { icon: '🚨', label: 'Over Capacity',      val: summary.over_count,  color: summary.over_count  > 0 ? 'red'   : 'green' },
            { icon: '⚠️', label: 'Under Capacity',     val: summary.under_count, color: summary.under_count > 0 ? 'amber' : 'green' },
          ].map(s => (
            <div key={s.label} className={`stat-card stat-card--${s.color}`}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-val">{s.val ?? '—'}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main capacity table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>Loading capacity data…</div>
      ) : !sprintId ? (
        <div className="empty"><div className="empty-icon">📊</div><div className="empty-text">Select a sprint to view capacity</div></div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">👥 Team Capacity — {sprint?.name}</span>
            {!isReadOnly && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Click SP field to edit · 📅 to manage leaves</span>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Base SP</th>
                  <th style={{ whiteSpace: 'nowrap' }}>🏖 Planned Leave</th>
                  <th style={{ whiteSpace: 'nowrap' }}>🤒 Sick Leave</th>
                  <th>Available SP</th>
                  <th>Planned SP</th>
                  <th>Utilization</th>
                  <th>Status</th>
                  {!isReadOnly && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const cap   = getCapForUser(u.id);
                  const uLeaves = getLeavesForUser(u.id);
                  const summaryUser = summary?.users?.find(su => su.user_id === u.id);
                  const baseSp     = cap?.base_story_points ?? 0;
                  const availSp    = summaryUser?.available_sp ?? baseSp;
                  const plannedSp  = summaryUser?.planned_sp ?? 0;
                  const pLeave     = summaryUser?.planned_leave_days ?? 0;
                  const sLeave     = summaryUser?.sick_leave_days    ?? 0;
                  const utilPct    = summaryUser?.utilization_pct ?? 0;
                  const isOver     = summaryUser?.over_capacity;
                  const isUnder    = summaryUser?.under_capacity;
                  const isEditing  = editSp[u.id] !== undefined;

                  const initials = u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

                  return (
                    <tr key={u.id}>
                      {/* Member */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{u.role || u.team || '—'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Base SP */}
                      <td>
                        {!isReadOnly && isEditing ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input type="number" min="0" value={editSp[u.id]}
                              onChange={e => setEditSp(p => ({ ...p, [u.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') handleSpSave(u.id); if (e.key === 'Escape') setEditSp(p => { const n = {...p}; delete n[u.id]; return n; }); }}
                              style={{ width: 70, padding: '5px 8px', border: '1.5px solid var(--accent)', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                              autoFocus />
                            <button onClick={() => handleSpSave(u.id)} disabled={savingIds.has(u.id)}
                              style={{ padding: '4px 10px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              {savingIds.has(u.id) ? '…' : '✓'}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 14 }}>{baseSp}</span>
                            {!isReadOnly && (
                              <button onClick={() => setEditSp(p => ({ ...p, [u.id]: baseSp }))}
                                style={{ background: 'var(--accent-light)', border: 'none', color: 'var(--accent)', borderRadius: 6, padding: '2px 7px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Planned Leave */}
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 700, color: pLeave > 0 ? '#1a56db' : 'var(--text3)' }}>
                          {pLeave}d
                        </span>
                      </td>

                      {/* Sick Leave */}
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 700, color: sLeave > 0 ? '#dc2626' : 'var(--text3)' }}>
                          {sLeave}d
                        </span>
                      </td>

                      {/* Available SP */}
                      <td>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 14,
                          color: availSp < baseSp * 0.7 ? '#dc2626' : '#065f46' }}>
                          {availSp}
                        </span>
                        {(pLeave > 0 || sLeave > 0) && (
                          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>
                            ({baseSp} - {pLeave + sLeave}d)
                          </span>
                        )}
                      </td>

                      {/* Planned SP */}
                      <td>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 14,
                          color: isOver ? '#dc2626' : '#1a1d2e' }}>
                          {plannedSp}
                        </span>
                      </td>

                      {/* Utilization */}
                      <td style={{ minWidth: 140 }}>
                        {availSp > 0
                          ? <UtilBar pct={utilPct} over={isOver} under={isUnder} />
                          : <span style={{ color: 'var(--text3)', fontSize: 12 }}>No capacity set</span>
                        }
                      </td>

                      {/* Status */}
                      <td>
                        {!baseSp ? (
                          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Not set</span>
                        ) : isOver ? (
                          <span className="badge badge-red">🔴 Over capacity</span>
                        ) : isUnder ? (
                          <span className="badge badge-amber">⚠️ Under-utilized</span>
                        ) : (
                          <span className="badge badge-green">✅ Balanced</span>
                        )}
                      </td>

                      {/* Actions */}
                      {!isReadOnly && (
                        <td>
                          <button
                            onClick={() => setLeaveModal({ user: u, leaves: uLeaves })}
                            style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            📅 Leaves {uLeaves.length > 0 && `(${uLeaves.length})`}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {leaveModal && (
        <LeaveModal
          user={leaveModal.user}
          sprint={sprintId}
          leaves={leaveModal.leaves}
          onClose={() => setLeaveModal(null)}
          onSaved={() => { loadCapacity(); setLeaveModal(p => p ? { ...p, leaves: getLeavesForUser(p.user.id) } : null); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
