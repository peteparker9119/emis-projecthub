/**
 * Reusable page for Tasks, Requirements, and Bugs
 * type: 'tasks' | 'requirements' | 'bugs'
 */
import { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask, getRequirements, createRequirement, updateRequirement, deleteRequirement, getBugs, createBug, updateBug, deleteBug, getSprints, getUsers } from '../api';
import Modal from '../components/Modal';
import '../components/Modal.css';
import { useToast } from '../context/ToastContext';

const CONFIG = {
  tasks: {
    label: 'Task', prefix: 'TSK', icon: '✅',
    statuses: ['To Do','In Progress','Review','Done'],
    list: getTasks, create: createTask, update: updateTask, del: deleteTask,
  },
  requirements: {
    label: 'Requirement', prefix: 'REQ', icon: '📋',
    statuses: ['Open','In Progress','Review','Done'],
    list: getRequirements, create: createRequirement, update: updateRequirement, del: deleteRequirement,
  },
  bugs: {
    label: 'Bug', prefix: 'BUG', icon: '🐛',
    statuses: ['Open','In Progress','Fixed','Closed'],
    list: getBugs, create: createBug, update: updateBug, del: deleteBug,
  },
};

const empty = { title:'', priority:'Medium', status:'', description:'', assignee:'', sprint:'', bug_type:'UI' };

const priorityBadge = p => ({ Critical:'badge-red', High:'badge-amber', Medium:'badge-blue', Low:'badge-green' }[p]||'badge-gray');
const statusBadge = s => ({ Done:'badge-green', Fixed:'badge-green', 'In Progress':'badge-blue', Open:'badge-red', 'To Do':'badge-gray', Review:'badge-amber', Closed:'badge-gray' }[s]||'badge-gray');

