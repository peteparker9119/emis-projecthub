import { useState, useEffect, useRef } from 'react';
import { getDashboard } from '../api';
import { useAuth } from '../context/AuthContext';

/* Animate a number from 0 → target over ~600 ms */
function useCountUp(target, ready) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!ready || target == null) return;
    const start = performance.now();
    const duration = 600;
    const from = 0;
    const to = Number(target);

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, ready]);

  return val;
}

/* Individual animated stat card */
function StatCard({ icon, val, label }) {
  const animated = useCountUp(val, val != null);
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-val">{animated}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const { user } = useAuth();

  useEffect(() => { getDashboard().then(r => setData(r.data)).catch(console.error); }, []);

  if (!data) return (
    <div className="page-content">
      <div className="empty">
        <div className="empty-icon">⏳</div>
        <div className="empty-text">Loading…</div>
      </div>
    </div>
  );

  const stats = [
    { icon: '🏃', val: data.active_sprints,    label: 'Active Sprints' },
    { icon: '✅', val: data.in_progress_tasks, label: 'Tasks In Progress' },
    { icon: '🐛', val: data.open_bugs,          label: 'Open Bugs' },
    { icon: '💡', val: data.approved_ideas,     label: 'Approved Ideas' },
    { icon: '👥', val: data.total_members,      label: 'Team Members' },
    { icon: '📦', val: data.total_items,        label: 'Total Items' },
  ];

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const sprintName = data.active_sprint?.name ?? null;

  const quickActions = [
    { label: '🎯 Track Team',      page: 'track' },
    { label: '⚡ Sprint Activity', page: 'sprintactivity' },
    { label: '✉️ New Letter',      page: 'letters' },
    { label: '🛡️ Admin',           page: 'admin' },
  ];

  const statusBadge = (s) => {
    const map = {
      Done: 'badge-green', Fixed: 'badge-green', Completed: 'badge-green', Active: 'badge-green',
      'In Progress': 'badge-blue', Open: 'badge-red', 'To Do': 'badge-gray',
      Review: 'badge-amber', Planning: 'badge-blue', Closed: 'badge-gray',
      Approved: 'badge-green', 'Under Review': 'badge-amber', Rejected: 'badge-red',
    };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  return (
    <div className="page-content">

      {/* ── CTO Greeting Bar ──────────────────────────────────────────── */}
      <div className="cto-bar">
        <div className="cto-greeting">
          {getGreeting()}, {firstName} 👋
          <small>
            {sprintName ? `Active sprint: ${sprintName}` : 'No active sprint right now'}
          </small>
        </div>
        <div className="cto-qas">
          {quickActions.map(qa => (
            <button
              key={qa.page}
              className="cto-qa"
              onClick={() => onNavigate && onNavigate(qa.page)}
            >
              {qa.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div className="stats-grid">
        {stats.map(s => (
          <StatCard key={s.label} icon={s.icon} val={s.val} label={s.label} />
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">🏃 Active Sprint</span></div>
          <div className="card-body">
            {data.active_sprint ? (
              <>
                <div className="sprint-header">
                  <div className="sprint-name">{data.active_sprint.name}</div>
                  <div className="sprint-meta">
                    <span>📅 {data.active_sprint.start_date} → {data.active_sprint.end_date}</span>
                    <span>🎯 {data.active_sprint.capacity} pts</span>
                    <span>⚡ {data.active_sprint.velocity} pts done</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${data.active_sprint.progress}%` }}></div>
                  </div>
                  <div style={{ fontSize: 12, opacity: .7, marginTop: 6 }}>
                    {data.active_sprint.done_count}/{data.active_sprint.task_count} tasks · {data.active_sprint.progress}%
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic' }}>
                  "{data.active_sprint.goal}"
                </p>
              </>
            ) : (
              <div className="empty" style={{ padding: 30 }}>
                <div className="empty-icon">🏃</div>
                <div className="empty-text">No Active Sprint</div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">🔥 Recent Activity</span></div>
          <div className="card-body" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {(data.recent_activity || []).map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 13 }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{a.time_ago}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">🐛 Open Bugs</span></div>
          <div className="card-body">
            {(data.open_bugs_list || []).length === 0
              ? (
                <div className="empty" style={{ padding: 30 }}>
                  <div className="empty-icon">🎉</div>
                  <div className="empty-text">No open bugs!</div>
                </div>
              )
              : (data.open_bugs_list || []).slice(0, 4).map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className={`priority-dot p-${b.priority.toLowerCase()}`}></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.id}: {b.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{b.assignee_name || '—'}</div>
                  </div>
                  {statusBadge(b.status)}
                </div>
              ))
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">💡 Ideas Pipeline</span></div>
          <div className="card-body">
            {(data.ideas || []).slice(0, 4).map(i => (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{i.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>👍 {i.votes} votes · {i.submitted_by_name}</div>
                </div>
                {statusBadge(i.status)}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
