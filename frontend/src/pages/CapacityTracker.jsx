import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getSprints, getUsers,
  getSprintCapacity, setSprintCapacity,
  getUserLeaves, createUserLeave, deleteUserLeave,
  getCapacitySummary, assignUserManager,
  getOrCreateDirectRoom, sendChatMessage,
} from '../api';

/* ── PM Capacity breakdown stored in localStorage ──────────────────────── */
/* ── Team configuration ─────────────────────────────────────────────────── */
const TEAM_NAMES = {
  '3':  { name: 'Debuggers',     icon: '🐛', color: '#7c3aed', bg: '#f5f3ff' },
  '5':  { name: 'Core Blasters', icon: '💥', color: '#059669', bg: '#ecfdf5' },
  '11': { name: 'Tech Titans',   icon: '🏆', color: '#dc2626', bg: '#fef2f2' },
};

// Which teams each PM sees in capacity tracker (keyed by PM user ID)
// Manoj Kumar R (24): Debuggers + Core Blasters only (not Regional Coordinators)
const PM_VISIBLE_TEAMS = {
  24: ['3', '5'],
  50: ['11'],
};

const PM_BREAKDOWN_KEY = 'emisPMCapBreakdown';

function loadPMBreakdown(sprintId) {
  try {
    const all = JSON.parse(localStorage.getItem(PM_BREAKDOWN_KEY) || '{}');
    return all[sprintId] || {};
  } catch { return {}; }
}

function savePMBreakdown(sprintId, data) {
  try {
    const all = JSON.parse(localStorage.getItem(PM_BREAKDOWN_KEY) || '{}');
    all[sprintId] = data;
    localStorage.setItem(PM_BREAKDOWN_KEY, JSON.stringify(all));
  } catch {}
}

const PM_COLS = [
  { key: 'dev_sp',       label: 'Dev Story Points' },
  { key: 'bug_adhoc',    label: 'Bug fix/AdHoc'    },
  { key: 'tech_init',    label: 'Tech Initiative'  },
  { key: 'meeting',      label: 'Meeting'           },
  { key: 'team_mgmt',    label: 'Team Management'  },
];

