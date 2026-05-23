import { useState, useEffect } from 'react';
import { getSprints, getUsers, getTasks } from '../api';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('velocity');
  const [sprints, setSprints] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    getSprints().then(r => setSprints(r.data));
    getUsers().then(r => setUsers(r.data));
    getTasks().then(r => setTasks(r.data));
  }, []);

  const completed = sprints.filter(s => s.status !== 'Planning');
  const activeSprint = sprints.find(s => s.status === 'Active');

  return (
    <div className="page-content">
      <div className="tabs">
        <div className={`tab ${activeTab==='velocity'?'active':''}`} onClick={() => setActiveTab('velocity')}>📈 Velocity</div>
        <div className={`tab ${activeTab==='burndown'?'active':''}`} onClick={() => setActiveTab('burndown')}>🔥 Burndown</div>
        <div className={`tab ${activeTab==='team'?'active':''}`} onClick={() => setActiveTab('team')}>👥 Team Load</div>
      </div>

      {activeTab === 'velocity' && (
        <div className="card">
          <div className="card-header"><span className="card-title">📈 Sprint Velocity</span></div>
          <div className="card-body">
            {completed.length === 0 ? <div className="empty"><div className="empty-icon">📈</div><div className="empty-text">No completed sprints yet</div></div> : (
              <div className="chart-bar-h">
                {completed.map(s => {
                  const pct = s.capacity > 0 ? Math.round((s.velocity / s.capacity) * 100) : 0;
                  return (
                    <div key={s.id} className="bar-row">
                      <div className="bar-label">{s.name}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#1a56db,#0d9488)' }}>{pct > 10 ? `${pct}%` : ''}</div>
                      </div>
                      <div className="bar-val">{s.velocity}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'burndown' && (
        <div className="card">
          <div className="card-header"><span className="card-title">🔥 Burndown{activeSprint ? ` — ${activeSprint.name}` : ''}</span></div>
          <div className="card-body">
            {!activeSprint ? <div className="empty"><div className="empty-icon">🔥</div><div className="empty-text">No active sprint</div></div> : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
                  {['To Do','In Progress','Review','Done'].map(s => {
                    const count = tasks.filter(t => t.sprint === activeSprint.id && t.status === s).length;
                    const colors = { 'To Do':'var(--text2)', 'In Progress':'var(--accent)', 'Review':'var(--amber)', 'Done':'var(--green)' };
                    return (
                      <div key={s} style={{ textAlign: 'center', padding: 20, border: '1px solid var(--border)', borderRadius: 10, background: 'white' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: colors[s], fontFamily: 'DM Mono,monospace' }}>{count}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{s}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ padding: 20, background: 'var(--surface2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Sprint Progress</div>
                  <div style={{ background: 'var(--border)', borderRadius: 8, height: 24, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${activeSprint.progress || 0}%`, background: 'linear-gradient(90deg,#1a56db,#0d9488)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, transition: 'width .5s' }}>
                      {activeSprint.progress || 0}%
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>{activeSprint.done_count}/{activeSprint.task_count} tasks complete · {activeSprint.capacity} pts capacity</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="card">
          <div className="card-header"><span className="card-title">👥 Team Load</span></div>
          <div className="card-body">
            <div className="chart-bar-h">
              {users.slice(0, 15).map(u => {
                const count = tasks.filter(t => t.assignee === u.id && t.status === 'In Progress').length;
                const pct = Math.min(count * 20, 100);
                return (
                  <div key={u.id} className="bar-row">
                    <div className="bar-label">{u.name.split(' ')[0]}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, background: count > 3 ? 'var(--red)' : count > 1 ? 'var(--amber)' : 'var(--green)' }}>{count > 0 ? count : ''}</div>
                    </div>
                    <div className="bar-val">{count}</div>
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
