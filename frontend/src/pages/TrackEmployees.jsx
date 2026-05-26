import { useState, useEffect } from 'react';
import { getUsers, getTasks, getBugs } from '../api';

const STATUSES = ['online', 'online', 'online', 'busy', 'busy', 'offline', 'online', 'busy'];
const COLORS = ['#1a56db', '#0d9488', '#7c3aed', '#d97706', '#dc2626', '#16a34a'];

const PRIORITY_BADGE = { Critical: 'badge-red', High: 'badge-amber', Medium: 'badge-blue', Low: 'badge-teal' };
const STATUS_BADGE_T = { 'To Do': 'badge-gray', 'In Progress': 'badge-blue', Done: 'badge-green', Blocked: 'badge-red' };

const TEAM_NAMES = {
  '3':  { name: 'Debuggers',     icon: '🐛', color: '#7c3aed', bg: '#f5f3ff' },
  '5':  { name: 'Core Blasters', icon: '💥', color: '#059669', bg: '#ecfdf5' },
  '11': { name: 'Tech Titans',   icon: '🏆', color: '#dc2626', bg: '#fef2f2' },
};

export default function TrackEmployees() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [search, setSearch] = useState('');
  const [teamF, setTeamF] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  const toggleExpand = (id) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  useEffect(() => {
    getUsers().then(r => setUsers(r.data)).catch(console.error);
    getTasks().then(r => setTasks(r.data)).catch(console.error);
    getBugs().then(r => setBugs(r.data)).catch(console.error);
  }, []);

  const teams = [...new Set(users.map(u => u.team).filter(Boolean))].sort((a, b) => a - b);

  // Build team summary data for cards
  const teamCards = teams.map(teamId => {
    const teamInfo = TEAM_NAMES[String(teamId)] || { name: `Team ${teamId}`, icon: '👥', color: '#64748b', bg: '#f8fafc' };
    const members = users.filter(u => String(u.team) === String(teamId));
    const memberNames = new Set(members.map(m => m.name));
    const memberTasks = tasks.filter(t => memberNames.has(t.assignee_name));
    const activeTasks = memberTasks.filter(t => t.status === 'In Progress').length;
    const openBugsCount = bugs.filter(b => memberNames.has(b.assignee_name) && b.status !== 'Closed').length;
    const utilization = memberTasks.length > 0 ? Math.round((activeTasks / memberTasks.length) * 100) : 0;
    return { teamId: String(teamId), teamInfo, memberCount: members.length, activeTasks, openBugsCount, utilization };
  });

  // Drill-down: filtered members for selected team
  const drillMembers = users.filter(u => {
    if (selectedTeam && String(u.team) !== selectedTeam) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !(u.role || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (teamF && String(u.team) !== teamF) return false;
    return true;
  });

  // ── Team card grid ───────────────────────────────────────────────────────────
  if (!selectedTeam) {
    return (
      <div className="page-content">
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Track Employees</h2>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>Select a team to view detailed member activity</p>
        </div>

        {teamCards.length === 0 ? (
          <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">Loading teams…</div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {teamCards.map(({ teamId, teamInfo, memberCount, activeTasks, openBugsCount, utilization }) => {
              const { name, icon, color, bg } = teamInfo;
              const utilColor = utilization > 66 ? '#dc2626' : utilization > 33 ? '#d97706' : '#16a34a';
              return (
                <div
                  key={teamId}
                  onClick={() => setSelectedTeam(teamId)}
                  style={{
                    background: bg,
                    border: `1.5px solid ${color}33`,
                    borderRadius: 16,
                    padding: '20px 20px 16px',
                    cursor: 'pointer',
                    transition: 'all .15s',
                    boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.04)'; }}
                >
                  {/* Top color bar */}
                  <div style={{ height: 4, background: color, borderRadius: 2, marginBottom: 14, marginLeft: -20, marginRight: -20, marginTop: -20, borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />

                  {/* Icon + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color }}>{name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{memberCount} members</div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, background: `${color}15`, color, padding: '3px 9px', borderRadius: 8, fontWeight: 700 }}>⚡ {activeTasks} active</span>
                    {openBugsCount > 0 && <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', padding: '3px 9px', borderRadius: 8, fontWeight: 700 }}>🐛 {openBugsCount} bugs</span>}
                  </div>

                  {/* Utilization bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text2)', marginBottom: 4 }}>
                      <span>Utilization</span><span style={{ fontWeight: 700, color: utilColor }}>{utilization}%</span>
                    </div>
                    <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${utilization}%`, background: utilColor, borderRadius: 3, transition: 'width .4s' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Drill-down view ──────────────────────────────────────────────────────────
  const teamInfo = TEAM_NAMES[selectedTeam] || { name: `Team ${selectedTeam}`, icon: '👥', color: '#64748b', bg: '#f8fafc' };

  return (
    <div className="page-content">
      {/* Back button */}
      <button
        onClick={() => { setSelectedTeam(null); setSearch(''); setTeamF(''); setExpanded(new Set()); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: teamInfo.color, padding: '6px 0', marginBottom: 12 }}
      >
        ← All Teams
      </button>

      {/* Team header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${teamInfo.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{teamInfo.icon}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: teamInfo.color }}>{teamInfo.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{drillMembers.length} members shown</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar" style={{ marginBottom: 12 }}>
        <div className="search-wrap">
          <input className="search-input" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={teamF} onChange={e => setTeamF(e.target.value)}>
          <option value="">All Teams</option>
          {teams.map(t => <option key={t} value={String(t)}>{TEAM_NAMES[String(t)]?.name || `Team ${t}`}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--text2)', marginLeft: 'auto' }}>{drillMembers.length} employees</span>
      </div>

      {/* Member table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {drillMembers.length === 0 ? (
            <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">No employees found</div></div>
          ) : drillMembers.map((u, i) => {
            const empTasks = tasks.filter(t => t.assignee_name === u.name);
            const active = empTasks.filter(t => t.status === 'In Progress').length;
            const done = empTasks.filter(t => t.status === 'Done').length;
            const openBugs = bugs.filter(b => b.assignee_name === u.name && b.status !== 'Closed').length;
            const load = empTasks.length ? Math.round((active / empTasks.length) * 100) : 0;
            const st = STATUSES[i % STATUSES.length];
            const lc = load > 66 ? 'var(--red)' : load > 33 ? 'var(--amber)' : 'var(--green)';
            const dc = COLORS[i % COLORS.length];
            const dotBg = st === 'online' ? 'var(--green)' : st === 'busy' ? 'var(--amber)' : 'var(--text3)';
            const isExpanded = expanded.has(u.id);
            const empTasksExpand = empTasks.slice(0, 3);

            return (
              <div key={u.id}>
                <div className="emp-row">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotBg, flexShrink: 0 }} />
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: dc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {u.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{u.role} · {TEAM_NAMES[String(u.team)]?.name || `T${u.team}`}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 3 }}>{load}%</div>
                    <div className="wl-bar"><div className="wl-fill" style={{ width: `${load}%`, background: lc }} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <span className="badge badge-blue">{active} active</span>
                    <span className="badge badge-green">{done} done</span>
                    {openBugs > 0 && <span className="badge badge-red">{openBugs} bugs</span>}
                  </div>
                  <span className={`badge ${st === 'online' ? 'badge-green' : st === 'busy' ? 'badge-amber' : 'badge-gray'}`}>{st}</span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => toggleExpand(u.id)}
                    style={{ fontSize: 11, padding: '4px 8px', flexShrink: 0 }}
                  >{isExpanded ? '▲' : '▼'}</button>
                </div>
                {isExpanded && (
                  <div className="emp-detail open">
                    {empTasksExpand.length > 0 ? (
                      <div className="table-wrap">
                        <table style={{ fontSize: 12 }}>
                          <thead>
                            <tr><th>ID</th><th>Title</th><th>Status</th><th>Priority</th></tr>
                          </thead>
                          <tbody>
                            {empTasksExpand.map(t => (
                              <tr key={t.id}>
                                <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--accent)' }}>{t.id}</td>
                                <td style={{ fontWeight: 600 }}>{t.title}</td>
                                <td><span className={`badge ${STATUS_BADGE_T[t.status] || 'badge-gray'}`}>{t.status}</span></td>
                                <td><span className={`badge ${PRIORITY_BADGE[t.priority] || 'badge-gray'}`}>{t.priority}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: 8, color: 'var(--text2)', fontSize: 12 }}>No tasks assigned</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
