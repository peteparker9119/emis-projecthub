import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const ALL_MENUS = [
  // ── Main ──────────────────────────────────────────────────────
  { id: 'dashboard',     label: 'Dashboard',        icon: '🏠', section: 'Main',        roles: ['CTO','MANAGER','EMPLOYEE'] },

  // ── Work ──────────────────────────────────────────────────────
  { id: 'projects',      label: 'Projects',          icon: '📁', section: 'Work',        roles: [] },
  { id: 'sprints',       label: 'Sprints',           icon: '🏃', section: 'Work',        roles: ['CTO','MANAGER','EMPLOYEE'] },
  { id: 'tasks',         label: 'Tasks',             icon: '✅', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'requirements',  label: 'Requirements',      icon: '📋', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'bugs',          label: 'Bugs',              icon: '🐛', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'ideas',         label: 'Ideas',             icon: '💡', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'releases',      label: 'Releases',          icon: '🚀', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'kanban',        label: 'Kanban Board',      icon: '🗂️', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'groomhub',      label: 'Grooming Hub',      icon: '🌱', section: 'Work',        roles: [] },
  { id: 'meetings',      label: 'Meetings',           icon: '📅', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },

  // ── Personal ──────────────────────────────────────────────────
  { id: 'mytasks',       label: 'My Tasks',          icon: '📌', section: 'Personal',    roles: ['MANAGER','EMPLOYEE'] },
  { id: 'profile',       label: 'My Profile',        icon: '👤', section: 'Personal',    roles: ['MANAGER','EMPLOYEE'] },

  // ── Insights (Manager+) ───────────────────────────────────────
  { id: 'reports',       label: 'Reports',           icon: '📊', section: 'Insights',    roles: ['CTO','MANAGER'] },
  { id: 'members',       label: 'Team Members',      icon: '👥', section: 'Insights',    roles: ['CTO'] },
  { id: 'capacity',      label: 'Capacity Tracker',  icon: '⚖️', section: 'Insights',    roles: ['CTO','MANAGER'] },

  // ── CTO Command ───────────────────────────────────────────────
  { id: 'mytasks',       label: 'My Tasks',          icon: '📌', section: 'CTO Command', roles: ['CTO'] },
  { id: 'track',         label: 'Track Employees',   icon: '🎯', section: 'CTO Command', roles: ['CTO'] },
  { id: 'sprintactivity',label: 'Sprint Activity',   icon: '⚡', section: 'CTO Command', roles: ['CTO'] },
  { id: 'letters',       label: 'Letter Management', icon: '✉️', section: 'CTO Command', roles: ['CTO'] },
  { id: 'menubuilder',   label: 'Menu Builder',      icon: '🧩', section: 'CTO Command', roles: ['CTO'] },
  { id: 'admin',         label: 'Admin Controls',    icon: '🛡️', section: 'CTO Command', roles: ['CTO'] },
  { id: 'pmactivity',    label: 'PM Activity',       icon: '📊', section: 'CTO Command', roles: ['CTO'] },
  { id: 'meetings',      label: 'Meetings',           icon: '📅', section: 'CTO Command', roles: ['CTO'] },

  // ── Scrum Master ──────────────────────────────────────────────
  { id: 'scrummaster',   label: 'SM Dashboard',      icon: '🏆', section: 'Scrum',       roles: ['SM'] },
  { id: 'teamdash',      label: 'My Team',           icon: '👥', section: 'Scrum',       roles: ['SM'] },
  { id: 'sprints',       label: 'Sprints',           icon: '🏃', section: 'Scrum',       roles: ['SM'] },
  { id: 'requirements',  label: 'Backlog',           icon: '📋', section: 'Scrum',       roles: ['SM'] },
  { id: 'kanban',        label: 'Kanban Board',      icon: '🗂️', section: 'Scrum',       roles: ['SM'] },
  { id: 'groomhub',      label: 'Grooming Hub',      icon: '🌱', section: 'Scrum',       roles: [] },
  { id: 'epics',         label: 'Epics',             icon: '🗺️', section: 'Scrum',       roles: ['SM'] },
  { id: 'releases',      label: 'Releases',          icon: '🚀', section: 'Scrum',       roles: ['SM'] },
  { id: 'pmactivity',    label: 'PM Activity',       icon: '📊', section: 'Scrum',       roles: ['SM'] },
  { id: 'members',       label: 'Team Members',      icon: '👥', section: 'Scrum',       roles: ['SM'] },
  { id: 'capacity',      label: 'Capacity Tracker',  icon: '⚖️', section: 'Scrum',       roles: ['SM'] },
  { id: 'meetings',      label: 'Meetings',           icon: '📅', section: 'Scrum',       roles: ['SM'] },
  { id: 'pmdailylog',    label: 'My Work Log',       icon: '📓', section: 'My Work',     roles: ['SM'] },
  { id: 'profile',       label: 'My Profile',        icon: '👤', section: 'Personal',    roles: ['SM'] },

  // ── Product Manager ───────────────────────────────────────────
  { id: 'teamdash',      label: 'My Team',            icon: '👥', section: 'PM Work',     roles: ['TL'] },
  { id: 'pmdailylog',    label: 'My Work Log',        icon: '📓', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'epics',         label: 'Epics',             icon: '🗺️', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'releases',      label: 'Releases',          icon: '🚀', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'kanban',        label: 'Kanban Board',      icon: '🗂️', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'groomhub',      label: 'Grooming Hub',      icon: '🌱', section: 'PM Work',     roles: [] },
  { id: 'requirements',  label: 'Requirements',      icon: '📋', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'sprints',       label: 'Sprints',           icon: '🏃', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'meetings',      label: 'Meetings',           icon: '📅', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'profile',       label: 'My Profile',        icon: '👤', section: 'Personal',    roles: ['PM','TL'] },
];

