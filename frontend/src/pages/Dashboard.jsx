import { useState, useEffect, useRef } from 'react';
import { getDashboard, getCTOMiniDashboard } from '../api';
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
function StatCard({ icon, val, label, color }) {
  const animated = useCountUp(val, val != null);
  return (
    <div className={`stat-card${color ? ` stat-card--${color}` : ''}`}>
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

const DEPT_COLORS = {
  DSE: '#1a56db', DEE: '#0d9488', SS: '#7c3aed', MS: '#d97706',
  DGE: '#dc2626', DPS: '#16a34a', Other: '#64748b', 'Tech Initiatives': '#0e7490',
};

function CTOMiniDashboard({ user }) {
  const [ctoData, setCtoData] = useState(null);
  const [qNotes, setQNotes] = useState({}); // { dept: noteSent }
  const [expanding, setExpanding] = useState(null);

  useEffect(() => {
    getCTOMiniDashboard().then(r => setCtoData(r.data)).catch(() => {});
  }, []);

  if (!ctoData) return (
    <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid var(--border)', marginBottom: 22, opacity: .5 }}>
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>Loading department stats…</div>
    </div>
  );

  const { departments = [], total_requirements, released_count, project_count } = ctoData;

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid var(--accent)', marginBottom: 22, overflow: 'hidden', boxShadow: '0 2px 16px rgba(26,86,219,.07)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--teal, #0d9488))', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>📊</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>Department Overview</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 1 }}>CTO Command View</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            ['📦', total_requirements, 'Total Reqs'],
            ['🚀', released_count, 'Released'],
            ['🗂️', project_count, 'Projects'],
          ].map(([icon, val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{icon} {val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Department cards */}
      <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {departments.map(d => {
          const color = DEPT_COLORS[d.dept] || '#64748b';
          const relPct = d.total > 0 ? Math.round((d.released / d.total) * 100) : 0;
          const isExpanded = expanding === d.dept;
          return (
            <div key={d.dept}
              onClick={() => setExpanding(isExpanded ? null : d.dept)}
              style={{ borderRadius: 12, border: `1.5px solid ${color}22`, background: `${color}08`, overflow: 'hidden', cursor: 'pointer', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${color}14`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.transform = ''; }}>
              {/* Dept color bar */}
              <div style={{ height: 4, background: color }} />
              <div style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color }}>{d.dept}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, background: `${color}22`, color, padding: '1px 8px', borderRadius: 10 }}>{d.total}</span>
                </div>

                {/* Progress bar: released */}
                <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${relPct}%`, background: color, borderRadius: 3, transition: 'width .4s' }} />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 10 }}>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>✅ {d.released} released</span>
                  <span style={{ color: '#b45309', fontWeight: 700 }}>⏳ {d.not_released} pending</span>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${color}22`, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text2)' }}>👤 By PM</span>
                      <strong>{d.by_pm}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text2)' }}>❓ Open backlog</span>
                      <strong style={{ color: d.raise_question > 0 ? '#dc2626' : 'var(--text)' }}>{d.raise_question}</strong>
                    </div>
                    {d.raise_question > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); setQNotes(p => ({ ...p, [d.dept]: true })); }}
                        style={{ marginTop: 4, padding: '5px 0', borderRadius: 7, border: 'none', background: `${color}22`, color, fontSize: 11, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                        {qNotes[d.dept] ? '✓ Flagged' : '🚩 Raise Question'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {departments.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>No department data available</div>
        )}
      </div>
    </div>
  );
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
    { icon: '🏃', val: data.active_sprints,    label: 'Active Sprints',    color: 'blue'   },
    { icon: '✅', val: data.in_progress_tasks, label: 'Tasks In Progress', color: 'teal'   },
    { icon: '🐛', val: data.open_bugs,          label: 'Open Bugs',         color: 'red'    },
    { icon: '💡', val: data.approved_ideas,     label: 'Approved Ideas',    color: 'amber'  },
    { icon: '👥', val: data.total_members,      label: 'Team Members',      color: 'purple' },
    { icon: '📦', val: data.total_items,        label: 'Total Items',       color: 'green'  },
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

  const isCTO = user?.perfiq === 'CTO';

  return (
    <div className="page-content">

      {/* ── CTO Department Overview ───────────────────────────────────── */}
      {isCTO && <CTOMiniDashboard user={user} />}

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
          <StatCard key={s.label} icon={s.icon} val={s.val} label={s.label} color={s.color} />
        ))}
      </div>

      <div className="grid-2">
        <div className="card card-hover">
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

        <div className="card card-hover">
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
        <div className="card card-hover">
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

        <div className="card card-hover">
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
