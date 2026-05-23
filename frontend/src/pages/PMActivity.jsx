import { useState, useEffect, useCallback } from 'react';
import PageLoader from '../components/PageLoader';
import { getPMWorkSummary } from '../api/index';

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

function dateStr(d) { return d.toISOString().slice(0, 10); }
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function CatBadge({ cat }) {
  const c = CATS[cat] || { label: cat, icon: '📌', color: '#64748b', bg: '#f8fafc' };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: c.bg, color: c.color, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {c.icon} {c.label}
    </span>
  );
}

// ── PM Card ────────────────────────────────────────────────────────────────
function PMCard({ pm, expanded, onToggle }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'background .15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
        onMouseLeave={e => e.currentTarget.style.background = 'white'}
      >
        {/* Avatar */}
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#6d28d9,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0 }}>
          {pm.user_initials}
        </div>

        {/* Name + role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{pm.user_name}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Product Manager</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {pm.entry_count === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', padding: '4px 12px', background: 'var(--surface)', borderRadius: 20 }}>No entries logged</span>
          ) : (
            <>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#1a56db', background: '#dbeafe', padding: '4px 14px', borderRadius: 20 }}>{pm.total_hours.toFixed(1)}h</span>
              <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--surface)', padding: '4px 10px', borderRadius: 20 }}>{pm.entry_count} {pm.entry_count === 1 ? 'activity' : 'activities'}</span>
              {Object.entries(pm.categories).map(([cat, info]) => {
                const c = CATS[cat] || { icon: '📌', bg: '#f8fafc', color: '#64748b' };
                return (
                  <span key={cat} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color }}>
                    {c.icon} {info.hours.toFixed(1)}h
                  </span>
                );
              })}
            </>
          )}
        </div>

        {/* Expand chevron */}
        {pm.entry_count > 0 && (
          <span style={{ fontSize: 18, color: 'var(--text3)', transform: expanded ? 'rotate(180deg)' : '', transition: 'transform .2s' }}>⌄</span>
        )}
      </div>

      {/* Expanded entries */}
      {expanded && pm.entry_count > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '0 20px 16px' }}>
          {pm.entries.map(e => {
            const cat = CATS[e.category] || CATS.documentation;
            return (
              <div key={e.id} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{e.title}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <CatBadge cat={e.category} />
                    {e.description && (
                      <span style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>{e.description}</span>
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

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PMActivity() {
  const [date, setDate]       = useState(dateStr(new Date()));
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPMWorkSummary(date);
      setData(res.data);
      // Auto-expand PMs who have entries
      const exp = {};
      (res.data.pms || []).forEach(pm => { if (pm.entry_count > 0) exp[pm.user_id] = true; });
      setExpanded(exp);
    } catch {}
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const navigate = (days) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(dateStr(d));
  };

  const pms = data?.pms || [];
  const totalHours = pms.reduce((s, pm) => s + pm.total_hours, 0);
  const activePMs  = pms.filter(pm => pm.entry_count > 0).length;

  return (
    <div style={{ padding: '28px 32px', background: 'var(--surface)', minHeight: '100vh' }}>

      {/* Date navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 18 }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{fmtDate(date)}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            {date === dateStr(new Date()) ? '📅 Today' : date}
          </div>
        </div>
        <button onClick={() => navigate(1)} disabled={date >= dateStr(new Date())} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 18, opacity: date >= dateStr(new Date()) ? .3 : 1 }}>›</button>
        <button onClick={() => setDate(dateStr(new Date()))} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Today</button>
      </div>

      {/* Summary strip */}
      {!loading && data && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '14px 20px', border: '1px solid var(--border)', minWidth: 140, flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1a56db' }}>{totalHours.toFixed(1)}h</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Total hours logged</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '14px 20px', border: '1px solid var(--border)', minWidth: 140, flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d' }}>{activePMs}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>PMs active today</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '14px 20px', border: '1px solid var(--border)', minWidth: 140, flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#7c3aed' }}>{pms.length - activePMs}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>No entries yet</div>
          </div>
        </div>
      )}

      {/* PM cards */}
      {loading ? (
        <PageLoader message="Loading PM activity…" />
      ) : pms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No Product Managers found.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pms.map(pm => (
            <PMCard
              key={pm.user_id}
              pm={pm}
              expanded={!!expanded[pm.user_id]}
              onToggle={() => setExpanded(p => ({ ...p, [pm.user_id]: !p[pm.user_id] }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
