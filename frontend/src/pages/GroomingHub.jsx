import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getRequirements, createRequirement, getSprints, getUsers,
  getReqGrooming, uploadWireframe, uploadStakeholder,
  submitTlComment, submitPmComment, bulkPullToSprint,
} from '../api';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLOR = {
  Critical: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  High:     { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
  Medium:   { bg: '#fefce8', color: '#ca8a04', border: '#fde047' },
  Low:      { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
};
const STATUS_COLOR = {
  'Open':        { bg: '#eff6ff', color: '#1d4ed8' },
  'In Progress': { bg: '#fef9c3', color: '#a16207' },
  'Review':      { bg: '#fdf4ff', color: '#7e22ce' },
  'Done':        { bg: '#f0fdf4', color: '#15803d' },
};
const GROOMING_STATUS = {
  pending:           { label: 'Pending',           bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
  attachments_ready: { label: 'Attachments Ready', bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
  tl_reviewed:       { label: 'TL Reviewed',       bg: '#eff6ff', color: '#1e40af', border: '#93c5fd' },
  ready_for_sprint:  { label: '🚀 Ready for Sprint', bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
};

const DEPARTMENTS = ['DSE','DEE','SS','MS','DGE','DPS','Other','Tech Initiatives'];

const inputSt = { width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };
const labelSt = { fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function Chip({ label, color, bg, border }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: bg, color, border: `1px solid ${border || bg}`, display: 'inline-block', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function Avatar({ name, size = 28 }) {
  const initials = name ? name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() : '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function GroomingBadge({ groomingStatus }) {
  const gs = GROOMING_STATUS[groomingStatus] || GROOMING_STATUS.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: gs.bg, color: gs.color, border: `1px solid ${gs.border}`, whiteSpace: 'nowrap' }}>
      {gs.label}
    </span>
  );
}

// ── Step component for the checklist ─────────────────────────────────────────

function StepRow({ number, title, done, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: done ? '#16a34a' : 'var(--surface2)',
          color: done ? 'white' : 'var(--text3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
        }}>
          {done ? '✓' : number}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: done ? '#15803d' : 'var(--text)' }}>{title}</div>
      </div>
      <div style={{ marginLeft: 38 }}>{children}</div>
    </div>
  );
}

function LockedMsg({ msg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text3)', padding: '6px 10px', background: 'var(--surface)', borderRadius: 8 }}>
      <span>🔒</span> {msg}
    </div>
  );
}

// ── Upload Button ─────────────────────────────────────────────────────────────

function UploadBtn({ label, onFile, busy }) {
  const ref = useRef();
  return (
    <>
      <input type="file" ref={ref} style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) { onFile(e.target.files[0]); e.target.value = ''; } }} />
      <button
        onClick={() => ref.current?.click()}
        disabled={busy}
        style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--accent)', background: busy ? 'var(--surface)' : 'var(--accent-light)', color: 'var(--accent)', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit' }}
      >
        {busy ? '⏳ Uploading…' : `📎 ${label}`}
      </button>
    </>
  );
}

// ── Signed info row ───────────────────────────────────────────────────────────

function SignedRow({ name, date, fileUrl, filename }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px' }}>
      <span style={{ fontSize: 16 }}>✅</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#15803d' }}>Signed by {name}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(date)}{filename ? ` · ${filename}` : ''}</div>
      </div>
      {fileUrl && (
        <a href={fileUrl} target="_blank" rel="noreferrer"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', background: 'var(--accent-light)', padding: '4px 10px', borderRadius: 6, flexShrink: 0 }}>
          📥 Download
        </a>
      )}
    </div>
  );
}

// ── Grooming Modal ────────────────────────────────────────────────────────────

