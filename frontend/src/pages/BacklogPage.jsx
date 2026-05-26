import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Requirements from './Requirements';
import GroomingHub from './GroomingHub';

const ALL_VIEWS = [
  { id: 'list',     icon: '📋', label: 'Requirements', desc: 'Backlog & items' },
  { id: 'grooming', icon: '🌱', label: 'Grooming Hub',  desc: 'Pipeline & review' },
];

export default function BacklogPage() {
  const { user } = useAuth();

  const role = user?.role || '';
  const perfiq = user?.perfiq || '';
  const isCTO = perfiq === 'CTO';
  const isPM   = role === 'Product Manager';
  const isTL   = role === 'PM Team Lead';
  const isMgr  = role === 'Manager';

  // PM, TL, Manager, CTO only see Grooming Hub
  const groomingOnly = isPM || isTL || isMgr || isCTO;
  const VIEWS = groomingOnly ? ALL_VIEWS.filter(v => v.id === 'grooming') : ALL_VIEWS;

  const [view, setView] = useState('grooming');

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

      {/* ── Left sub-nav ──────────────────────────────────────────── */}
      <div style={{
        width: 64, flexShrink: 0,
        background: 'linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)',
        borderRight: '1.5px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', paddingTop: 20, gap: 6,
        position: 'sticky', top: 0,
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        zIndex: 10,
      }}>
        {VIEWS.map(v => {
          const active = view === v.id;
          return (
            <button
              key={v.id}
              title={`${v.label} — ${v.desc}`}
              onClick={() => setView(v.id)}
              style={{
                width: 44, height: 44, borderRadius: 12, border: 'none',
                background: active
                  ? 'linear-gradient(135deg,#1a56db,#0d9488)'
                  : 'transparent',
                color: active ? 'white' : 'var(--text2)',
                fontSize: 20, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? '0 4px 12px rgba(26,86,219,.35)' : 'none',
                transition: 'all .18s',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(26,86,219,.08)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {v.icon}
              {/* active indicator dot */}
              {active && (
                <span style={{
                  position: 'absolute', right: 4, top: 4,
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'rgba(255,255,255,.8)',
                }} />
              )}
            </button>
          );
        })}

        {/* vertical label */}
        <div style={{
          marginTop: 'auto', marginBottom: 16, fontSize: 9.5,
          fontWeight: 700, color: 'var(--text3)', letterSpacing: '.5px',
          textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.4,
        }}>
          {VIEWS.find(v => v.id === view)?.label.split(' ').map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {view === 'list'     && <Requirements />}
        {view === 'grooming' && <GroomingHub readOnly={isCTO} />}
      </div>
    </div>
  );
}
