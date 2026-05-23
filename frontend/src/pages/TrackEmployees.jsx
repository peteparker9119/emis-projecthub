import { useState, useEffect } from 'react';
import { getUsers, getTasks, getBugs } from '../api';

const STATUSES = ['online', 'online', 'online', 'busy', 'busy', 'offline', 'online', 'busy'];
const COLORS = ['#1a56db', '#0d9488', '#7c3aed', '#d97706', '#dc2626', '#16a34a'];

const PRIORITY_BADGE = { Critical: 'badge-red', High: 'badge-amber', Medium: 'badge-blue', Low: 'badge-teal' };
const STATUS_BADGE_T = { 'To Do': 'badge-gray', 'In Progress': 'badge-blue', Done: 'badge-green', Blocked: 'badge-red' };

export default function TrackEmployees() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [bugs, setBugs] = useState([]);
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

  const filtered = users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !(u.role || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (teamF && String(u.team) !== teamF) return false;
    return true;
  });

  return (
    <div className="page-content">
      <div className="filters-bar">
        <div className="search-wrap">
          <input className="search-input" placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={teamF} onChange={e => setTeamF(e.target.value)}>
          <option value="">All Teams</option>
          {teams.map(t => <option key={t} value={String(t)}>Team {t}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--text2)', marginLeft: 'auto' }}>{filtered.length} employees</span>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">No employees found</div></div>
          ) : filtered.map((u, i) => {
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
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{u.role} · T{u.team}</div>
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