function GroomingModal({ req, onClose, onUpdated, sprints, users }) {
  const { user } = useAuth();

  const isTeamLead      = user?.role === 'PM Team Lead';
  const isProjectManager = !isTeamLead && (user?.perfiq === 'MANAGER' || (user?.role || '').toLowerCase().includes('project manager'));
  const canUpload       = !isTeamLead; // product managers & project managers can upload

  const [grooming, setGrooming]   = useState(null);
  const [gLoading, setGLoading]   = useState(true);
  const [wfBusy, setWfBusy]       = useState(false);
  const [shBusy, setShBusy]       = useState(false);
  const [tlText, setTlText]       = useState('');
  const [tlBusy, setTlBusy]       = useState(false);
  const [pmText, setPmText]       = useState('');
  const [pmBusy, setPmBusy]       = useState(false);
  const [err, setErr]             = useState('');

  useEffect(() => {
    if (!req) return;
    loadGrooming();
  }, [req?.id]);

  const loadGrooming = async () => {
    setGLoading(true);
    try {
      const res = await getReqGrooming(req.id);
      setGrooming(res.data);
      setTlText(res.data.tl_comment || '');
      setPmText(res.data.pm_comment || '');
    } catch {
      setErr('Failed to load grooming data.');
    } finally {
      setGLoading(false);
    }
  };

  const handleWireframe = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    setWfBusy(true); setErr('');
    try {
      const res = await uploadWireframe(req.id, fd);
      setGrooming(res.data);
      onUpdated();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Upload failed');
    } finally { setWfBusy(false); }
  };

  const handleStakeholder = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    setShBusy(true); setErr('');
    try {
      const res = await uploadStakeholder(req.id, fd);
      setGrooming(res.data);
      onUpdated();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Upload failed');
    } finally { setShBusy(false); }
  };

  const handleTlComment = async () => {
    if (!tlText.trim()) return;
    setTlBusy(true); setErr('');
    try {
      const res = await submitTlComment(req.id, tlText.trim());
      setGrooming(res.data);
      onUpdated();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to submit comment');
    } finally { setTlBusy(false); }
  };

  const handlePmComment = async () => {
    if (!pmText.trim()) return;
    setPmBusy(true); setErr('');
    try {
      const res = await submitPmComment(req.id, pmText.trim());
      setGrooming(res.data);
      onUpdated();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to submit comment');
    } finally { setPmBusy(false); }
  };

  const pc = PRIORITY_COLOR[req?.priority] || PRIORITY_COLOR.Medium;
  const sc = STATUS_COLOR[req?.status]     || STATUS_COLOR['Open'];
  const gs = grooming ? (GROOMING_STATUS[grooming.status] || GROOMING_STATUS.pending) : GROOMING_STATUS.pending;

  const attachmentsReady = grooming?.wireframe_signed_by && grooming?.stakeholder_signed_by;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'white', borderRadius: 18,
        width: '90vw', maxWidth: 1100,
        height: '88vh', maxHeight: 820,
        boxShadow: '0 28px 90px rgba(0,0,0,.24)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, background: 'var(--surface)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', marginBottom: 2 }}>{req.id}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
            <Chip label={req.priority} color={pc.color} bg={pc.bg} border={pc.border} />
            <Chip label={req.status}   color={sc.color} bg={sc.bg} />
            {req.department && <Chip label={`🏫 ${req.department}`} color="var(--text2)" bg="var(--surface2)" />}
            <GroomingBadge groomingStatus={grooming?.status || 'pending'} />
          </div>
          <button onClick={onClose} style={{ padding: '5px 9px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 15, color: 'var(--text2)', flexShrink: 0 }}>✕</button>
        </div>

        {/* ── Body: two columns ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left column: Requirement info (40%) */}
          <div style={{ width: '40%', borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '22px 24px', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 14 }}>Requirement Details</div>

            {req.description ? (
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', marginBottom: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                {req.description}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 18 }}>No description provided.</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Department', value: req.department || '—' },
                { label: 'Assignee',   value: req.assignee_name || 'Unassigned' },
                { label: 'Sprint',     value: req.sprint_name   || 'No sprint' },
                { label: 'Priority',   value: req.priority },
                { label: 'Status',     value: req.status },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
                  <span style={{ minWidth: 86, color: 'var(--text3)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Sub-items & comments mini-stats */}
            {(req.children_count > 0 || req.comment_count > 0 || req.attachment_count > 0) && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {req.children_count > 0    && <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>📋 {req.children_count} sub</span>}
                {req.comment_count > 0     && <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>💬 {req.comment_count}</span>}
                {req.attachment_count > 0  && <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>📎 {req.attachment_count}</span>}
              </div>
            )}
          </div>

          {/* Right column: Grooming checklist (60%) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 18 }}>Grooming Checklist</div>

            {err && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, color: '#dc2626', marginBottom: 16 }}>
                {err}
              </div>
            )}

            {gLoading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text2)' }}>Loading grooming state…</div>
            ) : (
              <>
                {/* Step 1: Wireframe Signoff */}
                <StepRow number={1} title="Wireframe Signoff (UI/UX)" done={!!grooming?.wireframe_signed_by}>
                  {grooming?.wireframe_signed_by ? (
                    <SignedRow
                      name={grooming.wireframe_signed_by_name}
                      date={grooming.wireframe_signed_at}
                      fileUrl={grooming.wireframe_file_url}
                      filename={grooming.wireframe_filename}
                    />
                  ) : canUpload ? (
                    <UploadBtn label="Upload Wireframe File" onFile={handleWireframe} busy={wfBusy} />
                  ) : (
                    <LockedMsg msg="Waiting for wireframe attachment" />
                  )}
                </StepRow>

                {/* Step 2: Stakeholder Signoff */}
                <StepRow number={2} title="Stakeholder Requirement Signoff" done={!!grooming?.stakeholder_signed_by}>
                  {grooming?.stakeholder_signed_by ? (
                    <SignedRow
                      name={grooming.stakeholder_signed_by_name}
                      date={grooming.stakeholder_signed_at}
                      fileUrl={grooming.stakeholder_file_url}
                      filename={grooming.stakeholder_filename}
                    />
                  ) : canUpload ? (
                    <UploadBtn label="Upload Stakeholder Document" onFile={handleStakeholder} busy={shBusy} />
                  ) : (
                    <LockedMsg msg="Waiting for stakeholder attachment" />
                  )}
                </StepRow>

                {/* Step 3: TL Review */}
                <StepRow number={3} title="Team Lead Review" done={!!grooming?.tl_comment}>
                  {grooming?.tl_comment ? (
                    <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 14 }}>✅</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1e40af' }}>{grooming.tl_commented_by_name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(grooming.tl_commented_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic' }}>"{grooming.tl_comment}"</div>
                    </div>
                  ) : isTeamLead ? (
                    attachmentsReady ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea
                          value={tlText}
                          onChange={e => setTlText(e.target.value)}
                          rows={3}
                          placeholder="Enter your TL review comment…"
                          style={{ ...inputSt, resize: 'vertical' }}
                        />
                        <div>
                          <button
                            onClick={handleTlComment}
                            disabled={tlBusy || !tlText.trim()}
                            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: 'white', cursor: tlBusy || !tlText.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, opacity: !tlText.trim() ? .5 : 1 }}
                          >
                            {tlBusy ? 'Submitting…' : '✍️ Submit TL Comment'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <LockedMsg msg="Complete steps 1 & 2 first before TL review" />
                    )
                  ) : (
                    <LockedMsg msg="Waiting for Team Lead comment" />
                  )}
                </StepRow>

                {/* Step 4: PM Review */}
                <StepRow number={4} title="Project Manager Review" done={!!grooming?.pm_comment}>
                  {grooming?.pm_comment ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 14 }}>✅</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#15803d' }}>{grooming.pm_commented_by_name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(grooming.pm_commented_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic' }}>"{grooming.pm_comment}"</div>
                    </div>
                  ) : isProjectManager ? (
                    grooming?.tl_comment ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea
                          value={pmText}
                          onChange={e => setPmText(e.target.value)}
                          rows={3}
                          placeholder="Enter your PM review comment…"
                          style={{ ...inputSt, resize: 'vertical' }}
                        />
                        <div>
                          <button
                            onClick={handlePmComment}
                            disabled={pmBusy || !pmText.trim()}
                            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', cursor: pmBusy || !pmText.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, opacity: !pmText.trim() ? .5 : 1 }}
                          >
                            {pmBusy ? 'Submitting…' : '✍️ Submit PM Approval'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <LockedMsg msg="Waiting for Team Lead comment first" />
                    )
                  ) : (
                    <LockedMsg msg="Waiting for Project Manager review" />
                  )}
                </StepRow>

                {/* ── Status Summary ── */}
                <div style={{ marginTop: 8, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
                  {grooming?.status === 'ready_for_sprint' ? (
                    <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: '18px 22px', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>🚀</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d' }}>Ready for Sprint</div>
                      <div style={{ fontSize: 12.5, color: '#4ade80', marginTop: 4 }}>All grooming steps complete. This requirement is sprint-ready.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {['pending','attachments_ready','tl_reviewed','ready_for_sprint'].map((s, i) => {
                        const statuses = ['pending','attachments_ready','tl_reviewed','ready_for_sprint'];
                        const currentIdx = statuses.indexOf(grooming?.status || 'pending');
                        const done = i < currentIdx;
                        const active = i === currentIdx;
                        return (
                          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: done ? '#16a34a' : active ? '#1d4ed8' : '#d1d5db',
                              flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 11, color: done ? '#15803d' : active ? '#1e40af' : 'var(--text3)', fontWeight: active ? 700 : 400 }}>
                              {GROOMING_STATUS[s]?.label}
                            </span>
                            {i < 3 && <div style={{ width: 20, height: 1, background: done ? '#86efac' : '#e5e7eb', flexShrink: 0 }} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Requirement Inline Form ────────────────────────────────────────────

function CreateReqForm({ sprints, users, onCreated, onCancel }) {
  const [form, setForm] = useState({ title: '', priority: 'Medium', status: 'Open', assignee: '', sprint: '', description: '', department: '' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setBusy(true); setErr('');
    try {
      const payload = { ...form };
      if (!payload.assignee)   delete payload.assignee;
      if (!payload.sprint)     delete payload.sprint;
      if (!payload.department) delete payload.department;
      const res = await createRequirement(payload);
      onCreated(res.data);
    } catch (e) {
      setErr(e?.response?.data?.title?.[0] || 'Failed to create requirement');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ background: 'white', border: '1.5px solid var(--accent)', borderRadius: 12, padding: 20, marginBottom: 18, boxShadow: '0 4px 20px rgba(26,86,219,.08)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 14 }}>New Requirement</div>

      {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, padding: '7px 12px', fontSize: 12.5, color: '#dc2626', marginBottom: 12 }}>{err}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelSt}>Title *</label>
          <input value={form.title} onChange={set('title')} placeholder="Requirement title" style={inputSt} autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelSt}>Priority</label>
            <select value={form.priority} onChange={set('priority')} style={inputSt}>
              {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Status</label>
            <select value={form.status} onChange={set('status')} style={inputSt}>
              {['Open','In Progress','Review','Done'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Department</label>
            <select value={form.department} onChange={set('department')} style={inputSt}>
              <option value="">Select Dept</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelSt}>Assignee</label>
            <select value={form.assignee} onChange={set('assignee')} style={inputSt}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Sprint</label>
            <select value={form.sprint} onChange={set('sprint')} style={inputSt}>
              <option value="">No Sprint</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelSt}>Description</label>
          <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Describe the requirement…" style={{ ...inputSt, resize: 'vertical' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={submit} disabled={busy || !form.title.trim()}
          style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, opacity: !form.title.trim() ? .5 : 1 }}>
          {busy ? 'Creating…' : '✨ Create Requirement'}
        </button>
        <button onClick={onCancel}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Pull Sprint Modal ─────────────────────────────────────────────────────────

function PullSprintModal({ selected, sprints, onClose, onPulled }) {
  const [pullSprint, setPullSprint] = useState('');
  const [pulling,    setPulling]    = useState(false);
  const [pullErr,    setPullErr]    = useState('');

  const handlePull = async () => {
    if (!pullSprint || selected.size === 0) return;
    setPulling(true); setPullErr('');
    try {
      await bulkPullToSprint(Array.from(selected), pullSprint);
      onPulled();
    } catch (e) {
      setPullErr(e?.response?.data?.error || 'Failed to pull requirements into sprint');
    } finally { setPulling(false); }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 950 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'white', borderRadius: 16,
        width: '92vw', maxWidth: 440,
        boxShadow: '0 20px 70px rgba(0,0,0,.28)',
        padding: '28px 28px 24px',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>🚀 Pull to Sprint</div>
          <button onClick={onClose} style={{ padding: '4px 9px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 15, color: 'var(--text2)' }}>✕</button>
        </div>

        {/* Selected count */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#1e40af' }}>
          ✅ {selected.size} requirement{selected.size !== 1 ? 's' : ''} selected
        </div>

        {/* Sprint picker */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Select Sprint</label>
          <select
            value={pullSprint}
            onChange={e => { setPullSprint(e.target.value); setPullErr(''); }}
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer' }}
          >
            <option value="">— Choose a sprint —</option>
            {sprints.filter(s => s.status === 'Active' || s.status === 'Planning').map(s => (
              <option key={s.id} value={s.id}>
                {s.status === 'Active' ? '⚡' : '📅'} {s.name} ({s.status})
              </option>
            ))}
          </select>
        </div>

        {/* Error */}
        {pullErr && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, color: '#dc2626' }}>
            {pullErr}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handlePull}
            disabled={!pullSprint || pulling}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 9, border: 'none',
              background: !pullSprint || pulling ? '#d1d5db' : 'linear-gradient(135deg,#065f46,#059669)',
              color: 'white', fontWeight: 700, fontSize: 13, cursor: !pullSprint || pulling ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {pulling ? '⏳ Pulling…' : `🚀 Pull ${selected.size} item${selected.size !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={onClose}
            style={{ padding: '10px 18px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'white', color: 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GroomingHub() {
  const { user } = useAuth();

  const isTeamLead       = user?.role === 'PM Team Lead';
  const isScrumMaster    = user?.role === 'Scrum Master';
  const isProjectManager = !isTeamLead && !isScrumMaster && (user?.perfiq === 'MANAGER' || (user?.role || '').toLowerCase().includes('project manager') || user?.role?.toLowerCase().includes('product manager'));

  const [reqs,    setReqs]    = useState([]);
  const [sprints, setSprints] = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDept,     setFilterDept]     = useState('');
  const [filterGrooming, setFilterGrooming] = useState('');

  const [modal,      setModal]      = useState(null); // requirement object
  const [showCreate, setShowCreate] = useState(false);

  // SM bulk-pull state
  const [selected,   setSelected]   = useState(new Set());
  const [pullModal,  setPullModal]  = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, s, u] = await Promise.all([getRequirements(), getSprints(), getUsers()]);
      setReqs(r.data); setSprints(s.data); setUsers(u.data);
    } finally { setLoading(false); }
  };

  const handleCreated = async (newReq) => {
    setShowCreate(false);
    await loadData();
    setModal(newReq);
  };

  const handleGroomingUpdated = async () => {
    const r = await getRequirements();
    setReqs(r.data);
    // Refresh modal's req data too
    if (modal) {
      const updated = r.data.find(x => x.id === modal.id);
      if (updated) setModal(updated);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = reqs.filter(r => {
    if (r.parent) return false; // hide sub-items from list
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus   && r.status   !== filterStatus)   return false;
    if (filterPriority && r.priority !== filterPriority) return false;
    if (filterDept     && r.department !== filterDept)   return false;
    if (filterGrooming && r.grooming_status !== filterGrooming) return false;
    return true;
  });

  // Summary counts
  const byGrooming = (s) => reqs.filter(r => !r.parent && r.grooming_status === s).length;

  const allVisibleSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));
  const someSelected = selected.size > 0;
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.id)));
    }
  };

  return (
    <div style={{ padding: '24px 28px', flex: 1 }}>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Pending',           val: byGrooming('pending'),           color: '#6b7280', bg: '#f3f4f6' },
          { label: 'Attachments Ready', val: byGrooming('attachments_ready'), color: '#92400e', bg: '#fffbeb' },
          { label: 'TL Reviewed',       val: byGrooming('tl_reviewed'),       color: '#1e40af', bg: '#eff6ff' },
          { label: 'Ready for Sprint',  val: byGrooming('ready_for_sprint'),  color: '#15803d', bg: '#f0fdf4' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', cursor: 'pointer', transition: 'box-shadow .15s' }}
            onClick={() => setFilterGrooming(filterGrooming === Object.keys(GROOMING_STATUS).find(k => GROOMING_STATUS[k].label.replace('🚀 ','') === s.label) ? '' : Object.keys(GROOMING_STATUS).find(k => GROOMING_STATUS[k].label.replace('🚀 ','') === s.label))}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* SM: select-all checkbox */}
        {isScrumMaster && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'white', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            Select All
          </label>
        )}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search requirements…"
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All Statuses</option>
          {['Open','In Progress','Review','Done'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          style={{ padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All Priorities</option>
          {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          style={{ padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All Depts</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filterGrooming} onChange={e => setFilterGrooming(e.target.value)}
          style={{ padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">All Grooming</option>
          {Object.entries(GROOMING_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {!isScrumMaster && (
          <button
            onClick={() => setShowCreate(c => !c)}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
            + New Requirement
          </button>
        )}
        {/* SM: quick filter to ready-for-sprint */}
        {isScrumMaster && (
          <button
            onClick={() => setFilterGrooming(f => f === 'ready_for_sprint' ? '' : 'ready_for_sprint')}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #86efac', background: filterGrooming === 'ready_for_sprint' ? '#16a34a' : '#f0fdf4', color: filterGrooming === 'ready_for_sprint' ? 'white' : '#15803d', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
            🚀 Sprint-Ready Only
          </button>
        )}
        {/* SM: open pull modal when items are selected */}
        {isScrumMaster && someSelected && (
          <button
            onClick={() => setPullModal(true)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#065f46,#059669)', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            🚀 Pull {selected.size} to Sprint
          </button>
        )}
      </div>

      {/* ── Create form (inline) ── */}
      {showCreate && (
        <CreateReqForm
          sprints={sprints}
          users={users}
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* ── List ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>Loading requirements…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🌱</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No requirements found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Click "+ New Requirement" to create one.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(r => {
            const pc = PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.Medium;
            const sc = STATUS_COLOR[r.status]   || STATUS_COLOR['Open'];
            const gs = GROOMING_STATUS[r.grooming_status] || GROOMING_STATUS.pending;
            const isChecked = selected.has(r.id);
            return (
              <div
                key={r.id}
                onClick={() => isScrumMaster ? toggleSelect(r.id) : setModal(r)}
                style={{ background: isChecked ? '#eff6ff' : 'white', border: `1px solid ${isChecked ? '#93c5fd' : 'var(--border)'}`, borderLeft: `4px solid ${pc.color}`, borderRadius: 12, padding: '13px 18px', cursor: 'pointer', transition: 'box-shadow .15s, background .1s' }}
                onMouseEnter={e => { if (!isChecked) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.08)'; }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* SM checkbox */}
                  {isScrumMaster && (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(r.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0, accentColor: 'var(--accent)' }}
                    />
                  )}
                  <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text3)', flexShrink: 0 }}>{r.id}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>{r.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip label={r.priority} color={pc.color} bg={pc.bg} border={pc.border} />
                      <Chip label={r.status}   color={sc.color} bg={sc.bg} />
                      {r.department && <Chip label={`🏫 ${r.department}`} color="var(--text2)" bg="var(--surface2)" />}
                      {r.assignee_name && <span style={{ fontSize: 11, color: 'var(--text2)' }}>👤 {r.assignee_name}</span>}
                      {r.sprint_name   && <span style={{ fontSize: 11, color: 'var(--text2)' }}>🏃 {r.sprint_name}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: gs.bg, color: gs.color, border: `1px solid ${gs.border}` }}>
                      {gs.label}
                    </span>
                    {/* SM: open grooming modal via button, not row click */}
                    {isScrumMaster && (
                      <button
                        onClick={e => { e.stopPropagation(); setModal(r); }}
                        style={{ padding: '4px 10px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', whiteSpace: 'nowrap' }}
                        title="View grooming checklist"
                      >
                        📋 Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Grooming Modal ── */}
      {modal && (
        <GroomingModal
          req={modal}
          onClose={() => setModal(null)}
          onUpdated={handleGroomingUpdated}
          sprints={sprints}
          users={users}
        />
      )}

      {/* ── Pull Sprint Modal ── */}
      {pullModal && (
        <PullSprintModal
          selected={selected}
          sprints={sprints}
          onClose={() => setPullModal(false)}
          onPulled={async () => {
            setPullModal(false);
            setSelected(new Set());
            await loadData();
          }}
        />
      )}
    </div>
  );
}