export default function ItemPage({ type, tab, onTabChange, externalCreate, onExternalCreateDone }) {
  const cfg = CONFIG[type];
  const showToast = useToast();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [prioF, setPrioF] = useState('');
  const [statusF, setStatusF] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...empty, status: cfg.statuses[0] });
  const [sprints, setSprints] = useState([]);
  const [users, setUsers] = useState([]);

  const load = () => cfg.list({ search, priority: prioF, status: statusF }).then(r => setItems(r.data)).catch(console.error);
  useEffect(() => { load(); }, [search, prioF, statusF, type]);
  useEffect(() => {
    getSprints().then(r => setSprints(r.data)).catch(console.error);
    getUsers().then(r => setUsers(r.data)).catch(console.error);
  }, []);
  useEffect(() => { if (externalCreate) { setModal(true); onExternalCreateDone(); } }, [externalCreate]);

  const save = async () => {
    if (!form.title) return;
    try {
      await cfg.create(form);
      showToast(`${cfg.label} "${form.title}" created`, 'success');
      setModal(false); setForm({ ...empty, status: cfg.statuses[0] }); load();
    } catch (e) {
      showToast(e?.response?.data?.error || `Failed to create ${cfg.label}`, 'error');
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await cfg.update(id, { status });
      showToast(`${id} moved to ${status}`, 'info');
      load();
    } catch (e) {
      showToast(e?.response?.data?.error || 'Status update failed', 'error');
    }
  };

  const remove = async (id) => {
    if (!confirm(`Delete ${id}?`)) return;
    try {
      await cfg.del(id);
      showToast(`${id} deleted`, 'info');
      load();
    } catch (e) {
      showToast(e?.response?.data?.error || 'Delete failed', 'error');
    }
  };

  const activeView = tab || 'list';

  return (
    <div className="page-content">
      {type === 'tasks' && (
        <div className="tabs">
          <div className={`tab ${activeView === 'list' ? 'active' : ''}`} onClick={() => onTabChange('list')}>📋 List</div>
          <div className={`tab ${activeView === 'board' ? 'active' : ''}`} onClick={() => onTabChange('board')}>📌 Board</div>
        </div>
      )}

      {activeView === 'board' && type === 'tasks' ? (
        <KanbanBoard items={items} onStatusChange={changeStatus} onAdd={() => setModal(true)} />
      ) : (
        <>
          <div className="filters-bar">
            <div className="search-wrap"><input className="search-input" placeholder={`Search ${type}…`} value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select className="filter-select" value={prioF} onChange={e => setPrioF(e.target.value)}>
              <option value="">All Priority</option>
              {['Critical','High','Medium','Low'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
              <option value="">All Status</option>
              {cfg.statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn btn-accent btn-sm" onClick={() => setModal(true)}>＋ Add {cfg.label}</button>
          </div>

          {items.length === 0 ? (
            <div className="empty"><div className="empty-icon">📭</div><div className="empty-text">No items found</div></div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Assignee</th><th>Sprint</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {items.map(i => (
                      <tr key={i.id}>
                        <td><span style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: 'var(--accent)' }}>{i.id}</span></td>
                        <td style={{ fontWeight: 600, maxWidth: 280 }}>{i.title}</td>
                        <td><span className={`priority-dot p-${i.priority.toLowerCase()}`}></span>{i.priority}</td>
                        <td>
                          <select onChange={e => changeStatus(i.id, e.target.value)} value={i.status}
                            style={{ fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', background: 'white', fontFamily: 'inherit', cursor: 'pointer' }}>
                            {cfg.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 24, height: 24, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white' }}>
                              {(i.assignee_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                            </div>
                            <span style={{ fontSize: 12 }}>{(i.assignee_name||'—').split(' ')[0]}</span>
                          </div>
                        </td>
                        <td><span style={{ fontSize: 11, fontFamily: 'DM Mono,monospace', color: 'var(--text2)' }}>{i.sprint || '—'}</span></td>
                        <td><button className="btn btn-danger btn-sm" onClick={() => remove(i.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={`${cfg.icon} Create ${cfg.label}`}
        footer={<><button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-accent" onClick={save}>Create</button></>}>
        <div className="form-group"><label>Title *</label><input className="form-control" placeholder="Describe this item…" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
        <div className="form-row">
          <div className="form-group"><label>Priority</label>
            <select className="form-control" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
              {['Critical','High','Medium','Low'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Status</label>
            <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              {cfg.statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Assignee</label>
            <select className="form-control" value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})}>
              <option value="">— Unassigned —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Sprint</label>
            <select className="form-control" value={form.sprint} onChange={e => setForm({...form, sprint: e.target.value})}>
              <option value="">— No Sprint —</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><label>Description</label><textarea className="form-control" placeholder="Add details…" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
        {type === 'bugs' && (
          <div className="form-group"><label>Bug Type</label>
            <select className="form-control" value={form.bug_type} onChange={e => setForm({...form, bug_type: e.target.value})}>
              {['UI','API','Data','Performance','Security'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </Modal>
    </div>
  );
}

function KanbanBoard({ items, onStatusChange, onAdd }) {
  const cols = ['To Do','In Progress','Review','Done'];
  const colColors = { 'To Do':'#6b7280', 'In Progress':'#1a56db', 'Review':'#d97706', 'Done':'#16a34a' };
  return (
    <div>
      <div style={{ marginBottom: 12 }}><button className="btn btn-accent btn-sm" onClick={onAdd}>＋ Add Task</button></div>
      <div className="kanban-board">
        {cols.map(col => {
          const cards = items.filter(t => t.status === col);
          return (
            <div key={col} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-col-title" style={{ color: colColors[col] }}>{col}</span>
                <span className="kanban-col-count">{cards.length}</span>
              </div>
              <div className="kanban-cards">
                {cards.map(t => (
                  <div key={t.id} className="kanban-card">
                    <div className="kanban-card-id">{t.id}</div>
                    <div className="kanban-card-title">{t.title}</div>
                    <div className="kanban-card-meta">
                      <span className={`badge badge-${t.priority === 'Critical' ? 'red' : t.priority === 'High' ? 'amber' : t.priority === 'Medium' ? 'blue' : 'green'}`}>{t.priority}</span>
                      <div style={{ width: 22, height: 22, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white' }}>
                        {(t.assignee_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
                {!cards.length && <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
