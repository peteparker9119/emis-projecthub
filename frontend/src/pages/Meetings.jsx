import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMeetings, createMeeting, updateMeeting, deleteMeeting, getUsers } from '../api';

// ── Constants ──────────────────────────────────────────────────────────────
const MEETING_TYPES = {
  standup:         { label: 'Daily Standup',       icon: '🏆', color: '#0d9488' },
  sprint_planning: { label: 'Sprint Planning',      icon: '📋', color: '#1a56db' },
  sprint_review:   { label: 'Sprint Review',        icon: '🔍', color: '#7c3aed' },
  retrospective:   { label: 'Retrospective',        icon: '🔄', color: '#b45309' },
  grooming:        { label: 'Grooming Session',     icon: '🌱', color: '#15803d' },
  stakeholder:     { label: 'Stakeholder Meeting',  icon: '🤝', color: '#be185d' },
  one_on_one:      { label: '1-on-1',               icon: '👥', color: '#0369a1' },
  technical:       { label: 'Technical Discussion', icon: '⚙️',  color: '#475569' },
  general:         { label: 'General Meeting',      icon: '📅', color: '#1a56db' },
};

const COLOR_OPTIONS = ['#1a56db','#0d9488','#7c3aed','#d97706','#dc2626','#15803d','#be185d','#0369a1'];

const HOUR_START = 7;   // 7am
const HOUR_END   = 21;  // 9pm
const TOTAL_MINS = (HOUR_END - HOUR_START) * 60; // 840