// ── Per-user localStorage order ───────────────────────────────────────────────
function loadOrder(userId) {
  try { return JSON.parse(localStorage.getItem(`sidebar_order_${userId}`) || '{}'); } catch { return {}; }
}
function saveOrder(userId, order) {
  try { localStorage.setItem(`sidebar_order_${userId}`, JSON.stringify(order)); } catch {}
}

export default function Sidebar({ currentPage, onNavigate, badges = {}, collapsed = false, onToggle }) {
  const { user, logout } = useAuth();
  const [sectionOrders, setSectionOrders] = useState(() => user ? loadOrder(user.id) : {});
  const [dragState, setDragState] = useState(null); // {section, fromId}

  const reorder = useCallback((section, fromId, toId) => {
    setSectionOrders(prev => {
      const base = ALL_MENUS.filter(m => m.section === section).map(m => m.id);
      const current = prev[section] ? prev[section] : base;
      const arr = [...current];
      const fi = arr.indexOf(fromId);
      const ti = arr.indexOf(toId);
      if (fi < 0 || ti < 0 || fi === ti) return prev;
      arr.splice(fi, 1); arr.splice(ti, 0, fromId);
      const next = { ...prev, [section]: arr };
      if (user) saveOrder(user.id, next);
      return next;
    });
  }, [user]);

  if (!user) return null;

  const effectiveRole =
    user.role === 'Scrum Master' ? 'SM' :
    user.role === 'PM Team Lead' ? 'TL' :
    user.role === 'Product Manager' ? 'PM' :
    user.perfiq;

  // Group visible menus by section, applying saved order within each section
  const visibleMenus = ALL_MENUS.filter(m => m.roles.includes(effectiveRole));
  const sections = [...new Map(visibleMenus.map(m => [m.section, true])).keys()];
  const orderedMenus = sections.flatMap(section => {
    const items = visibleMenus.filter(m => m.section === section);
    const savedOrder = sectionOrders[section];
    if (!savedOrder) return items;
    const ordered = [];
    savedOrder.forEach(id => { const f = items.find(m => m.id === id); if (f) ordered.push(f); });
    items.forEach(m => { if (!ordered.find(o => o.id === m.id && o.section === m.section)) ordered.push(m); });
    return ordered;
  });

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <aside style={{
      width: sidebarWidth,
      background: '#0f172a',
      color: 'white',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100, overflowY: 'auto',
      transition: 'width .2s ease',
    }}>

      {/* ── Toggle button ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end', padding: collapsed ? '12px 0' : '10px 10px 0', borderBottom: collapsed ? '1px solid rgba(255,255,255,.08)' : 'none' }}>
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,.15)',
            background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.8)',
            cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* ── Logo / Brand ─────────────────────────────────────────────── */}
      <div style={{ padding: collapsed ? '12px 0' : '14px 16px 16px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : 10 }}>
        <div style={{
          width: 36, height: 36, flexShrink: 0,
          background: 'linear-gradient(135deg, #1a56db, #0d9488)',
          borderRadius: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 800, fontSize: 14
        }}>EP</div>
        {!collapsed && (
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
            ProjectHub
            <small style={{ display: 'block', fontSize: 10, fontWeight: 400, opacity: .5, letterSpacing: '.5px', textTransform: 'uppercase' }}>TN EMIS</small>
          </div>
        )}
      </div>

      {/* ── User identity ────────────────────────────────────────────── */}
      <div style={{ padding: collapsed ? '12px 0' : '14px 16px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : 10 }}>
        <div
          className="av-ring"
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#1a56db,#0d9488)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}
          title={collapsed ? user.name : undefined}
        >
          {user.initials}
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name.split(' ')[0]}</div>
            <div style={{ fontSize: 10, opacity: .5, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {user.role === 'Scrum Master' ? 'SM · Product Manager' : user.role === 'Product Manager' ? 'Product Manager' : user.perfiq}
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: collapsed ? '12px 0' : '12px 0' }}>
        {(() => {
          let lastSection = '';
          return orderedMenus.map((m, idx) => {
            const showSection = m.section !== lastSection ? (lastSection = m.section, m.section) : null;
            const isDragOver  = dragState && dragState.section === m.section && dragState.overId === m.id;
            const isDragging  = dragState && dragState.section === m.section && dragState.fromId === m.id;
            return (
              <div key={`${m.section}-${m.id}-${idx}`}>
                {showSection && !collapsed && <div className="nav-section-label">{showSection}</div>}
                {showSection && collapsed && <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '4px 8px' }} />}
                <div
                  className={`nav-item${currentPage === m.id ? ' active' : ''}`}
                  draggable={!collapsed}
                  onDragStart={() => !collapsed && setDragState({ section: m.section, fromId: m.id, overId: null })}
                  onDragOver={e => {
                    if (collapsed || dragState?.section !== m.section) return;
                    e.preventDefault();
                    setDragState(p => p ? { ...p, overId: m.id } : null);
                  }}
                  onDrop={e => {
                    if (collapsed) return;
                    e.preventDefault();
                    if (dragState && dragState.section === m.section && dragState.fromId !== m.id) {
                      reorder(m.section, dragState.fromId, m.id);
                    }
                    setDragState(null);
                  }}
                  onDragEnd={() => setDragState(null)}
                  onClick={() => onNavigate(m.id)}
                  title={collapsed ? m.label : undefined}
                  style={{
                    opacity: isDragging ? 0.45 : 1,
                    borderTop: isDragOver && !isDragging ? '2px solid rgba(255,255,255,.4)' : undefined,
                    justifyContent: collapsed ? 'center' : undefined,
                    padding: collapsed ? '9px 0' : undefined,
                  }}
                >
                  <span style={{ fontSize: 16, width: collapsed ? 'auto' : 20, textAlign: 'center', flexShrink: 0 }}>{m.icon}</span>
                  {!collapsed && m.label}
                  {!collapsed && badges[m.id] > 0 && (
                    <span className="nav-badge">{badges[m.id]}</span>
                  )}
                  {!collapsed && (
                    <span className="drag-handle" title="Drag to reorder" style={{ marginLeft: 'auto', opacity: 0, fontSize: 12, cursor: 'grab', color: 'rgba(255,255,255,.4)', paddingLeft: 4 }}>⠿</span>
                  )}
                  {collapsed && badges[m.id] > 0 && (
                    <span style={{ position: 'absolute', top: 4, right: 8, minWidth: 14, height: 14, borderRadius: 7, background: '#dc2626', color: 'white', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{badges[m.id]}</span>
                  )}
                </div>
              </div>
            );
          });
        })()}
      </nav>
      <style>{`.nav-item:hover .drag-handle { opacity: 1 !important; }`}</style>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div style={{ padding: collapsed ? '12px 0' : '12px 16px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div
          onClick={logout}
          title={collapsed ? 'Sign Out' : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8, padding: collapsed ? '8px' : '8px 10px', cursor: 'pointer', fontSize: 12.5, color: 'rgba(255,255,255,.5)', borderRadius: 8, transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.5)'; }}
        >
          🚪 {!collapsed && 'Sign Out'}
        </div>
      </div>
    </aside>
  );
}
