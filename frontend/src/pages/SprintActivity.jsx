import { useState, useEffect } from 'react';
import { getSprints, getActivity } from '../api';

const STATUS_COLOR = { Active: 'var(--green)', Planning: 'var(--accent)', Completed: 'var(--text3)' };
const STATUS_BADGE = { Active: 'badge-green', Planning: 'badge-blue', Completed: 'badge-gray' };

export default function SprintActivity() {
  const [sprints, setSprints] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    getSprints().then(r => setSprints(r.data)).catch(console.error);
    getActivity().then(r => setActivity(r.data)).catch(console.error);
  }, []);

  const activeSprint = sprints.find(s => s.status === 'Active');
  const maxV = Math.max(...sprints.map(s => s.velocity), 1);

  const stats = [
    { icon: '🏃', val: sprints.filter(s => s.status === 'Active').length, label: 'Active', c: 'var(--green)' },
    { icon: '📋', val: sprints.filter(s => s.status === 'Planning').length, label: 'Planning', c: 'var(--accent)' },
    { icon: '✅', val: sprints.filter(s => s.status === 'Completed').length, label: 'Completed', c: 'var(--teal)' },
    { icon: '⚡', val: activeSprint ? activeSprint.velocity : 0, label: 'Velocity', c: 'var(--amber)' },
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

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">📅 Sprint Timeline</span></div>
          <div className="card-body">
            {sprints.length === 0 ? (
              <div className="empty" style={{ padding: 30 }}>
                <div className="empty-icon">🏃</div>
                <div className="empty-text">No sprints yet</div>
              </div>
            ) : (
              <div className="tl-wrap">
                {sprints.map(sp => {
                  const dc = STATUS_COLOR[sp.status] || 'var(--text3)';
                  const pct = sp.progress || 0;
                  return (
                    <div key={sp.id} className="tl-item">
                      <div className="tl-dot" style={{ background: dc }} />
                      <div className="tl-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--accent)' }}>{sp.id}</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{sp.name}</span>
                          <span className={`badge ${STATUS_BADGE[sp.status] || 'badge-gray'}`}>{sp.status}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                          📅 {sp.start_date} → {sp.end_date} · 🎯 {sp.capacity} pts
                        </div>
                        <div style={{ marginTop: 8, background: 'var(--surface2)', height: 5, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: dc, borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                          {sp.done_count}/{sp.task_count} items · {pct}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">⚡ Velocity Chart</span></div>
          <div className="card-body">
            {sprints.length === 0 ? (
              <div className="empty" style={{ padding: 30 }}>
                <div className="empty-icon">⚡</div>
                <div className="empty-text">No data yet</div>
              </div>
            ) : (
              <div className="chart-bar-h">
                {sprints.map(sp => (
                  <div key={sp.id} className="bar-row">
                    <div className="bar-label" style={{ width: 130 }}>{sp.name}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${Math.round(sp.velocity / maxV * 100)}%`, background: STATUS_COLOR[sp.status] || 'var(--text3)' }} />
                    </div>
                    <div className="bar-val">{sp.velocity}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">🕐 Live Activity Feed</span></div>
        <div className="card-body">
          {activity.length === 0 ? (
            <div className="empty" style={{ padding: 30 }}>
              <div className="empty-icon">🕐</div>
              <div className="empty-text">No activity yet</div>
            </div>
          ) : activity.slice(0, 20).map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 17, flexShrink: 0 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 13 }}>{a.text}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  🕐 {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
