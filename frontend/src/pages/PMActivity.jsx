import { useState, useEffect, useCallback } from 'react';
import PageLoader from '../components/PageLoader';
import { getPMWorkSummary, createNotification } from '../api/index';
import { useAuth } from '../context/AuthContext';

// ── Category config ────────────────────────────────────────────────────────
const CATS = {
  documentation:       { label: 'Documentation',       icon: '📄', color: '#1d4ed8', bg: '#dbeafe' },
  learning:            { label: 'Learning',             icon: '📚', color: '#7c3aed', bg: '#ede9fe' },
  internal_discussion: { label: 'Internal Discussion',  icon: '💬', color: '#0d9488', bg: '#ccfbf1' },
  external_discussion: { label: 'External Discussion',  icon: '🤝', color: '#b45309', bg: '#fef3c7' },
  online_discussion:   { label: 'Online Discussion',    icon: '🌐', color: '#0369a1', bg: '#e0f2fe' },
  grooming_discussion: { label: 'Grooming Discussion',  icon: '🌱', color: '#15803d', bg: '#dcfce7' },
  tech_discussion:     { label: 'Tech Discussion',      icon: '⚙️',  color: '#475569', bg: '#f1f5f9' },
  pmu_discussion:      { label: 'PMU Discussion',       icon: '📊', color: '#be185d', bg: '#fce7f3' },
};

const ITEM_TYPE_ICONS = {
  REQ: { icon: '📋', color: '#1d4ed8' },
  Bug: { icon: '🐛', color: '#dc2626' },
  Task: { icon: '✅', color: '#15803d' },
  QA: { icon: '🧪', color: '#7c3aed' },
  Report: { icon: '📊', color: '#b45309' },
  TI: { icon: '⚡', color: '#0369a1' },
  Spike: { icon: '🔬', color: '#0d9488' },
  Adhoc: { icon: '📌', color: '#64748b' },
};

