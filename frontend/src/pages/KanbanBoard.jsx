import { useState, useEffect, useCallback } from 'react';
import { getRequirements, updateRequirement, getSprints, getUsers, createRequirement, createSprint } from '../api';
import { useAuth } from '../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const COLUMNS = [
  { status: 'Open',        label: 'Open',        icon: '📋', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', darkBg: '#dbeafe' },
  { status: 'In Progress', label: 'In Progress',  icon: '⚡', color: '#a16207', bg: '#fef9c3', border: '#fde68a', darkBg: '#fef08a' },
  { status: 'Review',      label: 'Review',       icon: '🔍', color: '#7e22ce', bg: '#fdf4ff', border: '#e9d5ff', darkBg: '#f3e8ff' },
  { status: 'Done',        label: 'Done',         icon: '✅', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', darkBg: '#dcfce7' },
];

const PRIORITY_COLOR = {
  Critical: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  High:     { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
  Medium:   { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  Low:      { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
};

const ITEM_TYPE_COLOR = {
  REQ:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Bug:    { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  Task:   { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  QA:     { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  Report: { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
  TI:     { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  Spike:  { bg: '#fefce8', color: '#854d0e', border: '#fef08a' },
  Adhoc:  { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
};

const TIMER_CONFIG = {
  done:     { bg: '#f0fdf4', color: '#15803d', icon: '✅', label: 'Done' },
  on_track: { bg: '#eff6ff', color: '#1d4ed8', icon: '⏱',  label: 'On Track' },
  at_risk:  { bg: '#fff7ed', color: '#ea580c', icon: '⚠️', label: 'At Risk' },
  breached: { bg: '#fef2f2', color: '#dc2626', icon: '🚨', label: 'Breached' },
  pending:  { bg: '#f8fafc', color: '#64748b', icon: '📅', label: 'No Date' },
};

const ITEM_TYPES = ['REQ', 'Bug', 'Task', 'QA', 'Report', 'TI', 'Spike', 'Adhoc'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

// Teams excluded from Capacity Tracker — shown in Kanban Board instead
const KANBAN_TEAM_LIST = [
  { key: 'do',  name: 'DevOps',                  icon: '⚙️', color: '#475569', bg: '#f8fafc' },
  { key: 'nw',  name: 'Network',                 icon: '🌐', color: '#0284c7', bg: '#f0f9ff' },
  { key: 'dt',  name: 'Data Team',               icon: '📊', color: '#7c3aed', bg: '#faf5ff' },
  { key: 'ui',  name: 'UI',                      icon: '🎨', color: '#db2777', bg: '#fdf2f8' },
  { key: 'rc',  name: 'Regional Coordinators',   icon: '🗺️', color: '#0d9488', bg: '#f0fdfa' },
];

// ── Small helpers ─────────────────────────────────────────────────────────────

function Chip({ label, color, bg, border }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: bg, color, border: `1px solid ${border || bg}` }}>
      {label}
    </span>
  );
}

function Avatar({ name, size = 24 }) {
  const initials = name ? name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() : '?';
  return (
    <div title={name} style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function TimerBadge({ timerStatus, daysRemaining }) {
  const cfg = TIMER_CONFIG[timerStatus] || TIMER_CONFIG.pending;
  if (!timerStatus || timerStatus === 'pending') return null;
  const label = timerStatus === 'done' ? 'Done'
    : daysRemaining === 0 ? 'Today'
    : daysRemaining < 0  ? `${Math.abs(daysRemaining)}d over`
    : `${daysRemaining}d left`;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.icon} {label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function KanbanBoard() {
  const { user } = useAuth();
  const [reqs,     setReqs]     = useState([]);
  const [sprints,  setSprints]  = useState([]);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Filters
  const [filterSprint,   setFilterSprint]   = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterType,     setFilterType]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTeams,    setFilterTeams]    = useState(KANBAN_TEAM_LIST.map(t => t.key)); // all kanban teams selected by default
  const [search,         setSearch]         = useState('');
  const [swimlane,       setSwimlane]       = useState('none'); // 'none' | 'assignee' | 'type'

  const toggleKanbanTeam = (key) =>
    setFilterTeams(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  // DnD
  const [dragId,   setDragId]   = useState(null);
  const [dragOver, setDragOver] = useState(null); // `${colStatus}__${swimKey}` or just colStatus

  // Detail panel
  const [panel, setPanel] = useState(null); // req object

  // Quick add modal
  const [quickAdd, setQuickAdd] = useState(null); // { status: col.status }

  // New sprint board modal (SM only)
  const [sprintModal, setSprintModal] = useState(false);

  const isSM = user?.role === 'Scrum Master';

  // ── Load ─────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes, uRes] = await Promise.all([
        getRequirements(),
        getSprints(),
        getUsers(),
      ]);
      setReqs(rRes.data);
      setSprints(sRes.data);
      setUsers(uRes.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtering ─────────────────────────────────────────────────────────────

  // Build a set of user IDs belonging to selected kanban teams
  const kanbanUserIds = new Set(
    users.filter(u => filterTeams.includes(u.team)).map(u => u.id)
  );

  const filtered = reqs.filter(r => {
    if (filterSprint   && String(r.sprint) !== filterSprint) return false;
    if (filterAssignee && String(r.assignee) !== filterAssignee) return false;
    if (filterType     && r.item_type !== filterType) return false;
    if (filterPriority && r.priority !== filterPriority) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    // Team filter: show only items assigned to members of selected kanban teams
    // (unassigned items shown when no specific assignee filter is active)
    if (filterTeams.length && r.assignee && !kanbanUserIds.has(r.assignee)) return false;
    return true;
  });

  // ── DnD ──────────────────────────────────────────────────────────────────

  const handleDrop = async (targetStatus, swimKey) => {
    if (!dragId) return;
    const item = reqs.find(r => r.id === dragId);
    if (!item || item.status === targetStatus) { setDragId(null); setDragOver(null); return; }
    setReqs(prev => prev.map(r => r.id === dragId ? { ...r, status: targetStatus } : r));
    setDragId(null); setDragOver(null);
    try {
      await updateRequirement(dragId, { status: targetStatus });
    } catch {
      loadData(); // revert on error
    }
  };

  // ── Quick status change from panel ────────────────────────────────────────

  const quickStatus = async (reqId, newStatus) => {
    setReqs(prev => prev.map(r => r.id === reqId ? { ...r, status: newStatus } : r));
    setPanel(prev => prev ? { ...prev, status: newStatus } : prev);
    try { await updateRequirement(reqId, { status: newStatus }); }
    catch { loadData(); }
  };

  // ── Swimlane groups ───────────────────────────────────────────────────────

  let swimGroups = [{ key: '__all__', label: null, items: filtered }];
  if (swimlane === 'assignee') {
    const groups = {};
    filtered.forEach(r => {
      const k = r.assignee ? String(r.assignee) : '__unassigned__';
      const label = r.assignee_name || 'Unassigned';
      if (!groups[k]) groups[k] = { key: k, label, items: [] };
      groups[k].items.push(r);
    });
    swimGroups = Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
  } else if (swimlane === 'type') {
    const groups = {};
    filtered.forEach(r => {
      const k = r.item_type || 'REQ';
      if (!groups[k]) groups[k] = { key: k, label: k, items: [] };
      groups[k].items.push(r);
    });
    swimGroups = Object.values(groups).sort((a, b) => ITEM_TYPES.indexOf(a.key) - ITEM_TYPES.indexOf(b.key));
  }

  // ── Stats bar ─────────────────────────────────────────────────────────────

  const totalBreached = filtered.filter(r => r.timer_status === 'breached').length;
  const totalAtRisk   = filtered.filter(r => r.timer_status === 'at_risk').length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Kanban Board</h1>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: '3px 0 0' }}>
              {filtered.length} items
              {totalBreached > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}> · {totalBreached} breached</span>}
              {totalAtRisk   > 0 && <span style={{ color: '#ea580c', fontWeight: 600 }}> · {totalAtRisk} at-risk</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isSM && (
              <button onClick={() => setSprintModal(true)} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                + New Sprint Board
              </button>
            )}
            <button onClick={loadData} style={{ padding: '8px 16px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters toolbar ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title or ID…"
          style={{ padding: '7px 11px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', minWidth: 180 }}
        />
        <select value={filterSprint} onChange={e => setFilterSprint(e.target.value)}
          style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All Sprints</option>
          {sprints.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
          style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All Assignees</option>
          {users.filter(u => filterTeams.includes(u.team)).map(u => <option key={u.id} value={String(u.id)}>{u.name || u.email}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All Types</option>
          {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          style={{ padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Team chips */}
        <div style={{ width: '100%', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginRight: 2 }}>Teams:</span>
          {KANBAN_TEAM_LIST.map(t => {
            const active = filterTeams.includes(t.key);
            return (
              <button key={t.key} onClick={() => toggleKanbanTeam(t.key)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
                  border: `1.5px solid ${active ? t.color : 'var(--border)'}`,
                  background: active ? t.bg : 'white',
                  color: active ? t.color : 'var(--text2)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                }}>
                {t.icon} {t.name}
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Swimlanes:</span>
          {[['none','Off'], ['assignee','Assignee'], ['type','Type']].map(([val, lbl]) => (
            <button key={val} onClick={() => setSwimlane(val)}
              style={{ padding: '6px 11px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: swimlane === val ? 'var(--accent)' : 'white', color: swimlane === val ? 'white' : 'var(--text2)', fontFamily: 'inherit' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Column headers (sticky) ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 10, position: 'sticky', top: 0, zIndex: 10 }}>
        {COLUMNS.map(col => {
          const count = filtered.filter(r => r.status === col.status).length;
          return (
            <div key={col.status} style={{ background: col.bg, border: `1.5px solid ${col.border}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: col.color }}>{col.icon} {col.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: col.color, background: 'rgba(255,255,255,.7)', borderRadius: 20, padding: '2px 9px' }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* ── Board ────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 15 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {swimGroups.map(group => (
            <div key={group.key}>
              {/* Swimlane header */}
              {group.label && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '6px 0' }}>
                  <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: 'var(--text2)', padding: '4px 12px', background: 'white', border: '1px solid var(--border)', borderRadius: 20 }}>
                    {swimlane === 'assignee' ? <Avatar name={group.label} size={20} /> : null}
                    {group.label}
                    <span style={{ color: 'var(--text3)', fontWeight: 500 }}>({group.items.length})</span>
                  </div>
                  <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                </div>
              )}

              {/* 4-column grid for this swimlane */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'start' }}>
                {COLUMNS.map(col => {
                  const colItems = group.items.filter(r => r.status === col.status);
                  const dropKey  = `${col.status}__${group.key}`;
                  const isOver   = dragOver === dropKey;

                  return (
                    <div
                      key={col.status}
                      onDragOver={e => { e.preventDefault(); setDragOver(dropKey); }}
                      onDragEnter={e => { e.preventDefault(); setDragOver(dropKey); }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
                      onDrop={e => { e.preventDefault(); handleDrop(col.status, group.key); }}
                      style={{
                        background: isOver ? col.darkBg : 'var(--surface2)',
                        border: `2px solid ${isOver ? col.color : 'var(--border)'}`,
                        borderRadius: 12,
                        minHeight: 120,
                        transition: 'border-color .15s, background .15s',
                      }}
                    >
                      {/* Cards */}
                      <div className="anim-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 10px 4px' }}>
                        {colItems.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--text3)', fontSize: 12, fontStyle: 'italic' }}>
                            {isOver ? '⬇ Drop here' : 'Empty'}
                          </div>
                        )}
                        {colItems.map(r => <KanbanCard key={r.id} r={r} dragId={dragId} setDragId={setDragId} setDragOver={setDragOver} onOpen={() => setPanel(r)} />)}
                      </div>
                      {/* + Add button — only on Open column */}
                      {col.status === 'Open' && (
                        <div style={{ padding: '4px 10px 10px' }}>
                          <button
                            onClick={() => setQuickAdd({ status: col.status })}
                            style={{ width: '100%', padding: '6px 0', border: `1.5px dashed ${col.border}`, borderRadius: 8, background: 'transparent', color: col.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: 0.7, transition: 'opacity .15s' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                          >
                            + Add
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail panel ─────────────────────────────────────────── */}
      {panel && (
        <DetailPanel
          req={panel}
          onClose={() => setPanel(null)}
          onStatusChange={(id, s) => quickStatus(id, s)}
          onRefresh={() => { loadData(); setPanel(null); }}
        />
      )}

      {/* ── Quick Add Modal ───────────────────────────────────────── */}
      {quickAdd && (
        <QuickAddModal
          initialStatus={quickAdd.status}
          sprints={sprints}
          onClose={() => setQuickAdd(null)}
          onSaved={() => { setQuickAdd(null); loadData(); }}
        />
      )}

      {/* ── New Sprint Board Modal (SM only) ─────────────────────── */}
      {sprintModal && (
        <NewSprintModal
          onClose={() => setSprintModal(false)}
          onCreated={(sprint) => {
            setSprintModal(false);
            setSprints(prev => [...prev, sprint]);
            setFilterSprint(String(sprint.id));
          }}
        />
      )}
    </div>
  );
}

// ── Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({ r, dragId, setDragId, setDragOver, onOpen }) {
  const pc  = PRIORITY_COLOR[r.priority]   || PRIORITY_COLOR.Medium;
  const itc = ITEM_TYPE_COLOR[r.item_type] || ITEM_TYPE_COLOR.REQ;
  const isDragging = dragId === r.id;

  return (
    <div
      draggable
      onDragStart={() => setDragId(r.id)}
      onDragEnd={() => { setDragId(null); setDragOver(null); }}
      onClick={onOpen}
      className="card-lift"
      style={{
        background: isDragging ? '#f1f5f9' : 'white',
        border: `1px solid ${r.timer_status === 'breached' ? '#fca5a5' : 'var(--border)'}`,
        borderLeft: `3px solid ${pc.color}`,
        borderRadius: 10,
        padding: '10px 12px',
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: isDragging ? 0.45 : 1,
        transition: 'opacity .15s',
        userSelect: 'none',
      }}
    >
      {/* Top row: ID + timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 4 }}>
        <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.id}</span>
        <TimerBadge timerStatus={r.timer_status} daysRemaining={r.days_remaining} />
      </div>

      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {r.title}
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <Chip label={r.item_type || 'REQ'} color={itc.color} bg={itc.bg} border={itc.border} />
        <Chip label={r.priority}            color={pc.color}  bg={pc.bg}  border={pc.border} />
        {r.story_points && <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>{r.story_points} SP</span>}
      </div>

      {/* Footer: assignee + meta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {r.assignee_name && <Avatar name={r.assignee_name} size={20} />}
          {r.sprint_name   && <span style={{ fontSize: 10, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>🏃 {r.sprint_name}</span>}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {r.comment_count > 0    && <span style={{ fontSize: 10, color: 'var(--text3)' }}>💬{r.comment_count}</span>}
          {r.children_count > 0   && <span style={{ fontSize: 10, color: 'var(--text3)' }}>📋{r.children_count}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ req, onClose, onStatusChange, onRefresh }) {
  const pc  = PRIORITY_COLOR[req.priority]   || PRIORITY_COLOR.Medium;
  const itc = ITEM_TYPE_COLOR[req.item_type] || ITEM_TYPE_COLOR.REQ;
  const timerCfg = TIMER_CONFIG[req.timer_status] || TIMER_CONFIG.pending;

  const dueLabel = req.end_date
    ? new Date(req.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const startLabel = req.start_date
    ? new Date(req.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,40,.35)', zIndex: 200, backdropFilter: 'blur(2px)' }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: 'white', zIndex: 201, overflowY: 'auto',
        boxShadow: '-8px 0 48px rgba(15,20,40,.18)',
        animation: 'slideInRight .28s cubic-bezier(.22,1,.36,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 5 }}>{req.id}</div>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, color: 'var(--text)' }}>{req.title}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)', padding: 4, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            <Chip label={req.item_type || 'REQ'} color={itc.color} bg={itc.bg} border={itc.border} />
            <Chip label={req.priority}            color={pc.color}  bg={pc.bg}  border={pc.border} />
            {req.story_points && <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, padding: '2px 8px', background: '#f5f3ff', borderRadius: 6 }}>{req.story_points} SP</span>}
          </div>
        </div>

        {/* Status quick-switch */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Status</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COLUMNS.map(col => (
              <button
                key={col.status}
                onClick={() => onStatusChange(req.id, col.status)}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${req.status === col.status ? col.color : 'var(--border)'}`,
                  background: req.status === col.status ? col.bg : 'white',
                  color: req.status === col.status ? col.color : 'var(--text2)',
                  fontWeight: req.status === col.status ? 700 : 500,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .15s',
                }}
              >
                {col.icon} {col.label}
              </button>
            ))}
          </div>
        </div>

        {/* Meta fields */}
        <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

          {/* Timer */}
          {req.timer_status && req.timer_status !== 'pending' && (
            <div style={{ background: timerCfg.bg, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{timerCfg.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: timerCfg.color }}>{timerCfg.label}</div>
                {req.days_remaining !== null && req.days_remaining !== undefined && (
                  <div style={{ fontSize: 11, color: timerCfg.color, opacity: .8 }}>
                    {req.days_remaining < 0 ? `${Math.abs(req.days_remaining)} days over` : req.days_remaining === 0 ? 'Due today' : `${req.days_remaining} days remaining`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>Start Date</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{startLabel}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>Due Date</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{dueLabel}</div>
            </div>
          </div>

          {/* Assignee + Sprint */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>Assignee</div>
              {req.assignee_name ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar name={req.assignee_name} size={22} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{req.assignee_name}</span>
                </div>
              ) : <span style={{ fontSize: 13, color: 'var(--text3)' }}>Unassigned</span>}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>Sprint</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{req.sprint_name || '—'}</div>
            </div>
          </div>

          {/* Department + Project */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>Department</div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{req.department || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4 }}>Project</div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{req.project_name || '—'}</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {req.children_count > 0   && <div style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}>📋 {req.children_count} sub-items</div>}
            {req.comment_count > 0    && <div style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}>💬 {req.comment_count} comments</div>}
            {req.total_logged_hours > 0 && <div style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}>⏱ {parseFloat(req.total_logged_hours).toFixed(1)}h logged</div>}
          </div>

          {/* Description */}
          {req.description && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Description</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, background: 'var(--surface)', borderRadius: 8, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>{req.description}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '9px 0', border: '1.5px solid var(--border)', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit' }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

// ── Quick Add Modal ───────────────────────────────────────────────────────────

function QuickAddModal({ initialStatus, sprints, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '',
    item_type: 'REQ',
    priority: 'Medium',
    status: initialStatus,
    sprint: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setSaving(true);
    try {
      await createRequirement({
        title: form.title.trim(),
        item_type: form.item_type,
        priority: form.priority,
        status: form.status,
        sprint: form.sprint || null,
      });
      onSaved();
    } catch (e) {
      setErr(e?.response?.data?.title?.[0] || e?.response?.data?.detail || 'Save failed');
      setSaving(false);
    }
  };

  const col = COLUMNS.find(c => c.status === form.status) || COLUMNS[0];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>+ Quick Add Item</div>
            <div style={{ fontSize: 12, color: col.color, fontWeight: 600, marginTop: 2 }}>{col.icon} {col.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Title *</label>
            <input
              value={form.title}
              onChange={F('title')}
              placeholder="Enter item title…"
              autoFocus
              style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Type</label>
              <select value={form.item_type} onChange={F('item_type')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', background: 'white' }}>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Priority</label>
              <select value={form.priority} onChange={F('priority')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', background: 'white' }}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Sprint (optional)</label>
            <select value={form.sprint} onChange={F('sprint')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', background: 'white' }}>
              <option value="">— No sprint —</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {err && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 10 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${col.color},${col.color}cc)`, color: 'white', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Creating…' : 'Create Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Sprint Board Modal ────────────────────────────────────────────────────

function NewSprintModal({ onClose, onCreated }) {
  const today = new Date().toISOString().split('T')[0];
  const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const [form, setForm] = useState({ name: '', start_date: today, end_date: twoWeeks });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.name.trim()) { setErr('Sprint name is required'); return; }
    if (!form.start_date || !form.end_date) { setErr('Start and end dates are required'); return; }
    setSaving(true);
    try {
      const res = await createSprint({ name: form.name.trim(), start_date: form.start_date, end_date: form.end_date });
      onCreated(res.data);
    } catch (e) {
      setErr(e?.response?.data?.name?.[0] || e?.response?.data?.detail || 'Create failed');
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 460, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>🏃 New Sprint Board</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Sprint Name *</label>
            <input
              value={form.name}
              onChange={F('name')}
              placeholder="e.g. Sprint 12 – Q2 Feature Push"
              autoFocus
              style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Start Date *</label>
              <input type="date" value={form.start_date} onChange={F('start_date')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>End Date *</label>
              <input type="date" value={form.end_date} onChange={F('end_date')} style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {err && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 10 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Creating…' : 'Create Sprint'}
          </button>
        </div>
      </div>
    </div>
  );
}
