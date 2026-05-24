import { useState, useEffect } from 'react';
import { getIdeas, createIdea, voteIdea, getUsers } from '../api';
import Modal from '../components/Modal';
import '../components/Modal.css';
import { useToast } from '../context/ToastContext';

const statusColors = { Open:'badge-blue', 'Under Review':'badge-amber', Approved:'badge-green', Rejected:'badge-red' };

export default function Ideas({ externalCreate, onExternalCreateDone }) {
  const showToast = useToast();
  const [ideas, setIdeas] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', status:'Open' });
  const [users, setUsers] = useState([]);

  const load = () => getIdeas({ search }).then(r => setIdeas(r.data)).catch(console.error);
  useEffect(() => { load(); }, [search]);
  useEffect(() => { getUsers().then(r => setUsers(r.data)); }, []);
  useEffect(() => { if (externalCreate) { setModal(true); onExternalCreateDone(); } }, [externalCreate]);

  const save = async () => {
    if (!form.title) return;
    try {
      await createIdea(form);
      showToast(`Idea "${form.title}" submitted`, 'success');
      setModal(false); setForm({ title:'', description:'', status:'Open' }); load();
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to submit idea', 'error');
    }
  };

  const vote = async (id) => {
    try {
      await voteIdea(id);
      showToast('Vote recorded', 'success');
      load();
    } catch {}
  };

  return (
    <div className="page-content">
      <div className="filters-bar">
        <div className="search-wrap"><input className="search-input" placeholder="Search ideas…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <button className="btn btn-accent btn-sm" onClick={() => setModal(true)}>＋ Submit Idea</button>
      </div>

      {ideas.length === 0 ? (
        <div className="empty"><div className="empty-icon">💡</div><div className="empty-text">No ideas yet</div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {ideas.map(i => (
            <div key={i.id} className="card" style={{ padding: 0 }}>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: 'var(--accent)' }}>{i.id}</span>
                  <span className={`badge ${statusColors[i.status]||'badge-gray'}`}>{i.status}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>{i.title}</div>
                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{i.description}</p>
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 20, height: 20, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'white' }}>
                    {(i.submitted_by_name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>{(i.submitted_by_name||'').split(' ')[0]}</span>
                </div>
                <button onClick={() => vote(i.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 20, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  👍 {i.votes}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="💡 Submit Idea"
        footer={<><button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-accent" onClick={save}>Submit</button></>}>
        <div className="form-group"><label>Title *</label><input className="form-control" placeholder="Describe your idea…" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
        <div className="form-group"><label>Description</label><textarea className="form-control" placeholder="Add more details…" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
        <div className="form-group"><label>Status</label>
          <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            {['Open','Under Review','Approved','Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Modal>
    </div>
  );
}
