import { useAuth } from '../context/AuthContext';

const ALL_MENUS = [
  // ── Main ──────────────────────────────────────────────────────
  { id: 'dashboard',     label: 'Dashboard',        icon: '🏠', section: 'Main',        roles: ['CTO','MANAGER','EMPLOYEE'] },

  // ── Work ──────────────────────────────────────────────────────
  { id: 'projects',      label: 'Projects',          icon: '📁', section: 'Work',        roles: ['CTO','MANAGER'] },
  { id: 'sprints',       label: 'Sprints',           icon: '🏃', section: 'Work',        roles: ['CTO','MANAGER','EMPLOYEE'] },
  { id: 'tasks',         label: 'Tasks',             icon: '✅', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'requirements',  label: 'Requirements',      icon: '📋', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'bugs',          label: 'Bugs',              icon: '🐛', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'ideas',         label: 'Ideas',             icon: '💡', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'releases',      label: 'Releases',          icon: '🚀', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'kanban',        label: 'Kanban Board',      icon: '🗂️', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'groomhub',      label: 'Grooming Hub',      icon: '🌱', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },
  { id: 'meetings',      label: 'Meetings',           icon: '📅', section: 'Work',        roles: ['MANAGER','EMPLOYEE'] },

  // ── Personal ──────────────────────────────────────────────────
  { id: 'mytasks',       label: 'My Tasks',          icon: '📌', section: 'Personal',    roles: ['MANAGER','EMPLOYEE'] },
  { id: 'profile',       label: 'My Profile',        icon: '👤', section: 'Personal',    roles: ['MANAGER','EMPLOYEE'] },

  // ── Insights (Manager+) ───────────────────────────────────────
  { id: 'reports',       label: 'Reports',           icon: '📊', section: 'Insights',    roles: ['CTO','MANAGER'] },
  { id: 'members',       label: 'Team Members',      icon: '👥', section: 'Insights',    roles: ['CTO','MANAGER'] },

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
  { id: 'groomhub',      label: 'Grooming Hub',      icon: '🌱', section: 'Scrum',       roles: ['SM'] },
  { id: 'epics',         label: 'Epics',             icon: '🗺️', section: 'Scrum',       roles: ['SM'] },
  { id: 'releases',      label: 'Releases',          icon: '🚀', section: 'Scrum',       roles: ['SM'] },
  { id: 'pmactivity',    label: 'PM Activity',       icon: '📊', section: 'Scrum',       roles: ['SM'] },
  { id: 'members',       label: 'Team Members',      icon: '👥', section: 'Scrum',       roles: ['SM'] },
  { id: 'meetings',      label: 'Meetings',           icon: '📅', section: 'Scrum',       roles: ['SM'] },
  { id: 'pmdailylog',    label: 'My Work Log',       icon: '📓', section: 'My Work',     roles: ['SM'] },
  { id: 'profile',       label: 'My Profile',        icon: '👤', section: 'Personal',    roles: ['SM'] },

  // ── Product Manager ───────────────────────────────────────────
  { id: 'teamdash',      label: 'My Team',            icon: '👥', section: 'PM Work',     roles: ['TL'] },
  { id: 'pmdailylog',    label: 'My Work Log',        icon: '📓', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'epics',         label: 'Epics',             icon: '🗺️', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'releases',      label: 'Releases',          icon: '🚀', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'kanban',        label: 'Kanban Board',      icon: '🗂️', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'groomhub',      label: 'Grooming Hub',      icon: '🌱', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'requirements',  label: 'Requirements',      icon: '📋', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'sprints',       label: 'Sprints',           icon: '🏃', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'meetings',      label: 'Meetings',           icon: '📅', section: 'PM Work',     roles: ['PM','TL'] },
  { id: 'profile',       label: 'My Profile',        icon: '👤', section: 'Personal',    roles: ['PM','TL'] },
];

export default function Sidebar({ currentPage, onNavigate, badges = {} }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const effectiveRole =
    user.role === 'Scrum Master' ? 'SM' :
    user.role === 'PM Team Lead' ? 'TL' :
    user.role === 'Product Manager' ? 'PM' :
    user.perfiq;
  const visibleMenus = ALL_MENUS.filter(m => m.roles.includes(effectiveRole));
  let lastSection = '';

  return (
    <aside style={{
      width: 'var(--sidebar-w)', background: 'var(--sidebar-bg)', color: 'white',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100, overflowY: 'auto'
    }}>

      {/* ── Logo / Brand ─────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #1a56db, #0d9488)',
            borderRadius: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, fontSize: 14
          }}>EP</div>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
            ProjectHub
            <small style={{ display: 'block', fontSize: 10, fontWeight: 400, opacity: .5, letterSpacing: '.5px', textTransform: 'uppercase' }}>TN EMIS</small>
          </div>
        </div>
      </div>

      {/* ── User identity ────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          className="av-ring"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg,#1a56db,#0d9488)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0
          }}
        >
          {user.initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name.split(' ')[0]}</div>
          <div style={{ fontSize: 10, opacity: .5, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            {user.role === 'Scrum Master' ? 'SM · Product Manager' : user.role === 'Product Manager' ? 'Product Manager' : user.perfiq}
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {visibleMenus.map(m => {
          const section = m.section !== lastSection ? (lastSection = m.section, m.section) : null;
          return (
            <div key={m.id}>
              {section && <div className="nav-section-label">{section}</div>}
              <div
                className={`nav-item${currentPage === m.id ? ' active' : ''}`}
                onClick={() => onNavigate(m.id)}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{m.icon}</span>
                {m.label}
                {badges[m.id] > 0 && (
                  <span className="nav-badge">{badges[m.id]}</span>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 12.5, color: 'rgba(255,255,255,.5)', borderRadius: 8, transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.5)'; }}
        >
          🚪 Sign Out
        </div>
      </div>
    </aside>
  );
}
