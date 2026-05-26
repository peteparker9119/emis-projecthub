import { useState, useEffect, useMemo } from 'react';
import { getSprints, createSprint, updateSprint, deleteSprint } from '../api';
import Modal from '../components/Modal';
import '../components/Modal.css';
import { useToast } from '../context/ToastContext';

/* ── Constants ─────────────────────────────────────────────────────────── */
const EMPTY_FORM = { name: '', start_date: '', end_date: '', goal: '', capacity: 40, status: 'Planning' };

const AVATAR_COLORS = [
  '#1a56db', '#0d9488', '#7c3aed', '#d97706',
  '#dc2626', '#16a34a', '#0e7490', '#be185d',
];

const STATUS_STATS = ['To Do', 'In Progress', 'Review', 'Done'];

/* ── Helpers ────────────────────────────────────────────────────────────── */
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function daysRemaining(endDate) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate) - new Date()) / 86_400_000);
  return diff;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function healthScore(sp) {
  const cap = Number(sp.capacity) || 1;
  const tasks = Number(sp.task_count) || 1;
  const vel = Number(sp.velocity) || 0;
  const done = Number(sp.done_count) || 0;
  return Math.round((vel / cap) * 60 + (done / tasks) * 40);
}

function healthColor(score) {
  if (score >= 70) return 'var(--green)';
  if (score >= 40) return 'var(--amber)';
  return 'var(--red)';
}

/* ── SVG Progress Ring ──────────────────────────────────────────────────── */
const R = 28;
const CIRC = 2 * Math.PI * R;

function ProgressRing({ pct = 0, status }) {
  const offset = CIRC * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const color =
    status === 'Active' ? 'var(--accent)' :
    status === 'Completed' ? 'var(--green)' :
    'var(--purple)';

  return (
    <svg width="68" height="68" viewBox="0 0 68 68">
      <circle cx="34" cy="34" r={R} fill="none" stroke="var(--surface2)" strokeWidth="6" />
      <circle
        cx="34" cy="34" r={R}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 34 34)"
        style={{ transition: 'stroke-dashoffset .6s ease' }}
      />
      <text x="34" y="32" textAnchor="middle" className="sprint-ring-pct" dominantBaseline="middle">
        {pct}%
      </text>
      <text x="34" y="46" textAnchor="middle" className="sprint-ring-sub">
        done
      </text>
    </svg>
  );
}

/* ── Assignee Avatar Stack ──────────────────────────────────────────────── */
function AvatarStack({ names = [] }) {
  const visible = names.slice(0, 4);
  const extra = names.length - visible.length;
  return (
    <div className="sprint-av-stack">
      {visible.map((n, i) => (
        <div
          key={i}
          className="sprint-av"
          style={{ background: avatarColor(n), zIndex: visible.length - i }}
          title={n}
        >
          {initials(n)}
        </div>
      ))}
      {extra > 0 && (
        <div className="sprint-av sprint-av-more" style={{ zIndex: 0 }}>+{extra}</div>
      )}
    </div>
  );
}