function dateStr(d) { return d.toISOString().slice(0, 10); }
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Range presets ──────────────────────────────────────────────────────────
function getRange(mode) {
  const today = new Date();
  const todayStr = dateStr(today);
  if (mode === 'today') return { from: todayStr, to: todayStr };
  if (mode === 'week') {
    const mon = new Date(today);
    mon.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    return { from: dateStr(mon), to: todayStr };
  }
  if (mode === 'month') {
    return { from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`, to: todayStr };
  }
  return null; // custom
}

function CatBadge({ cat }) {
  const c = CATS[cat] || { label: cat, icon: '📌', color: '#64748b', bg: '#f8fafc' };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: c.bg, color: c.color, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {c.icon} {c.label}
    </span>
  );
}

// ── Notify Modal ───────────────────────────────────────────────────────────
function NotifyModal({ pm, currentUser, onClose, onSent }) {
  const [msg, setMsg] = useState(`Hi ${pm.user_name.split(' ')[0]}, your PM work log for this period is at ${pm.hours_pct}% (${pm.total_hours.toFixed(1)}h of ${pm.expected_hours}h expected). Please log your remaining activities.`);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleSend = async () => {
    if (!msg.trim()) { setErr('Message required'); return; }
    setBusy(true);
    try {
      await createNotification({
        recipient: pm.user_id,
        sender: currentUser?.id,
        title: `⚠️ Low PM Activity — ${pm.hours_pct}%`,
        message: msg.trim(),
        item_type: 'general',
      });
      onSent();
      onClose();
    } catch (e) { setErr(e?.response?.data?.detail || 'Send failed'); setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 480, maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>📢 Notify PM</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
              Sending to: <strong>{pm.user_name}</strong> · {pm.hours_pct}% logged ({pm.total_hours.toFixed(1)}h)
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Message *</label>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4}
          style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
        {err && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--surface2)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={handleSend} disabled={busy}
            style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#b45309,#d97706)', color: 'white', fontWeight: 700, fontSize: 13, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Sending…' : '📢 Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PM Card ────────────────────────────────────────────────────────────────
function PMCard({ pm, expanded, onToggle, onNotify, currentUser }) {
  const flagged = pm.attention_flag;
  const borderColor = flagged ? '#fecaca' : 'var(--border)';

  return (
    <div style={{ background: 'white', borderRadius: 16, border: `1.5px solid ${borderColor}`, overflow: 'hidden', boxShadow: flagged ? '0 2px 12px rgba(220,38,38,.1)' : '0 2px 12px rgba(0,0,0,.05)' }}>
      {/* Flag strip */}
      {flagged && (
        <div style={{ background: 'linear-gradient(90deg,#fef2f2,#fee2e2)', borderBottom: '1px solid #fecaca', padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span>🚨</span>
          <span style={{ color: '#dc2626', fontWeight: 700 }}>Attention needed</span>
          <span style={{ color: '#b45309' }}>— only {pm.hours_pct}% hours logged ({pm.total_hours.toFixed(1)}h of {pm.expected_hours}h expected)</span>
          {(currentUser?.perfiq === 'CTO' || currentUser?.role === 'Scrum Master') && (
            <button
              onClick={e => { e.stopPropagation(); onNotify(); }}
              style={{ marginLeft: 'auto', padding: '3px 12px', borderRadius: 7, border: 'none', background: '#dc2626', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              📢 Notify
            </button>
          )}
        </div>
      )}

      {/* Header row */}
      <div
        onClick={onToggle}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
        onMouseLeave={e => e.currentTarget.style.background = 'white'}
      >
        {/* Avatar */}
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#6d28d9,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0 }}>
          {pm.user_initials}
        </div>

        {/* Name + role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            {pm.user_name}
            {flagged && <span style={{ fontSize: 10, background: '#fef2f2', color: '#dc2626', padding: '1px 7px', borderRadius: 8, fontWeight: 700 }}>⚠ Below 50%</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Product Manager</div>
        </div>

        {/* Hours progress */}
        {pm.entry_count > 0 && (
          <div style={{ minWidth: 100 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ fontWeight: 700, color: flagged ? '#dc2626' : '#15803d' }}>{pm.total_hours.toFixed(1)}h</span>
              <span style={{ color: 'var(--text3)' }}>{pm.expected_hours}h</span>
            </div>
            <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(pm.hours_pct, 100)}%`, background: flagged ? '#ef4444' : '#16a34a', borderRadius: 3, transition: 'width .4s' }} />
            </div>
            <div style={{ fontSize: 10, color: flagged ? '#dc2626' : 'var(--text3)', marginTop: 2, fontWeight: 600 }}>{pm.hours_pct}% logged</div>
          </div>
        )}

        {/* Category hours pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', maxWidth: 300 }}>
          {pm.entry_count === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', padding: '4px 12px', background: 'var(--surface)', borderRadius: 20 }}>No entries logged</span>
          ) : (
            Object.entries(pm.categories).map(([cat, info]) => {
              const c = CATS[cat] || { icon: '📌', bg: '#f8fafc', color: '#64748b' };
              return (
                <span key={cat} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color }}>
                  {c.icon} {info.hours.toFixed(1)}h
                </span>
              );
            })
          )}
        </div>

        {/* Sprint items summary */}
        {pm.sprint_items && Object.keys(pm.sprint_items).length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            {Object.entries(pm.sprint_items).map(([type, count]) => {
              const cfg = ITEM_TYPE_ICONS[type] || { icon: '📌', color: '#64748b' };
              return (
                <span key={type} title={`${count} ${type} item(s) in sprint`}
                  style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${cfg.color}18`, color: cfg.color }}>
                  {cfg.icon} {count}
                </span>
              );
            })}
          </div>
        )}

        {/* Expand chevron */}
        {pm.entry_count > 0 && (
          <span style={{ fontSize: 18, color: 'var(--text3)', transform: expanded ? 'rotate(180deg)' : '', transition: 'transform .2s' }}>⌄</span>
        )}
      </div>

      {/* Expanded entries */}
      {expanded && pm.entry_count > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '0 20px 16px' }}>
          {/* Sprint items breakdown */}
          {pm.sprint_items && Object.keys(pm.sprint_items).length > 0 && (
            <div style={{ padding: '12px 0 10px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', marginBottom: 8 }}>Sprint Items</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(pm.sprint_items).map(([type, count]) => {
                  const cfg = ITEM_TYPE_ICONS[type] || { icon: '📌', color: '#64748b' };
                  return (
                    <span key={type} style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: `${cfg.color}15`, color: cfg.color }}>
                      {cfg.icon} {count} {type}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {pm.entries.map(e => {
            const cat = CATS[e.category] || CATS.documentation;
            return (
              <div key={e.id} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{e.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <CatBadge cat={e.category} />
                    <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--surface)', padding: '1px 7px', borderRadius: 8 }}>{e.date}</span>
                    {e.description && (
                      <span style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{e.description}</span>
                    )}
                  </div>
                  {(e.attachment_count > 0 || e.comment_count > 0) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11, color: 'var(--text2)' }}>
                      {e.attachment_count > 0 && <span>📎 {e.attachment_count}</span>}
                      {e.comment_count    > 0 && <span>💬 {e.comment_count}</span>}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 16, fontWeight: 900, color: cat.color, flexShrink: 0 }}>{Number(e.hours).toFixed(1)}h</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Card (grid view entry) ─────────────────────────────────────────────────
function EntryCard({ entry }) {
  const cat = CATS[entry.category] || { label: entry.category, icon: '📌', color: '#64748b', bg: '#f8fafc' };
  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 4, background: cat.color }} />
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <CatBadge cat={entry.category} />
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 10 }}>{entry.date}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {entry.title}
        </div>
        {entry.description && (
          <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {entry.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: cat.color }}>{Number(entry.hours).toFixed(1)}h</span>
          {entry.attachment_count > 0 && <span style={{ fontSize: 11, color: 'var(--text2)' }}>📎 {entry.attachment_count}</span>}
          {entry.comment_count > 0    && <span style={{ fontSize: 11, color: 'var(--text2)' }}>💬 {entry.comment_count}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PMActivity() {
  const { user } = useAuth();
  const [rangeMode, setRangeMode]   = useState('today'); // today|week|month|custom
  const [dateFrom, setDateFrom]     = useState(dateStr(new Date()));
  const [dateTo, setDateTo]         = useState(dateStr(new Date()));
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState({});
  const [viewMode, setViewMode]     = useState('list');
  const [catFilter, setCatFilter]   = useState('');
  const [notifyModal, setNotifyModal] = useState(null);
  const [sentCount, setSentCount]   = useState(0);

  const applyRange = useCallback((mode, customFrom, customTo) => {
    if (mode !== 'custom') {
      const r = getRange(mode);
      if (r) { setDateFrom(r.from); setDateTo(r.to); }
    } else if (customFrom && customTo) {
      setDateFrom(customFrom);
      setDateTo(customTo);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPMWorkSummary({ date_from: dateFrom, date_to: dateTo });
      setData(res.data);
      const exp = {};
      (res.data.pms || []).forEach(pm => { if (pm.entry_count > 0) exp[pm.user_id] = true; });
      setExpanded(exp);
    } catch {}
    finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleRangeMode = (mode) => {
    setRangeMode(mode);
    if (mode !== 'custom') applyRange(mode);
  };

  const pms = data?.pms || [];
  const totalHours  = pms.reduce((s, pm) => s + pm.total_hours, 0);
  const activePMs   = pms.filter(pm => pm.entry_count > 0).length;
  const flaggedPMs  = pms.filter(pm => pm.attention_flag).length;
  const expectedTotal = pms.reduce((s, pm) => s + (pm.expected_hours || 0), 0);

  // Category filter
  const filteredPMs = catFilter
    ? pms.map(pm => ({ ...pm, entries: pm.entries.filter(e => e.category === catFilter) })).filter(pm => pm.entries.length > 0)
    : pms;

  const isSingle = dateFrom === dateTo;
  const rangeLabel = isSingle ? fmtDate(dateFrom) : `${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`;

  return (
    <div style={{ padding: '28px 32px', background: 'var(--surface)', minHeight: '100vh' }}>

      {/* Range selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Mode pills */}
        <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {[['today','Today'],['week','This Week'],['month','This Month'],['custom','Custom']].map(([m, lbl]) => (
            <button key={m} onClick={() => handleRangeMode(m)}
              style={{ padding: '7px 14px', border: 'none', background: rangeMode === m ? '#1a56db' : 'white', color: rangeMode === m ? 'white' : 'var(--text2)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
              {lbl}
            </button>
          ))}
        </div>

        {rangeMode === 'custom' && (
          <>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} max={dateTo}
              style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit' }} />
            <span style={{ color: 'var(--text3)' }}>→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom} max={dateStr(new Date())}
              style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit' }} />
            <button onClick={load} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#1a56db', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Apply</button>
          </>
        )}

        {rangeMode !== 'custom' && (
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{rangeLabel}</span>
        )}

        {/* View toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[['list','☰'],['grid','⊞']].map(([mode, icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{ padding: '7px 12px', border: 'none', background: viewMode === mode ? '#1a56db' : 'white', color: viewMode === mode ? 'white' : 'var(--text2)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Category quick filters */}
      {!loading && data && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          <button onClick={() => setCatFilter('')}
            style={{ padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${!catFilter ? '#1a56db' : 'var(--border)'}`, background: !catFilter ? '#1a56db' : 'white', color: !catFilter ? 'white' : 'var(--text2)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            All
          </button>
          {Object.entries(CATS).map(([key, c]) => {
            const hasAny = pms.some(pm => pm.categories[key]);
            if (!hasAny) return null;
            return (
              <button key={key} onClick={() => setCatFilter(catFilter === key ? '' : key)}
                style={{ padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${catFilter === key ? c.color : 'var(--border)'}`, background: catFilter === key ? c.bg : 'white', color: catFilter === key ? c.color : 'var(--text2)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {c.icon} {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary strip */}
      {!loading && data && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
          {[
            { val: `${totalHours.toFixed(1)}h`, sub: `of ${expectedTotal}h expected`, color: '#1a56db' },
            { val: activePMs, sub: 'PMs with entries', color: '#15803d' },
            { val: pms.length - activePMs, sub: 'No entries', color: '#64748b' },
            { val: flaggedPMs, sub: 'Attention needed', color: '#dc2626' },
          ].map(({ val, sub, color }, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 12, padding: '14px 20px', border: '1px solid var(--border)', minWidth: 130, flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {sentCount > 0 && (
        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: '#065f46', fontWeight: 600 }}>
          ✅ {sentCount} notification{sentCount > 1 ? 's' : ''} sent this session.
        </div>
      )}

      {/* PM cards / grid */}
      {loading ? (
        <PageLoader message="Loading PM activity…" />
      ) : filteredPMs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No activities found for this period.</div>
        </div>
      ) : viewMode === 'grid' ? (
        <div>
          {filteredPMs.filter(pm => pm.entry_count > 0).map(pm => (
            <div key={pm.user_id} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6d28d9,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white' }}>
                  {pm.user_initials}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{pm.user_name}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: pm.attention_flag ? '#dc2626' : '#1a56db', background: pm.attention_flag ? '#fef2f2' : '#dbeafe', padding: '3px 12px', borderRadius: 20 }}>
                  {pm.total_hours.toFixed(1)}h ({pm.hours_pct}%)
                </span>
                {pm.attention_flag && <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>⚠ Attention</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {pm.entries.map(e => <EntryCard key={e.id} entry={e} />)}
              </div>
            </div>
          ))}
          {filteredPMs.filter(pm => pm.entry_count === 0).length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
              {filteredPMs.filter(pm => pm.entry_count === 0).map(pm => pm.user_name).join(', ')} — no entries
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredPMs.map(pm => (
            <PMCard
              key={pm.user_id}
              pm={pm}
              expanded={!!expanded[pm.user_id]}
              onToggle={() => setExpanded(p => ({ ...p, [pm.user_id]: !p[pm.user_id] }))}
              onNotify={() => setNotifyModal(pm)}
              currentUser={user}
            />
          ))}
        </div>
      )}

      {notifyModal && (
        <NotifyModal
          pm={notifyModal}
          currentUser={user}
          onClose={() => setNotifyModal(null)}
          onSent={() => { setSentCount(c => c + 1); setNotifyModal(null); }}
        />
      )}
    </div>
  );
}
