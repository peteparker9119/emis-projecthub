import { useState, useEffect } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '../api';
import Modal from '../components/Modal';
import '../components/Modal.css';

const EMPTY = {
  name: '', description: '', status: 'Planning',
  color: '#1a56db', start_date: '', end_date: '', team_number: '',
};

const STATUS_COLORS = {
  Active:    { badge: 'badge-green',  dot: '#16a34a' },
  Planning:  { badge: 'badge-blue',   dot: '#1a56db' },
  'On Hold': { badge: 'badge-amber',  dot: '#d97706' },
  Completed: { badge: 'badge-gray',   dot: '#9298b5' },
};

const PALETTE = [
  '#1a56db', '#0d9488', '#7c3aed',
  '#d97706', '#dc2626', '#16a34a',
];

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ProjectCard({ project, onStatusChange, onDelete }) {
  const sc = STATUS_COLORS[project.status] || STATUS_COLORS.Planning;

  return (
    <div style={{
      background: 'white', borderRadius: 14, border: '1px solid var(--border)',
      boxShadow: 'var(--shadow)', overflow: 'hidden',
      transition: 'transform .2s, box-shadow .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
    >
      {/* Color band */}
      <div style={{ height: 5, background: project.color || '#1a56db' }} />

      <div style={{ padding: '18px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginBottom: 3 }}>
              {project.id}
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25 }}>
              {project.name}
            </div>
          </div>
          {/* Status dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
            <span className={`badge ${sc.badge}`}>{project.status}</span>
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.55, marginBottom: 12,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {project.description}
          </p>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--text2)', marginBottom: 14 }}>
          {project.owner_name && <span>👤 {project.owner_name}</span>}
          {project.team_number && <span>👥 Team {project.team_number}</span>}
          {project.start_date && <span>📅 {fmtDate(project.start_date)}{project.end_date ? ` → ${fmtDate(project.end_date)}` : ''}</span>}
        </div>

        {/* Status change + delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <select
            value={project.status}
            onChange={e => onStatusChange(project.id, e.target.value)}
            style={{
              flex: 1, padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 8,
              fontFamily: 'inherit', fontSize: 12, color: 'var(--text)', background: 'white', cursor: 'pointer', outline: 'none',
            }}
          >
            {['Planning', 'Active', 'On Hold', 'Completed'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onDelete(project.id)}
            title="Delete project"
          >🗑</button>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getProjects({ search, status: statusF })
      .then(r => setProjects(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusF]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createProject({
        ...form,
        team_number: form.team_number ? Number(form.team_number) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      setModal(false);
      setForm(EMPTY);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    await updateProject(id, { status: newStatus });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    await deleteProject(id);
    load();
  };

  // Stats
  const counts = {
    total: projects.length,
    active: projects.filter(p => p.status === 'Active').length,
    planning: projects.filter(p => p.status === 'Planning').length,
    completed: projects.filter(p => p.status === 'Completed').length,
  };

  return (
    <div className="page-content">

      {/* ── Stat strip ──────────────────────────────────────────────── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { icon: '📁', val: counts.total,     label: 'Total Projects', color: 'var(--accent)' },
          { icon: '🟢', val: counts.active,    label: 'Active',         color: 'var(--green)' },
          { icon: '🔵', val: counts.planning,  label: 'Planning',       color: 'var(--accent)' },
          { icon: '✅', val: counts.completed, label: 'Completed',      color: 'var(--teal)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="filters-bar">
        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="">All Status</option>
          <option>Active</option>
          <option>Planning</option>
          <option>On Hold</option>
          <option>Completed</option>
        </select>
        <button className="btn btn-accent btn-sm" onClick={() => setModal(true)}>
          ＋ New Project
        </button>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="empty"><div className="empty-icon">⏳</div><div className="empty-text">Loading…</div></div>
      ) : projects.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📁</div>
          <div className="empty-text">No projects yet</div>
          <div className="empty-sub" style={{ marginTop: 8 }}>
            <button className="btn btn-accent btn-sm" onClick={() => setModal(true)}>Create your first project</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── New Project Modal ────────────────────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => { setModal(false); setForm(EMPTY); }}
        title="📁 New Project"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setModal(false); setForm(EMPTY); }}>Cancel</button>
            <button className="btn btn-accent" onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Project Name *</label>
          <input className="form-control" placeholder="e.g. EMIS Mobile App" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea className="form-control" placeholder="What is this project about?" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option>Planning</option><option>Active</option><option>On Hold</option><option>Completed</option>
            </select>
          </div>
          <div className="form-group">
            <label>Team Number</label>
            <input type="number" className="form-control" placeholder="e.g. 3" value={form.team_number}
              onChange={e => setForm({ ...form, team_number: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" className="form-control" value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="date" className="form-control" value={form.end_date}
              onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>Color</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {PALETTE.map(c => (
              <div
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: form.color === c ? '3px solid var(--text)' : '3px solid transparent',
                  boxShadow: form.color === c ? '0 0 0 2px white inset' : 'none',
                  transition: 'all .15s',
                }}
              />
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