const iSt = { width: '100%', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' };
const lSt = { fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 };

// ── Date helpers ───────────────────────────────────────────────────────────
function getMondayOfWeek(offset = 0) {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function dateStr(d)  { return d.toISOString().slice(0, 10); }
function fmtDay(d)   { return d.toLocaleDateString('en-IN', { weekday: 'short' }); }
function fmtDate(d)  { return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function toLocalISO(d) {
  // Returns YYYY-MM-DDTHH:MM in local time for datetime-local inputs
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localToISO(localStr) {
  // Convert datetime-local string to ISO UTC string
  return new Date(localStr).toISOString();
}

// ── Meeting block positioning ──────────────────────────────────────────────
function getMeetingPos(meeting) {
  const start = new Date(meeting.start_datetime);
  const end   = new Date(meeting.end_datetime);
  const startMin = (start.getHours() - HOUR_START) * 60 + start.getMinutes();
  const endMin   = (end.getHours()   - HOUR_START) * 60 + end.getMinutes();
  const topPct    = Math.max(0, startMin) / TOTAL_MINS * 100;
  const heightPct = Math.max(2, Math.min(endMin, TOTAL_MINS) - Math.max(0, startMin)) / TOTAL_MINS * 100;
  return { top: `${topPct}%`, height: `${heightPct}%` };
}

// ── Avatar chip ────────────────────────────────────────────────────────────
function AvatarChip({ name, onRemove }) {
  const initials = name ? name.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase() : '?';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, padding: '3px 10px 3px 6px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 700 }}>{initials}</span>
      {name.split(' ')[0]}
      {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>}
    </span>
  );
}

// ── Meeting Form Modal ─────────────────────────────────────────────────────
function MeetingFormModal({ initial, users, onClose, onSaved }) {
  const { user: me } = useAuth();
  const isEdit = !!initial?.id;

  const defaultStart = initial?.prefillDate ? (() => {
    const d = new Date(initial.prefillDate);
    d.setHours(initial.prefillHour || 9, 0, 0, 0);
    return d;
  })() : new Date();

  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const [form, setForm] = useState({
    title:          initial?.title        || '',
    meeting_type:   initial?.meeting_type || 'general',
    color:          initial?.color        || '#1a56db',
    start_datetime: initial?.start_datetime ? toLocalISO(new Date(initial.start_datetime)) : toLocalISO(defaultStart),
    end_datetime:   initial?.end_datetime   ? toLocalISO(new Date(initial.end_datetime))   : toLocalISO(defaultEnd),
    description:    initial?.description  || '',
    location:       initial?.location     || '',
  });
  const [attendeeIds, setAttendeeIds] = useState(
    initial?.attendee_ids ? [...initial.attendee_ids] : []
  );
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');
  const [userSearch, setUserSearch] = useState('');

  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // Sync color when meeting_type changes
  const handleTypeChange = e => {
    const t = e.target.value;
    const c = MEETING_TYPES[t]?.color || '#1a56db';
    setForm(p => ({ ...p, meeting_type: t, color: c }));
  };

  const addGroup = (filterFn) => {
    const ids = users.filter(filterFn).map(u => u.id);
    setAttendeeIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const removeAttendee = (id) => setAttendeeIds(prev => prev.filter(x => x !== id));

  const filteredUsers = users.filter(u =>
    u.id !== me?.id &&
    !attendeeIds.includes(u.id) &&
    (userSearch === '' || u.name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const submit = async () => {
    if (!form.title.trim())           { setErr('Title is required'); return; }
    if (!form.start_datetime)         { setErr('Start time is required'); return; }
    if (!form.end_datetime)           { setErr('End time is required'); return; }
    if (form.start_datetime >= form.end_datetime) { setErr('End must be after start'); return; }

    setBusy(true); setErr('');
    const payload = {
      ...form,
      start_datetime: localToISO(form.start_datetime),
      end_datetime:   localToISO(form.end_datetime),
      attendees: attendeeIds,
      created_by: me?.id,
    };
    try {
      if (isEdit) {
        await updateMeeting(initial.id, payload);
      } else {
        await createMeeting(payload);
      }
      onSaved();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to save meeting');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 18, width: '94vw', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.22)' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: form.color + '18' }}>
          <span style={{ fontSize: 24 }}>{MEETING_TYPES[form.meeting_type]?.icon || '📅'}</span>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 800, color: form.color }}>{isEdit ? 'Edit Meeting' : 'Schedule Meeting'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, color: '#dc2626' }}>{err}</div>}

          {/* Title */}
          <div>
            <label style={lSt}>Title *</label>
            <input value={form.title} onChange={F('title')} placeholder="Meeting title" style={iSt} autoFocus />
            <span className="field-hint">A clear subject for the meeting. E.g. "Sprint 14 Planning Session".</span>
          </div>

          {/* Type + Color row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={lSt}>Meeting Type</label>
              <select value={form.meeting_type} onChange={handleTypeChange} style={iSt}>
                {Object.entries(MEETING_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
              <span className="field-hint">Category of meeting. Auto-assigns a matching color.</span>
            </div>
            <div>
              <label style={lSt}>Color</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLOR_OPTIONS.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                    style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #1e293b' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
              <span className="field-hint">Visual color for this meeting block on the calendar.</span>
            </div>
          </div>

          {/* Date/time row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lSt}>Start *</label>
              <input type="datetime-local" value={form.start_datetime} onChange={F('start_datetime')} style={iSt} />
              <span className="field-hint">Date and time the meeting begins.</span>
            </div>
            <div>
              <label style={lSt}>End *</label>
              <input type="datetime-local" value={form.end_datetime} onChange={F('end_datetime')} style={iSt} />
              <span className="field-hint">Must be after the start time.</span>
            </div>
          </div>

          {/* Location */}
          <div>
            <label style={lSt}>Location / Link</label>
            <input value={form.location} onChange={F('location')} placeholder="Room, Google Meet link, etc." style={iSt} />
            <span className="field-hint">Physical room name or video call link. E.g. "Conference Room A" or a Google Meet URL.</span>
          </div>

          {/* Description */}
          <div>
            <label style={lSt}>Description / Agenda</label>
            <textarea value={form.description} onChange={F('description')} rows={3} placeholder="Meeting agenda or notes…" style={{ ...iSt, resize: 'vertical' }} />
            <span className="field-hint">List agenda items, objectives, or prep notes for attendees.</span>
          </div>

          {/* Attendees */}
          <div>
            <label style={lSt}>Attendees</label>
            <span className="field-hint">Search and add individual members, or use quick-add buttons to invite an entire group.</span>

            {/* Role group quick-add buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {[
                { label: '+ All Managers',   fn: u => u.perfiq === 'MANAGER' },
                { label: '+ All Developers', fn: u => u.perfiq === 'EMPLOYEE' },
                { label: '+ All PMs',        fn: u => u.role   === 'Product Manager' },
              ].map(g => (
                <button key={g.label} onClick={() => addGroup(g.fn)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px solid var(--accent)', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {g.label}
                </button>
              ))}
            </div>

            {/* Individual user search */}
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search user to add…"
              style={{ ...iSt, marginBottom: 8 }} />
            {userSearch && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 160, overflowY: 'auto', marginBottom: 10 }}>
                {filteredUsers.slice(0, 20).map(u => (
                  <div key={u.id} onClick={() => { setAttendeeIds(p => [...p, u.id]); setUserSearch(''); }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--surface)', padding: '1px 6px', borderRadius: 4 }}>{u.perfiq || u.role}</span>
                    {u.name}
                  </div>
                ))}
                {filteredUsers.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text3)' }}>No users found</div>}
              </div>
            )}

            {/* Selected attendees */}
            {attendeeIds.length > 0 ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {attendeeIds.map(id => {
                  const u = users.find(x => x.id === id);
                  return u ? <AvatarChip key={id} name={u.name} onRemove={() => removeAttendee(id)} /> : null;
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>No attendees added yet.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <button onClick={submit} disabled={busy || !form.title.trim()}
            style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: form.color, color: 'white', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', opacity: !form.title.trim() ? .5 : 1 }}>
            {busy ? 'Saving…' : isEdit ? '✏️ Update Meeting' : '📅 Schedule Meeting'}
          </button>
          <button onClick={onClose}
            style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Meeting Detail Modal ───────────────────────────────────────────────────
function MeetingDetailModal({ meeting, currentUser, onClose, onEdit, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const t = MEETING_TYPES[meeting.meeting_type] || MEETING_TYPES.general;
  const canEdit = currentUser?.id === meeting.created_by || currentUser?.perfiq === 'CTO';

  const handleDelete = async () => {
    if (!window.confirm('Delete this meeting?')) return;
    setDeleting(true);
    try { await deleteMeeting(meeting.id); onDeleted(); }
    catch { setDeleting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 18, width: '92vw', maxWidth: 540, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>

        {/* Color header */}
        <div style={{ background: meeting.color, padding: '20px 24px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, opacity: .8, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{t.icon} {t.label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>{meeting.title}</div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, color: 'white', width: 32, height: 32, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, opacity: .9 }}>
            📅 {fmtTime(meeting.start_datetime)} – {fmtTime(meeting.end_datetime)}
            <span style={{ marginLeft: 10, opacity: .7, fontSize: 12 }}>
              {new Date(meeting.start_datetime).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {meeting.location && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <span>📍</span>
              <span style={{ color: 'var(--text)' }}>{meeting.location}</span>
            </div>
          )}
          {meeting.description && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>
              {meeting.description}
            </div>
          )}

          {/* Organiser */}
          <div style={{ fontSize: 12.5, color: 'var(--text2)' }}>
            <span style={{ fontWeight: 600 }}>Organized by:</span> {meeting.created_by_name}
          </div>

          {/* Attendees */}
          {meeting.attendee_count > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
                Attendees ({meeting.attendee_count})
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {meeting.attendee_names.map(name => <AvatarChip key={name} name={name} />)}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <button onClick={onEdit} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: meeting.color, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>✏️ Edit</button>
            <button onClick={handleDelete} disabled={deleting} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {deleting ? 'Deleting…' : '🗑 Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Weekly Calendar ────────────────────────────────────────────────────────
function WeeklyCalendar({ days, meetings, onSlotClick, onMeetingClick }) {
  const today = dateStr(new Date());
  const hours  = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  // Group meetings by day
  const byDay = {};
  days.forEach(d => { byDay[dateStr(d)] = []; });
  meetings.forEach(m => {
    const d = dateStr(new Date(m.start_datetime));
    if (byDay[d]) byDay[d].push(m);
  });

  // Detect overlaps within a day to render side-by-side
  function layoutDay(dayMeetings) {
    const sorted = [...dayMeetings].sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    const slots = [];
    sorted.forEach(m => {
      const startMs = new Date(m.start_datetime).getTime();
      const endMs   = new Date(m.end_datetime).getTime();
      let placed = false;
      for (const slot of slots) {
        const last = slot[slot.length - 1];
        if (new Date(last.end_datetime).getTime() <= startMs) {
          slot.push(m);
          placed = true;
          break;
        }
      }
      if (!placed) slots.push([m]);
    });
    const result = {};
    slots.forEach((slot, colIdx) => {
      slot.forEach(m => { result[m.id] = { col: colIdx, totalCols: slots.length }; });
    });
    return result;
  }

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden', background: 'white', borderRadius: 14, border: '1px solid var(--border)' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '2px solid var(--border)', flexShrink: 0 }}>
        <div style={{ background: 'var(--surface)' }} />
        {days.map(d => {
          const isToday = dateStr(d) === today;
          return (
            <div key={dateStr(d)} style={{ padding: '10px 4px', textAlign: 'center', background: isToday ? '#eff6ff' : 'var(--surface)', borderLeft: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? '#1a56db' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{fmtDay(d)}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? '#1a56db' : 'var(--text)', lineHeight: 1.2 }}>{d.getDate()}</div>
              <div style={{ fontSize: 10, color: isToday ? '#1a56db' : 'var(--text3)' }}>{fmtDate(d)}</div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex' }}>
        {/* Hour labels */}
        <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid var(--border)', position: 'relative' }}>
          {hours.map(h => (
            <div key={h} style={{ height: `${100 / hours.length}%`, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', paddingTop: 2, justifyContent: 'flex-end', paddingRight: 6 }}>
              <span style={{ fontSize: 10.5, color: 'var(--text3)', fontWeight: 600 }}>
                {h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : `${h}am`}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(d => {
          const ds = dateStr(d);
          const dayMeetings = byDay[ds] || [];
          const layout = layoutDay(dayMeetings);
          const isToday = ds === today;

          return (
            <div key={ds} style={{ flex: 1, borderLeft: '1px solid var(--border)', position: 'relative', background: isToday ? '#fafeff' : 'white' }}>
              {/* Hour rows (clickable) */}
              {hours.map(h => (
                <div key={h} onClick={() => onSlotClick(d, h)}
                  style={{ height: `${100 / hours.length}%`, borderBottom: '1px solid #f1f5f9', cursor: 'pointer', boxSizing: 'border-box' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
              ))}

              {/* Meeting blocks */}
              {dayMeetings.map(m => {
                const { top, height } = getMeetingPos(m);
                const { col, totalCols } = layout[m.id] || { col: 0, totalCols: 1 };
                const widthPct  = 100 / totalCols;
                const leftPct   = col * widthPct;
                const t = MEETING_TYPES[m.meeting_type] || MEETING_TYPES.general;
                return (
                  <div key={m.id}
                    onClick={e => { e.stopPropagation(); onMeetingClick(m); }}
                    title={`${m.title}\n${fmtTime(m.start_datetime)} – ${fmtTime(m.end_datetime)}\n${m.attendee_count} attendee(s)`}
                    style={{
                      position: 'absolute', top, height,
                      left: `${leftPct + 1}%`, width: `${widthPct - 2}%`,
                      background: m.color + 'dd',
                      borderLeft: `3px solid ${m.color}`,
                      borderRadius: 6, padding: '3px 6px',
                      cursor: 'pointer', overflow: 'hidden', boxSizing: 'border-box',
                      boxShadow: '0 1px 6px rgba(0,0,0,.1)',
                      transition: 'opacity .15s',
                      zIndex: 10,
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{t.icon} {m.title}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.85)', lineHeight: 1.3 }}>{fmtTime(m.start_datetime)}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Meeting Reminder Toast ─────────────────────────────────────────────────
function ReminderToast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div style={{ position: 'fixed', bottom: 90, right: 24, zIndex: 8000, background: '#1e293b', color: 'white', borderRadius: 14, padding: '14px 18px', boxShadow: '0 8px 40px rgba(0,0,0,.3)', maxWidth: 340, display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'slideUp .3s ease' }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>⏰</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>Meeting Reminder</div>
        <div style={{ fontSize: 12.5, opacity: .85 }}>{toast.message}</div>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: 18, cursor: 'pointer', padding: 0, flexShrink: 0 }}>×</button>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Meetings() {
  const { user } = useAuth();
  const canCreate = user?.role === 'Product Manager' || user?.role === 'Scrum Master';

  const [weekOffset,  setWeekOffset]  = useState(0);
  const [meetings,    setMeetings]    = useState([]);
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);  // meeting to edit
  const [detailMtg,   setDetailMtg]  = useState(null);   // meeting to view
  const [slotPrefill, setSlotPrefill] = useState(null);  // { date, hour } for new form
  const [toast,       setToast]       = useState(null);
  const toastFiredRef = useRef(new Set());

  const monday = getMondayOfWeek(weekOffset);
  const days   = getWeekDays(monday);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mr, ur] = await Promise.all([
        getMeetings({ week_start: dateStr(monday) }),
        getUsers(),
      ]);
      setMeetings(mr.data);
      setUsers(ur.data);
    } catch {}
    finally { setLoading(false); }
  }, [weekOffset]);

  useEffect(() => { load(); }, [load]);

  // Reminder polling
  useEffect(() => {
    const check = () => {
      const now  = new Date();
      const soon = new Date(now.getTime() + 15 * 60 * 1000);
      meetings.forEach(m => {
        const start = new Date(m.start_datetime);
        if (start > now && start <= soon && !toastFiredRef.current.has(m.id)) {
          toastFiredRef.current.add(m.id);
          const mins = Math.ceil((start - now) / 60000);
          setToast({ message: `"${m.title}" starts in ${mins} min` });
          setTimeout(() => setToast(null), 10000);
        }
      });
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [meetings]);

  const handleSlotClick = (day, hour) => {
    if (!canCreate) return;
    setSlotPrefill({ date: day, hour });
    setShowForm(true);
  };

  const handleMeetingClick = (m) => setDetailMtg(m);

  const handleSaved = () => {
    setShowForm(false);
    setEditMeeting(null);
    setSlotPrefill(null);
    setDetailMtg(null);
    load();
  };

  const handleEditFromDetail = () => {
    setEditMeeting(detailMtg);
    setDetailMtg(null);
    setShowForm(true);
  };

  const weekLabel = (() => {
    const end = new Date(monday);
    end.setDate(end.getDate() + 6);
    return `${monday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 58px)', padding: '16px 20px', gap: 12, background: 'var(--surface)' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => setWeekOffset(p => p - 1)} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{weekLabel}</div>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}>← Back to This Week</button>
          )}
        </div>
        <button onClick={() => setWeekOffset(p => p + 1)} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>›</button>
        {canCreate && (
          <button onClick={() => { setEditMeeting(null); setSlotPrefill(null); setShowForm(true); }}
            style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', boxShadow: '0 4px 14px rgba(26,86,219,.22)', whiteSpace: 'nowrap' }}>
            + Schedule Meeting
          </button>
        )}
      </div>

      {/* Calendar */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 14 }}>Loading calendar…</div>
      ) : (
        <WeeklyCalendar
          days={days}
          meetings={meetings}
          onSlotClick={handleSlotClick}
          onMeetingClick={handleMeetingClick}
        />
      )}

      {/* Modals */}
      {showForm && (
        <MeetingFormModal
          initial={editMeeting
            ? editMeeting
            : slotPrefill
              ? { prefillDate: slotPrefill.date, prefillHour: slotPrefill.hour }
              : null}
          users={users}
          onClose={() => { setShowForm(false); setEditMeeting(null); setSlotPrefill(null); }}
          onSaved={handleSaved}
        />
      )}

      {detailMtg && (
        <MeetingDetailModal
          meeting={detailMtg}
          currentUser={user}
          onClose={() => setDetailMtg(null)}
          onEdit={handleEditFromDetail}
          onDeleted={handleSaved}
        />
      )}

      {/* Reminder toast */}
      <ReminderToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
