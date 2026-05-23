import { useState, useEffect } from 'react';
import { getTasks, getRequirements } from '../api';
import { useAuth } from '../context/AuthContext';

const PRIORITY_BADGE = { Critical: 'badge-red', High: 'badge-amber', Medium: 'badge-blue', Low: 'badge-teal' };
const STATUS_BADGE = { 'To Do': 'badge-gray', 'In Progress': 'badge-blue', Done: 'badge-green', Blocked: 'badge-red' };

export default function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [reqs, setReqs] = useState([]);

  useEffect(() => {
    if (!user) return;
    getTasks().then(r => setTasks(r.data.filter(t => t.assignee_name === user.name))).catch(console.error);
    getRequirements().then(r => setReqs(r.data.filter(r => r.assignee_name === user.name))).catch(console.error);
  }, [user]);

  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const done = tasks.filter(t => t.status === 'Done').length;

  const stats = [
    { icon: '📌', val: tasks.length, label: 'Assigned', c: 'var(--accent)' },
    { icon: '🔄', val: inProgress, label: 'In Progress', c: 'var(--amber)' },
    { icon: '✅', val: done, label: 'Done', c: 'var(--green)' },
    { icon: '📋', val: reqs.length, label: 'Requirements', c: 'var(--teal)' },
  ];

  return (
    <div className="page-content">
      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-val" style={{ color: s.c }}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">📌 My Tasks</span></div>
        <div className="card-body" style={{ padding: 0 }}>
          {tasks.length === 0 ? (
            <div className="empty" style={{ padding: 30 }}>
              <div className="empty-icon">📌</div>
              <div className="empty-text">No tasks assigned</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--accent)' }}>{t.id}</td>
                      <td style={{ fontWeight: 600 }}>{t.title}</td>
                      <td><span className={`badge ${PRIORITY_BADGE[t.priority] || 'badge-gray'}`}>{t.priority}</span></td>
                      <td><span className={`badge ${STATUS_BADGE[t.status] || 'badge-gray'}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">📋 My Requirements</span></div>
        <div className="card-body" style={{ padding: 0 }}>
          {reqs.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>
              <div className="empty-text">No requirements assigned</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>ID</th><th>Title</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {reqs.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--accent)' }}>{r.id}</td>
                      <td style={{ fontWeight: 600 }}>{r.title}</td>
                      <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