/* ── Sprint Tile ────────────────────────────────────────────────────────── */
function SprintTile({ sp, onActivate, onDelete }) {
  const days = daysRemaining(sp.end_date);
  const pct = Number(sp.progress) || 0;
  const cap = Number(sp.capacity) || 1;
  const vel = Number(sp.velocity) || 0;
  const velPct = Math.min(100, Math.round((vel / cap) * 100));

  const bandClass =
    sp.status === 'Active' ? 'st-active' :
    sp.status === 'Planning' ? 'st-planning' :
    'st-completed';

  // Derive assignee names from tasks_by_status keys if available; fall back to sprint name
  // (In real data, assignee list would come from tasks. We synthesise from the sprint name for demo.)
  const assignees = sp.assignees || [];

  const daysLabel =
    sp.status === 'Completed' ? 'Completed' :
    days === null ? '' :
    days < 0 ? 'Overdue' :
    days === 0 ? 'Last day' :
    `${days}d left`;

  return (
    <div className="sprint-tile">
      {/* Colored top band */}
      <div className={`sprint-tile-band ${bandClass}`} />

      {/* Top section: info + ring */}
      <div className="sprint-tile-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sprint-tile-id">{sp.id}</div>
          <div className="sprint-tile-name">{sp.name}</div>
          <div className="sprint-tile-meta">
            📅 {fmtDate(sp.start_date)} → {fmtDate(sp.end_date)}<br />
            ⚡ {cap} pts capacity · {vel} pts velocity
          </div>
          <div className="sprint-tile-badges">
            {sp.status === 'Active' && (
              <span className="sprint-live-badge">
                <span className="sprint-live-dot" />
                LIVE
              </span>
            )}
            {sp.status === 'Planning' && (
              <span className="badge badge-purple">Planning</span>
            )}
            {sp.status === 'Completed' && (
              <span className="badge badge-gray">Completed</span>
            )}
            {daysLabel && (
              <span className="sprint-days-chip">{daysLabel}</span>
            )}
          </div>
        </div>

        {/* SVG progress ring */}
        <div className="sprint-ring-wrap">
          <ProgressRing pct={pct} status={sp.status} />
        </div>
      </div>

      {/* Goal */}
      {sp.goal && (
        <div className="sprint-tile-goal">{sp.goal}</div>
      )}

      {/* Status stat row */}
      <div className="sprint-tile-stats">
        {STATUS_STATS.map(s => (
          <div key={s} className="sprint-stat-col">
            <div className="sprint-stat-num">{sp.tasks_by_status?.[s] ?? 0}</div>
            <div className="sprint-stat-lbl">{s}</div>
          </div>
        ))}
      </div>

      {/* Footer: avatars + velocity bar + actions */}
      <div className="sprint-tile-footer">
        {assignees.length > 0 && <AvatarStack names={assignees} />}

        <div className="sprint-cap-bar">
          <div className="sprint-cap-label">{vel}/{cap} pts velocity</div>
          <div className="sprint-cap-track">
            <div className="sprint-cap-fill" style={{ width: `${velPct}%` }} />
          </div>
        </div>

        <div className="sprint-tile-actions">
          {sp.status === 'Planning' && (
            <button className="btn btn-accent btn-sm" onClick={() => onActivate(sp.id)}>
              ▶ Start
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(sp.id)} title="Delete sprint">
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Compare Tab ────────────────────────────────────────────────────────── */
function CompareTab({ sprints }) {
  const scored = useMemo(() =>
    sprints.map(sp => ({ ...sp, health: healthScore(sp) }))
      .sort((a, b) => b.health - a.health),
    [sprints]
  );

  if (scored.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">📊</div>
        <div className="empty-text">No sprint data to compare</div>
      </div>
    );
  }

  const best = scored[0];
  const worst = scored[scored.length - 1];
  const maxCap = Math.max(...scored.map(s => Number(s.capacity) || 0), 1);

  return (
    <div>
      {/* Highlight cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="highlight-card best">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--green)', marginBottom: 6 }}>
            🏆 Best Performer
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{best.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>Health score: <strong style={{ color: 'var(--green)' }}>{best.health}</strong>/100</div>
        </div>
        <div className="highlight-card worst">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--amber)', marginBottom: 6 }}>
            ⚠ Needs Attention
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{worst.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>Health score: <strong style={{ color: 'var(--amber)' }}>{worst.health}</strong>/100</div>
        </div>
      </div>

      {/* Velocity vs Capacity bars */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Velocity vs Capacity</span>
        </div>
        <div className="card-body">
          {scored.map(sp => {
            const vel = Number(sp.velocity) || 0;
            const cap = Number(sp.capacity) || 0;
            const velW = Math.round((vel / maxCap) * 100);
            const capW = Math.round((cap / maxCap) * 100);
            return (
              <div key={sp.id} className="vel-bar-row">
                <div className="vel-bar-label" title={sp.name}>{sp.name}</div>
                <div className="vel-bar-group">
                  <div
                    className="vel-bar"
                    style={{ width: `${velW}%`, background: 'var(--accent)' }}
                    title={`Velocity: ${vel} pts`}
                  />
                  <div
                    className="vel-bar"
                    style={{
                      width: `${capW}%`,
                      background: 'transparent',
                      border: '2px dashed var(--border)',
                      height: 10,
                    }}
                    title={`Capacity: ${cap} pts`}
                  />
                </div>
                <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                  {vel} / {cap}
                </div>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 24, height: 8, background: 'var(--accent)', borderRadius: 3, display: 'inline-block' }} />
              Velocity
            </span>
            <span style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 24, height: 8, border: '2px dashed var(--border)', borderRadius: 3, display: 'inline-block' }} />
              Capacity
            </span>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Sprint Comparison Table</span>
        </div>
        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Sprint</th>
                <th>Status</th>
                <th>Tasks</th>
                <th>Done</th>
                <th>Velocity</th>
                <th>Capacity</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {scored.map(sp => {
                const score = sp.health;
                const color = healthColor(score);
                return (
                  <tr key={sp.id}>
                    <td>
                      <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 14 }}>{sp.name}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text3)' }}>{sp.id}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        sp.status === 'Active' ? 'badge-green' :
                        sp.status === 'Planning' ? 'badge-blue' : 'badge-gray'
                      }`}>{sp.status}</span>
                    </td>
                    <td style={{ fontFamily: 'DM Mono, monospace' }}>{sp.task_count ?? 0}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace' }}>{sp.done_count ?? 0}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace' }}>{sp.velocity ?? 0} pts</td>
                    <td style={{ fontFamily: 'DM Mono, monospace' }}>{sp.capacity ?? 0} pts</td>
                    <td>
                      <span className="health-bar-track">
                        <span
                          className="health-bar-fill"
                          style={{ width: `${score}%`, background: color }}
                        />
                      </span>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color }}>
                        {score}
                      </span>
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

/* ── Main Sprints Page ───────────────────────────────────────────────────── */
export default function Sprints() {
  const showToast = useToast();
  const [sprints, setSprints] = useState([]);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [tab, setTab] = useState('sprints'); // 'sprints' | 'compare'
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getSprints({ search, status: statusF })
      .then(r => setSprints(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusF]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!form.name) return;
    try {
      await createSprint(form);
      showToast(`Sprint "${form.name}" created`, 'success');
      setModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to create sprint', 'error');
    }
  };

  const activate = async (id) => {
    try {
      await updateSprint(id, { status: 'Active' });
      showToast('Sprint activated', 'success');
      load();
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to activate sprint', 'error');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this sprint?')) return;
    try {
      await deleteSprint(id);
      showToast('Sprint deleted', 'info');
      load();
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to delete sprint', 'error');
    }
  };

  return (
    <div className="page-content">
      {/* Filters bar */}
      <div className="filters-bar">
        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="Search sprints…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={statusF}
          onChange={e => setStatusF(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Planning">Planning</option>
          <option value="Completed">Completed</option>
        </select>
        <button className="btn btn-accent btn-sm" onClick={() => setModal(true)}>
          ＋ New Sprint
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div
          className={`tab${tab === 'sprints' ? ' active' : ''}`}
          onClick={() => setTab('sprints')}
        >
          🏃 Sprints
        </div>
        <div
          className={`tab${tab === 'compare' ? ' active' : ''}`}
          onClick={() => setTab('compare')}
        >
          📊 Compare
        </div>
      </div>

      {/* Tab content */}
      {tab === 'sprints' && (
        loading ? (
          <div className="empty">
            <div className="empty-icon" style={{ animation: 'live-pulse 1s infinite' }}>⏳</div>
            <div className="empty-text">Loading sprints…</div>
          </div>
        ) : sprints.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏃</div>
            <div className="empty-text">No sprints found</div>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>
              Create your first sprint to get started.
            </p>
          </div>
        ) : (
          <div className="sprint-tiles-grid">
            {sprints.map(sp => (
              <SprintTile
                key={sp.id}
                sp={sp}
                onActivate={activate}
                onDelete={remove}
              />
            ))}
          </div>
        )
      )}

      {tab === 'compare' && <CompareTab sprints={sprints} />}

      {/* New Sprint modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="🏃 Create Sprint"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-accent" onClick={save}>Create Sprint</button>
          </>
        }
      >
        <div className="form-group">
          <label>Sprint Name</label>
          <input
            className="form-control"
            placeholder="e.g. Sprint 14"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <span className="field-hint">A short sequential label for this iteration, e.g. "Sprint 14".</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              className="form-control"
              value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })}
            />
            <span className="field-hint">The date this sprint officially begins.</span>
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              className="form-control"
              value={form.end_date}
              onChange={e => setForm({ ...form, end_date: e.target.value })}
            />
            <span className="field-hint">Planned completion date — typically 1–2 weeks from start.</span>
          </div>
        </div>
        <div className="form-group">
          <label>Goal</label>
          <textarea
            className="form-control"
            placeholder="Sprint goal…"
            value={form.goal}
            onChange={e => setForm({ ...form, goal: e.target.value })}
          />
          <span className="field-hint">Describe what the team aims to deliver. E.g. "Complete login and dashboard features".</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Capacity (pts)</label>
            <input
              type="number"
              className="form-control"
              value={form.capacity}
              onChange={e => setForm({ ...form, capacity: e.target.value })}
            />
            <span className="field-hint">Total story points the team can handle this sprint. Default is 40.</span>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              className="form-control"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
            <span className="field-hint">Set to "Planning" when creating. Use the ▶ Start button on the sprint card to activate.</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