const BLANK_BREAKDOWN = { dev_sp: '', bug_adhoc: '', tech_init: '', meeting: '', team_mgmt: '' };

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
  const [date, setDate]             = useState('');
  const [type, setType]             = useState('planned');
  const [notes, setNotes]           = useState('');
  const [pending, setPending]       = useState([]); // { date, type, notes }
  const [saving, setSaving]         = useState(false);

  const addToPending = () => {
    if (!date) return;
    if (pending.find(p => p.date === date)) {
      showToast('Date already in list', 'info'); return;
    }
    setPending(prev => [...prev, { date, type, notes }].sort((a, b) => a.date.localeCompare(b.date)));
    setDate('');
  };

  const removeFromPending = (d) => setPending(prev => prev.filter(p => p.date !== d));

  const handleSaveAll = async () => {
    if (!pending.length) return;
    setSaving(true);
    try {
      for (const p of pending) {
        await createUserLeave({ user: user.id, sprint, date: p.date, leave_type: p.type, notes: p.notes });
      }
      showToast(`${pending.length} leave day(s) recorded for ${user.name}`, 'success');
      setPending([]); setDate(''); setNotes('');
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
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 540, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>📅 Manage Leaves — {user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{user.role || user.team}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
        </div>

        {/* Add Leave — multi-date */}
        <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>Add Leave Days</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addToPending()}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none' }}>
                {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <button onClick={addToPending} disabled={!date}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: !date ? '#e2e8f0' : '#1a56db', color: !date ? '#94a3b8' : 'white', fontWeight: 700, fontSize: 13, cursor: !date ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              + Add
            </button>
          </div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes for selected dates (optional)"
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />

          {/* Pending chips */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Pending ({pending.length} date{pending.length > 1 ? 's' : ''})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pending.map(p => {
                  const ls = leaveStyle(p.type);
                  return (
                    <span key={p.date} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: ls.bg, color: ls.color, fontSize: 12, fontWeight: 700, border: `1px solid ${ls.color}33` }}>
                      📅 {new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      <button onClick={() => removeFromPending(p.date)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ls.color, fontSize: 12, padding: 0, lineHeight: 1, fontWeight: 900 }}>×</button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <button onClick={handleSaveAll} disabled={!pending.length || saving}
            style={{ width: '100%', padding: '9px', borderRadius: 9, border: 'none', background: !pending.length ? 'var(--surface2)' : 'linear-gradient(135deg,#065f46,#059669)', color: !pending.length ? 'var(--text3)' : 'white', fontWeight: 700, fontSize: 13, cursor: !pending.length ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Saving…' : pending.length ? `💾 Save ${pending.length} Leave Day${pending.length > 1 ? 's' : ''}` : 'Add dates above then save'}
          </button>
        </div>

        {/* Existing leaves */}
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
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

/* ── PM Capacity Table ───────────────────────────────────────────────────── */
function PMCapacityTable({ users, sprintId, leaves, caps, onSaveTotalSP, onAddLeave }) {
  const [breakdown,   setBreakdown]   = useState(() => loadPMBreakdown(sprintId));
  const [editCell,    setEditCell]    = useState(null);  // { userId, key }
  const [spError,     setSpError]     = useState(null);  // { userId, key, msg }
  const [editTotalSP, setEditTotalSP] = useState(null);  // { userId, val }
  const [savingTSP,   setSavingTSP]   = useState(null);  // userId being saved
  const [dateEdit,    setDateEdit]    = useState(null);  // userId with open date picker
  const [savingDate,  setSavingDate]  = useState(null);  // userId being saved

  useEffect(() => {
    setBreakdown(loadPMBreakdown(sprintId));
  }, [sprintId]);

  const getRow = (userId) => breakdown[userId] || { ...BLANK_BREAKDOWN };

  const getTotalSP = (userId) => {
    const cap = caps?.find(c => c.user === userId);
    return cap?.base_story_points ?? 0;
  };

  const allotted = (userId) => {
    const r = getRow(userId);
    return PM_COLS.reduce((s, c) => s + (Number(r[c.key]) || 0), 0);
  };

  const handleChange = (userId, key, raw) => {
    const val = raw === '' ? '' : Math.max(0, Number(raw));
    const updated = { ...getRow(userId), [key]: val === '' ? '' : val };
    const newSum = PM_COLS.reduce((s, c) => s + (Number(updated[c.key]) || 0), 0);
    const total = getTotalSP(userId);
    if (val !== '' && total > 0 && newSum > total) {
      setSpError({ userId, key, msg: `Sum (${newSum}) exceeds Total SP (${total})` });
      return;
    }
    setSpError(null);
    const next = { ...breakdown, [userId]: updated };
    setBreakdown(next);
    savePMBreakdown(sprintId, next);
  };

  const handleSaveTotalSP = async (userId) => {
    const sp = parseInt(editTotalSP?.val, 10);
    if (isNaN(sp) || sp < 0) { setEditTotalSP(null); return; }
    setSavingTSP(userId);
    await onSaveTotalSP(userId, sp);
    setSavingTSP(null);
    setEditTotalSP(null);
  };

  const handleDateSave = async (userId, date) => {
    if (!date) return;
    setSavingDate(userId);
    await onAddLeave(userId, date);
    setSavingDate(null);
    setDateEdit(null);
  };

  const plDate = (userId) => {
    const pl = leaves.filter(l => l.user === userId && l.leave_type === 'planned')
      .sort((a, b) => a.date.localeCompare(b.date));
    return pl.length ? pl[0].date : '';
  };

  const totalLeaves = (userId) => leaves.filter(l => l.user === userId).length;

  const thSt = {
    padding: '10px 12px', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.4px',
    color: 'var(--text2)', background: 'var(--surface2)',
    borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap',
    textAlign: 'center',
  };
  const tdSt = {
    padding: '9px 10px', fontSize: 13, borderBottom: '1px solid var(--border)',
    textAlign: 'center', fontFamily: 'DM Mono, monospace',
  };

  if (!users.length) {
    return (
      <div className="card">
        <div className="empty">
          <div className="empty-icon">👥</div>
          <div className="empty-text">No team members found</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
            Team members who report to you will appear here. Contact admin to set up reporting relationships.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">👥 Team Capacity Breakdown</span>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Click any cell to edit · Changes auto-saved · {users.length} members across {[...new Set(users.map(u => u.team))].length} teams</span>
      </div>
      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 900, borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...thSt, textAlign: 'left', minWidth: 160 }}>Member</th>
              <th style={thSt}>Total SP</th>
              {PM_COLS.map(c => (
                <th key={c.key} style={thSt}>{c.label}</th>
              ))}
              <th style={{ ...thSt, color: '#dc2626' }}>Planned Leave / SL</th>
              <th style={{ ...thSt, color: '#065f46' }}>Allotted</th>
              <th style={thSt}>Date of PL</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              // Group users by team
              const grouped = {};
              const teamOrder = [];
              users.forEach(u => {
                const t = String(u.team || 'other');
                if (!grouped[t]) { grouped[t] = []; teamOrder.push(t); }
                grouped[t].push(u);
              });

              return teamOrder.map(teamKey => {
                const teamInfo = TEAM_NAMES[teamKey] || { name: `Team ${teamKey}`, icon: '👥', color: '#64748b', bg: '#f8fafc' };
                const teamUsers = grouped[teamKey];
                return [
                  // ── Team header row ──────────────────────────────────────
                  <tr key={`hdr-${teamKey}`}>
                    <td colSpan={9 + PM_COLS.length} style={{
                      padding: '8px 14px', background: teamInfo.bg,
                      borderBottom: `2px solid ${teamInfo.color}22`,
                      borderTop: '2px solid #e2e8f0',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15 }}>{teamInfo.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: teamInfo.color, fontFamily: 'inherit' }}>{teamInfo.name}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{teamUsers.length} members</span>
                      </div>
                    </td>
                  </tr>,
                  // ── Member rows ─────────────────────────────────────────
                  ...teamUsers.map(u => {
              const row     = getRow(u.id);
              const total   = getTotalSP(u.id);
              const allot   = allotted(u.id);
              const lvCount = totalLeaves(u.id);
              const pl      = plDate(u.id);
              const initials = u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
              const rowHasError = spError?.userId === u.id;

              return (
                <tr key={u.id} style={{ background: rowHasError ? '#fff5f5' : 'white' }}
                  onMouseEnter={e => { if (!rowHasError) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (!rowHasError) e.currentTarget.style.background = 'white'; }}>

                  {/* Member */}
                  <td style={{ ...tdSt, textAlign: 'left', padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>{u.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'inherit' }}>{u.role || '—'}</div>
                        {rowHasError && (
                          <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 700, fontFamily: 'inherit', marginTop: 1 }}>
                            ⚠ {spError.msg}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Total SP — editable */}
                  <td style={{ ...tdSt, cursor: 'pointer', minWidth: 72 }}
                    onClick={() => !editTotalSP && setEditTotalSP({ userId: u.id, val: total || '' })}>
                    {editTotalSP?.userId === u.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number" min="0" max="40"
                          value={editTotalSP.val}
                          autoFocus
                          onChange={e => setEditTotalSP({ userId: u.id, val: e.target.value })}
                          onBlur={() => handleSaveTotalSP(u.id)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveTotalSP(u.id); if (e.key === 'Escape') setEditTotalSP(null); }}
                          style={{ width: 48, padding: '3px 5px', border: '1.5px solid #1a56db', borderRadius: 5, fontSize: 12, fontFamily: 'DM Mono, monospace', textAlign: 'center', outline: 'none' }}
                        />
                        {savingTSP === u.id && <span style={{ fontSize: 10, color: '#64748b' }}>…</span>}
                      </div>
                    ) : (
                      <span style={{
                        fontWeight: 800, color: total ? '#1a56db' : '#94a3b8',
                        padding: '2px 6px', borderRadius: 5,
                        background: total ? 'rgba(26,86,219,.07)' : 'transparent',
                        border: '1px dashed ' + (total ? 'rgba(26,86,219,.2)' : '#cbd5e1'),
                        fontSize: 13,
                      }}>
                        {total || '—'}
                      </span>
                    )}
                  </td>

                  {/* Breakdown cols */}
                  {PM_COLS.map(c => {
                    const isEdit = editCell?.userId === u.id && editCell?.key === c.key;
                    const isErrCell = spError?.userId === u.id && spError?.key === c.key;
                    return (
                      <td key={c.key} style={{ ...tdSt, cursor: 'pointer', minWidth: 80,
                        background: isErrCell ? '#fee2e2' : undefined }}
                        onClick={() => !isEdit && setEditCell({ userId: u.id, key: c.key })}>
                        {isEdit ? (
                          <input
                            type="number" min="0" max={total || 99}
                            value={row[c.key]}
                            autoFocus
                            onChange={e => handleChange(u.id, c.key, e.target.value)}
                            onBlur={() => { setEditCell(null); setSpError(null); }}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { setEditCell(null); setSpError(null); } }}
                            style={{ width: 56, padding: '4px 6px', border: `1.5px solid ${isErrCell ? '#dc2626' : 'var(--accent)'}`, borderRadius: 6, fontSize: 13, fontFamily: 'DM Mono, monospace', textAlign: 'center', outline: 'none' }}
                          />
                        ) : (
                          <span style={{
                            display: 'inline-block', minWidth: 28,
                            padding: '2px 6px', borderRadius: 6,
                            background: row[c.key] ? 'var(--accent-light)' : 'transparent',
                            color: row[c.key] ? 'var(--accent)' : 'var(--text3)',
                            fontWeight: row[c.key] ? 700 : 400,
                          }}>
                            {row[c.key] || '—'}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Planned Leave / SL */}
                  <td style={{ ...tdSt, color: lvCount > 0 ? '#dc2626' : 'var(--text3)', fontWeight: lvCount > 0 ? 700 : 400 }}>
                    {lvCount > 0 ? lvCount : 0}
                  </td>

                  {/* Allotted */}
                  <td style={{ ...tdSt, fontWeight: 800,
                    color: !allot ? 'var(--text3)' : allot > total ? '#dc2626' : allot === total ? '#065f46' : '#d97706' }}>
                    {allot || '—'}
                  </td>

                  {/* Date of PL — date picker */}
                  <td style={{ ...tdSt, minWidth: 120, fontFamily: 'inherit' }}>
                    {dateEdit === u.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="date"
                          defaultValue={pl || ''}
                          autoFocus
                          onChange={e => handleDateSave(u.id, e.target.value)}
                          onBlur={() => setDateEdit(null)}
                          style={{ padding: '3px 6px', border: '1.5px solid #1a56db', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
                        />
                        {savingDate === u.id && <span style={{ fontSize: 10, color: '#64748b' }}>…</span>}
                      </div>
                    ) : (
                      <span
                        onClick={() => setDateEdit(u.id)}
                        style={{
                          cursor: 'pointer', fontSize: 12,
                          fontWeight: pl ? 700 : 400,
                          color: pl ? '#1a56db' : '#94a3b8',
                          padding: '2px 7px', borderRadius: 5,
                          background: pl ? 'rgba(26,86,219,.07)' : 'transparent',
                          border: '1px dashed ' + (pl ? 'rgba(26,86,219,.25)' : '#cbd5e1'),
                          display: 'inline-block', minWidth: 80,
                        }}
                      >
                        {pl
                          ? new Date(pl + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '+ Pick date'}
                      </span>
                    )}
                  </td>
                </tr>
              );
              }) // end teamUsers.map
                ];
              }); // end teamOrder.map
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Team Assignments Panel ──────────────────────────────────────────────── */
function TeamAssignments({ users, onReload, showToast }) {
  const managers = users.filter(u => u.perfiq === 'MANAGER');
  const employees = users.filter(u => u.perfiq !== 'CTO');
  const [saving, setSaving] = useState({}); // { userId: true }
  const [search, setSearch] = useState('');
  const [filterMgr, setFilterMgr] = useState('');

  const handleAssign = async (userId, managerId) => {
    setSaving(p => ({ ...p, [userId]: true }));
    try {
      await assignUserManager(userId, managerId === '' ? null : Number(managerId));
      showToast('Assignment saved', 'success');
      onReload();
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Save failed', 'error');
    }
    setSaving(p => { const n = { ...p }; delete n[userId]; return n; });
  };

  const filtered = employees.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || (u.role || '').toLowerCase().includes(search.toLowerCase());
    const matchMgr = !filterMgr || String(u.reports_to) === filterMgr;
    return matchSearch && matchMgr;
  });

  // Group by current manager
  const grouped = {};
  filtered.forEach(u => {
    const key = u.reports_to ? String(u.reports_to) : 'unassigned';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(u);
  });

  const getMgrName = (id) => {
    if (!id || id === 'unassigned') return 'Unassigned';
    const m = managers.find(m => String(m.id) === String(id));
    return m ? m.name : `#${id}`;
  };

  const thSt = { padding: '9px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--text2)', background: 'var(--surface2)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' };
  const tdSt = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)' };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">🔗 Team Member Assignments</span>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{filtered.length} members</span>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Search by name or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
        <select value={filterMgr} onChange={e => setFilterMgr(e.target.value)}
          style={{ padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none', minWidth: 180 }}>
          <option value="">All managers</option>
          <option value="unassigned">Unassigned</option>
          {managers.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
        </select>
      </div>

      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ ...thSt }}>Member</th>
              <th style={{ ...thSt }}>Role</th>
              <th style={{ ...thSt }}>Team</th>
              <th style={{ ...thSt }}>Current Manager</th>
              <th style={{ ...thSt, minWidth: 220 }}>Assign to Manager</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ ...tdSt, textAlign: 'center', color: 'var(--text3)', padding: '30px' }}>No members found</td></tr>
            )}
            {filtered.map(u => {
              const initials = u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
              const currentMgrName = getMgrName(u.reports_to);
              const isSaving = saving[u.id];
              return (
                <tr key={u.id}
                  style={{ background: 'white' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>

                  <td style={tdSt}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                    </div>
                  </td>

                  <td style={{ ...tdSt, color: 'var(--text2)', fontSize: 12 }}>{u.role || '—'}</td>

                  <td style={{ ...tdSt, fontSize: 12 }}>
                    {u.team ? <span style={{ padding: '2px 8px', borderRadius: 10, background: 'var(--surface2)', fontSize: 11, fontWeight: 700 }}>Team {u.team}</span> : '—'}
                  </td>

                  <td style={{ ...tdSt, fontSize: 12, color: u.reports_to ? '#065f46' : '#dc2626', fontWeight: 600 }}>
                    {currentMgrName}
                  </td>

                  <td style={tdSt}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <select
                        defaultValue={u.reports_to ? String(u.reports_to) : ''}
                        onChange={e => handleAssign(u.id, e.target.value)}
                        disabled={isSaving}
                        style={{ flex: 1, padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', background: 'white', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="">— Unassigned —</option>
                        {managers.map(m => (
                          <option key={m.id} value={String(m.id)}>{m.name} ({m.role})</option>
                        ))}
                      </select>
                      {isSaving && <span style={{ fontSize: 11, color: 'var(--text3)' }}>saving…</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Clarification DM Modal ──────────────────────────────────────────────── */
function ClarifyModal({ member, manager, sprint, statusLabel, onClose, showToast }) {
  const [target,  setTarget]  = useState('member');
  const [message, setMessage] = useState(
    `Hi, regarding sprint "${sprint?.name || '—'}": ${member?.name} is ${statusLabel}. Could you please clarify?`
  );
  const [sending, setSending] = useState(false);

  const targetUser = target === 'member' ? member : manager;

  const handleSend = async () => {
    if (!targetUser || !message.trim()) return;
    setSending(true);
    try {
      const roomRes = await getOrCreateDirectRoom(targetUser.id);
      const fd = new FormData();
      fd.append('content', message.trim());
      await sendChatMessage(roomRes.data.id, fd);
      showToast(`Message sent to ${targetUser.name}`, 'success');
      onClose();
    } catch {
      showToast('Failed to send message', 'error');
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.22)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>💬 Ask Clarification</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              <span style={{ fontWeight: 700, color: statusLabel.includes('over') ? '#dc2626' : '#d97706' }}>{member?.name}</span>
              {' '}is <b>{statusLabel}</b>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
        </div>

        {/* Target selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { id: 'member',  label: `👤 ${member?.name}`, sub: 'Team Member' },
            { id: 'manager', label: `🗂️ ${manager?.name || 'No Manager'}`, sub: 'Manager', disabled: !manager },
          ].map(opt => (
            <button key={opt.id} onClick={() => !opt.disabled && setTarget(opt.id)} disabled={opt.disabled}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10, textAlign: 'left', cursor: opt.disabled ? 'not-allowed' : 'pointer',
                border: target === opt.id ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                background: target === opt.id ? 'var(--accent-light)' : 'white',
                opacity: opt.disabled ? 0.45 : 1, fontFamily: 'inherit',
              }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: target === opt.id ? 'var(--accent)' : 'var(--text)' }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{opt.sub}</div>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Message</label>
          <textarea
            value={message} onChange={e => setMessage(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: 'var(--surface2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSend} disabled={sending || !message.trim() || !targetUser}
            style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: (!message.trim() || !targetUser) ? .5 : 1 }}>
            {sending ? '⏳ Sending…' : '📨 Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Team detail modal (opened from a team card) ─────────────────────────── */
function TeamDetailModal({ teamKey, teamInfo, teamUsers, allUsers, caps, leaves, summary, editSp, setEditSp, savingIds, handleSpSave, isReadOnly, onClarify, onLeave, onClose }) {
  const getCapForUser    = (uid) => caps.find(c => c.user === uid);
  const getLeavesForUser = (uid) => leaves.filter(l => l.user === uid);
  const getSummaryUser   = (uid) => summary?.users?.find(su => su.user_id === uid);

  const thSt = { padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--text2)', background: 'var(--surface2)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center' };
  const tdSt = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', textAlign: 'center' };

  const totalAvail   = teamUsers.reduce((s, u) => s + (getSummaryUser(u.id)?.available_sp ?? 0), 0);
  const totalPlanned = teamUsers.reduce((s, u) => s + (getSummaryUser(u.id)?.planned_sp   ?? 0), 0);
  const overCount    = teamUsers.filter(u => getSummaryUser(u.id)?.over_capacity).length;
  const underCount   = teamUsers.filter(u => getSummaryUser(u.id)?.under_capacity).length;
  const utilPct      = totalAvail > 0 ? Math.round((totalPlanned / totalAvail) * 100) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: 20, width: '92vw', maxWidth: 1000, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 96px rgba(0,0,0,.22)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 28px 16px', borderBottom: '2px solid var(--border)', background: teamInfo.bg, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${teamInfo.color}18`, border: `2px solid ${teamInfo.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{teamInfo.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: teamInfo.color }}>{teamInfo.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{teamUsers.length} members · Click any SP to edit · 💬 Ask on flagged rows</div>
            </div>
            {/* Team-level SP summary */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {[
                { label: 'Available SP', val: totalAvail,   color: '#065f46', bg: '#f0fdf4' },
                { label: 'Planned SP',   val: totalPlanned, color: totalPlanned > totalAvail ? '#dc2626' : '#1a56db', bg: totalPlanned > totalAvail ? '#fef2f2' : '#eff6ff' },
                { label: 'Utilization',  val: `${utilPct}%`, color: utilPct > 100 ? '#dc2626' : utilPct < 70 ? '#d97706' : '#065f46', bg: '#f8fafc' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', background: s.bg, borderRadius: 10, padding: '8px 14px', minWidth: 80 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{s.label}</div>
                </div>
              ))}
              {overCount  > 0 && <span style={{ padding: '4px 10px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700 }}>🔴 {overCount} over</span>}
              {underCount > 0 && <span style={{ padding: '4px 10px', borderRadius: 10, background: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 700 }}>⚠️ {underCount} under</span>}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b', padding: '0 4px', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 780 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr>
                <th style={{ ...thSt, textAlign: 'left', minWidth: 200 }}>Member</th>
                <th style={thSt}>Base SP</th>
                <th style={{ ...thSt, color: '#1a56db' }}>Plan. Leave</th>
                <th style={{ ...thSt, color: '#dc2626' }}>Sick Leave</th>
                <th style={{ ...thSt, color: '#065f46' }}>Available SP</th>
                <th style={thSt}>Planned SP</th>
                <th style={{ ...thSt, minWidth: 130 }}>Utilization</th>
                <th style={thSt}>Status</th>
                <th style={thSt}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamUsers.map(u => {
                const cap      = getCapForUser(u.id);
                const uLeaves  = getLeavesForUser(u.id);
                const su       = getSummaryUser(u.id);
                const baseSp   = cap?.base_story_points ?? 0;
                const availSp  = su?.available_sp       ?? baseSp;
                const plannedSp= su?.planned_sp         ?? 0;
                const pLeave   = su?.planned_leave_days ?? 0;
                const sLeave   = su?.sick_leave_days    ?? 0;
                const uPct     = su?.utilization_pct    ?? 0;
                const isOver   = su?.over_capacity;
                const isUnder  = su?.under_capacity;
                const isEditing= editSp[u.id] !== undefined;
                const initials = u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                const manager  = allUsers.find(m => m.id === u.reports_to);
                const statusLabel = isOver ? 'over capacity' : 'under-utilized';
                const rowBg = isOver ? '#fff5f5' : isUnder ? '#fffdf0' : 'white';

                return (
                  <tr key={u.id} style={{ background: rowBg }}
                    onMouseEnter={e => { if (!isOver && !isUnder) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}>

                    {/* Member */}
                    <td style={{ ...tdSt, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${teamInfo.color},#0d9488)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text2)' }}>{u.role || '—'}</div>
                          {manager && <div style={{ fontSize: 10, color: '#94a3b8' }}>↑ {manager.name}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Base SP */}
                    <td style={{ ...tdSt, fontFamily: 'DM Mono, monospace' }}>
                      {!isReadOnly && isEditing ? (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <input type="number" min="0" value={editSp[u.id]}
                            onChange={e => setEditSp(p => ({ ...p, [u.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleSpSave(u.id); if (e.key === 'Escape') setEditSp(p => { const n={...p}; delete n[u.id]; return n; }); }}
                            style={{ width: 60, padding: '4px 6px', border: '1.5px solid var(--accent)', borderRadius: 6, fontSize: 13, fontFamily: 'DM Mono, monospace', outline: 'none', textAlign: 'center' }} autoFocus />
                          <button onClick={() => handleSpSave(u.id)} disabled={savingIds.has(u.id)}
                            style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 11, cursor: 'pointer' }}>
                            {savingIds.has(u.id) ? '…' : '✓'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: baseSp ? 'var(--text)' : 'var(--text3)' }}>{baseSp || '—'}</span>
                          {!isReadOnly && (
                            <button onClick={() => setEditSp(p => ({ ...p, [u.id]: baseSp }))}
                              style={{ background: 'var(--accent-light)', border: 'none', color: 'var(--accent)', borderRadius: 5, padding: '1px 6px', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>✎</button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Planned Leave */}
                    <td style={{ ...tdSt, fontFamily: 'DM Mono, monospace', color: pLeave > 0 ? '#1a56db' : 'var(--text3)', fontWeight: pLeave > 0 ? 700 : 400 }}>{pLeave}d</td>

                    {/* Sick Leave */}
                    <td style={{ ...tdSt, fontFamily: 'DM Mono, monospace', color: sLeave > 0 ? '#dc2626' : 'var(--text3)', fontWeight: sLeave > 0 ? 700 : 400 }}>{sLeave}d</td>

                    {/* Available SP */}
                    <td style={{ ...tdSt, fontFamily: 'DM Mono, monospace' }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: availSp < baseSp * 0.7 ? '#dc2626' : '#065f46' }}>{availSp || '—'}</span>
                      {(pLeave + sLeave) > 0 && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{baseSp}−{pLeave+sLeave}d</div>}
                    </td>

                    {/* Planned SP */}
                    <td style={{ ...tdSt, fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: 15, color: isOver ? '#dc2626' : 'var(--text)' }}>{plannedSp || '—'}</td>

                    {/* Utilization */}
                    <td style={{ ...tdSt, minWidth: 130 }}>
                      {availSp > 0 ? <UtilBar pct={uPct} over={isOver} under={isUnder} /> : <span style={{ fontSize: 11, color: 'var(--text3)' }}>Not set</span>}
                    </td>

                    {/* Status */}
                    <td style={tdSt}>
                      {!baseSp ? <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                        : isOver  ? <span className="badge badge-red">🔴 Over</span>
                        : isUnder ? <span className="badge badge-amber">⚠️ Under</span>
                        :           <span className="badge badge-green">✅ OK</span>}
                    </td>

                    {/* Actions */}
                    <td style={tdSt}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {!isReadOnly && (
                          <button onClick={() => onLeave(u, uLeaves)}
                            style={{ padding: '4px 9px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            📅{uLeaves.length > 0 ? ` ${uLeaves.length}` : ''}
                          </button>
                        )}
                        {(isOver || isUnder) && (
                          <button onClick={() => onClarify(u, manager, statusLabel)}
                            style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: isOver ? '#fef2f2' : '#fef3c7', color: isOver ? '#dc2626' : '#d97706', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            💬 Ask
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── SM / CTO — team card grid ───────────────────────────────────────────── */
function TeamCapacityView({ users, sprints, sprintId, caps, leaves, summary, editSp, setEditSp, savingIds, handleSpSave, isReadOnly, onClarify, onLeave }) {
  const [openTeam, setOpenTeam] = useState(null); // teamKey of expanded card

  const getSummaryUser = (uid) => summary?.users?.find(su => su.user_id === uid);

  // Build team groups
  const grouped = {};
  const teamOrder = [];
  users.forEach(u => {
    const t = String(u.team || 'other');
    if (!grouped[t]) { grouped[t] = []; teamOrder.push(t); }
    grouped[t].push(u);
  });

  return (
    <>
      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
        {teamOrder.map(teamKey => {
          const teamInfo  = TEAM_NAMES[teamKey] || { name: `Team ${teamKey}`, icon: '👥', color: '#64748b', bg: '#f8fafc' };
          const teamUsers = grouped[teamKey];

          const totalAvail   = teamUsers.reduce((s, u) => s + (getSummaryUser(u.id)?.available_sp ?? 0), 0);
          const totalPlanned = teamUsers.reduce((s, u) => s + (getSummaryUser(u.id)?.planned_sp   ?? 0), 0);
          const overCount    = teamUsers.filter(u => getSummaryUser(u.id)?.over_capacity).length;
          const underCount   = teamUsers.filter(u => getSummaryUser(u.id)?.under_capacity).length;
          const okCount      = teamUsers.filter(u => { const su = getSummaryUser(u.id); return su?.available_sp > 0 && !su?.over_capacity && !su?.under_capacity; }).length;
          const utilPct      = totalAvail > 0 ? Math.round((totalPlanned / totalAvail) * 100) : 0;
          const utilColor    = utilPct > 100 ? '#dc2626' : utilPct < 70 ? '#d97706' : '#059669';

          return (
            <div key={teamKey}
              onClick={() => setOpenTeam(teamKey)}
              style={{
                background: 'white', borderRadius: 16, border: `1.5px solid ${teamInfo.color}30`,
                boxShadow: `0 2px 12px ${teamInfo.color}12`, cursor: 'pointer',
                transition: 'transform .15s, box-shadow .15s', overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${teamInfo.color}28`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 2px 12px ${teamInfo.color}12`; }}
            >
              {/* Card top bar */}
              <div style={{ background: teamInfo.bg, padding: '14px 18px 12px', borderBottom: `2px solid ${teamInfo.color}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${teamInfo.color}18`, border: `2px solid ${teamInfo.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{teamInfo.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: teamInfo.color, lineHeight: 1.2 }}>{teamInfo.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{teamUsers.length} member{teamUsers.length !== 1 ? 's' : ''}</div>
                  </div>
                  {/* Alert badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                    {overCount  > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fef2f2', color: '#dc2626' }}>🔴 {overCount} over</span>}
                    {underCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fef3c7', color: '#d97706' }}>⚠️ {underCount} under</span>}
                    {overCount === 0 && underCount === 0 && okCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#059669' }}>✅ Balanced</span>}
                  </div>
                </div>
              </div>

              {/* SP stats */}
              <div style={{ padding: '14px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Available SP', val: totalAvail,   color: '#065f46', bg: '#f0fdf4' },
                    { label: 'Planned SP',   val: totalPlanned, color: totalPlanned > totalAvail ? '#dc2626' : '#1a56db', bg: totalPlanned > totalAvail ? '#fef2f2' : '#eff6ff' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Utilization bar */}
                {totalAvail > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Team Utilization</span>
                      <span style={{ fontWeight: 800, color: utilColor }}>{utilPct}%</span>
                    </div>
                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(utilPct, 100)}%`, background: utilColor, borderRadius: 4, transition: 'width .5s ease' }} />
                    </div>
                  </div>
                )}

                {/* Member avatars row */}
                <div style={{ display: 'flex', marginTop: 14, alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex' }}>
                    {teamUsers.slice(0, 6).map((u, i) => {
                      const initials = u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                      const su = getSummaryUser(u.id);
                      const dotColor = su?.over_capacity ? '#dc2626' : su?.under_capacity ? '#d97706' : '#059669';
                      return (
                        <div key={u.id} title={u.name} style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${teamInfo.color},#0d9488)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white', border: '2px solid white', marginLeft: i > 0 ? -8 : 0, position: 'relative', zIndex: teamUsers.length - i, boxShadow: `0 0 0 2px ${dotColor}` }}>
                          {initials}
                        </div>
                      );
                    })}
                    {teamUsers.length > 6 && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748b', border: '2px solid white', marginLeft: -8 }}>
                        +{teamUsers.length - 6}
                      </div>
                    )}
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: teamInfo.color, fontWeight: 700 }}>View details →</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Team detail modal */}
      {openTeam && grouped[openTeam] && (
        <TeamDetailModal
          teamKey={openTeam}
          teamInfo={TEAM_NAMES[openTeam] || { name: `Team ${openTeam}`, icon: '👥', color: '#64748b', bg: '#f8fafc' }}
          teamUsers={grouped[openTeam]}
          allUsers={users}
          caps={caps}
          leaves={leaves}
          summary={summary}
          editSp={editSp}
          setEditSp={setEditSp}
          savingIds={savingIds}
          handleSpSave={handleSpSave}
          isReadOnly={isReadOnly}
          onClarify={onClarify}
          onLeave={onLeave}
          onClose={() => setOpenTeam(null)}
        />
      )}
    </>
  );
}

export default function CapacityTracker() {
  const { user }   = useAuth();
  const showToast  = useToast();
  const isCTO      = user?.perfiq === 'CTO';
  const isSM       = user?.role === 'Scrum Master';
  const isManager  = user?.perfiq === 'MANAGER' || isCTO;
  const isPM       = user?.role === 'Product Manager';
  const isReadOnly = isSM; // SM sees team view but cannot edit SP/leaves

  const [tab,       setTab]       = useState('capacity'); // 'capacity' | 'assignments'
  const [sprints,   setSprints]   = useState([]);
  const [users,     setUsers]     = useState([]);
  const [sprintId,  setSprintId]  = useState('');
  const [caps,      setCaps]      = useState([]);
  const [leaves,    setLeaves]    = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [leaveModal,   setLeaveModal]   = useState(null); // { user, leaves }
  const [clarifyModal, setClarifyModal] = useState(null); // { member, manager, statusLabel }
  const [editSp,    setEditSp]    = useState({}); // { userId: value }
  const [savingIds, setSavingIds] = useState(new Set());

  // Managers who have direct reports see the PM Breakdown view (team-scoped)
  // CTO sees the full standard table
  const myTeam     = users.filter(u => u.reports_to === user?.id);
  const isTeamView = (isManager && user?.perfiq !== 'CTO' && myTeam.length > 0) || isPM;

  // Apply per-PM team filter (e.g. Manoj only sees Debuggers + Core Blasters)
  const visibleTeams = user?.id ? PM_VISIBLE_TEAMS[user.id] : null;
  const pmUsers = visibleTeams
    ? myTeam.filter(u => visibleTeams.includes(String(u.team)))
    : myTeam;

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

  if (!isManager && user?.role !== 'Scrum Master' && user?.perfiq !== 'CTO' && !isPM) {
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Tab switcher — only show Assignments tab for CTO */}
          {user?.perfiq === 'CTO' && (
            <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, padding: 3, gap: 2 }}>
              {[
                { id: 'capacity',    label: '📊 Capacity' },
                { id: 'assignments', label: '🔗 Assignments' },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    background: tab === t.id ? 'white' : 'transparent',
                    color: tab === t.id ? 'var(--accent)' : 'var(--text2)',
                    boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                  }}>{t.label}</button>
              ))}
            </div>
          )}
          {tab === 'capacity' && (
            <select value={sprintId} onChange={e => setSprintId(e.target.value)}
              style={{ padding: '9px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', background: 'white', minWidth: 220, outline: 'none' }}>
              <option value="">— Select sprint —</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.id} · {s.name} ({s.status})</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Sprint summary banner */}
      {tab === 'capacity' && summary && (
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

      {/* Team Assignments tab */}
      {tab === 'assignments' && (
        <TeamAssignments
          users={users}
          showToast={showToast}
          onReload={() => getUsers().then(r => setUsers(r.data))}
        />
      )}

      {/* Main capacity table */}
      {tab === 'capacity' && (loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>Loading capacity data…</div>
      ) : !sprintId ? (
        <div className="empty"><div className="empty-icon">📊</div><div className="empty-text">Select a sprint to view capacity</div></div>
      ) : isTeamView ? (
        /* PM / Manager with direct reports: breakdown view */
        <PMCapacityTable
          users={pmUsers}
          sprintId={sprintId}
          leaves={leaves}
          caps={caps}
          onSaveTotalSP={async (userId, sp) => {
            try {
              await setSprintCapacity({ user: userId, sprint: sprintId, base_story_points: sp });
              await loadCapacity();
            } catch (e) {
              showToast(e?.response?.data?.detail || 'Save failed', 'error');
            }
          }}
          onAddLeave={async (userId, date) => {
            try {
              await createUserLeave({ user: userId, sprint: sprintId, date, leave_type: 'planned' });
              await loadCapacity();
            } catch (e) {
              showToast(e?.response?.data?.non_field_errors?.[0] || 'Failed to save leave', 'error');
            }
          }}
        />
      ) : (isCTO || isSM) ? (
        /* CTO / SM: team-grouped overview with clarification buttons */
        <TeamCapacityView
          users={users}
          sprints={sprints}
          sprintId={sprintId}
          caps={caps}
          leaves={leaves}
          summary={summary}
          editSp={editSp}
          setEditSp={setEditSp}
          savingIds={savingIds}
          handleSpSave={handleSpSave}
          isReadOnly={isReadOnly}
          onClarify={(member, manager, statusLabel) => setClarifyModal({ member, manager, statusLabel })}
          onLeave={(u, uLeaves) => setLeaveModal({ user: u, leaves: uLeaves })}
        />
      ) : null)}

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

      {/* Clarify Modal */}
      {clarifyModal && (
        <ClarifyModal
          member={clarifyModal.member}
          manager={clarifyModal.manager}
          sprint={sprints.find(s => s.id === sprintId)}
          statusLabel={clarifyModal.statusLabel}
          onClose={() => setClarifyModal(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
