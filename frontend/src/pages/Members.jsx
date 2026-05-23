import { useState, useEffect } from 'react';
import { getUsers } from '../api';

const COLORS = ['#1a56db','#0d9488','#7c3aed','#d97706','#dc2626','#16a34a'];

export default function Members() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleF, setRoleF] = useState('');

  useEffect(() => { getUsers().then(r => setUsers(r.data)).catch(console.error); }, []);

  const filtered = users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.role.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleF && u.perfiq !== roleF) return false;
    return true;
  });

  return (
    <div className="page-content">
      <div className="filters-bar">
        <div className="search-wrap"><input className="search-input" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="filter-select" value={roleF} onChange={e => setRoleF(e.target.value)}>
          <option value="">All Roles</option>
          <option value="CTO">CTO</option>
          <option value="MANAGER">Manager</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">No members found</div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {filtered.map((u, i) => (
            <div key={u.id} className="member-card">
              <div className="member-avatar" style={{ background: COLORS[i % COLORS.length] }}>{u.initials}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{u.role}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <span className={`badge ${u.perfiq === 'CTO' ? 'badge-purple' : u.perfiq === 'MANAGER' ? 'badge-teal' : 'badge-gray'}`}>{u.perfiq}</span>
                  {u.level && <span className="badge badge-blue">{u.level}</span>}
                  <span className="badge badge-gray">T{u.team}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
