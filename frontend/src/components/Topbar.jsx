import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from '../api';

const PAGE_TITLES = {
  dashboard:     'Dashboard',
  projects:      'Projects',
  sprints:       'Sprints',
  tasks:         'Tasks',
  requirements:  'Requirements',
  bugs:          'Bugs',
  ideas:         'Ideas',
  mytasks:       'My Tasks',
  profile:       'My Profile',
  reports:       'Reports',
  members:       'Team Members',
  track:         'Track Employees',
  sprintactivity:'Sprint Activity',
  letters:       'Letter Management',
  menubuilder:   'Menu Builder',
  admin:         'Admin Controls',
  groomhub:      'Grooming Hub',
  scrummaster:   'Scrum Master Dashboard',
  pmdailylog:    'My Work Log',
  pmactivity:    'PM Activity',
};

const ROLE_BADGE = {
  CTO:      { label: '⭐ CTO',          style: { background: 'linear-gradient(135deg,#1a56db,#0d9488)', color: 'white' } },
  MANAGER:  { label: '🗂 Manager',      style: { background: 'var(--teal-light)', color: 'var(--teal)' } },
  EMPLOYEE: { label: '👤 Employee',     style: { background: 'var(--surface2)',   color: 'var(--text2)' } },
  TL:       { label: '👔 Team Lead',    style: { background: '#fef3c7', color: '#b45309' } },
  SM:       { label: '🏆 Scrum Master',     style: { background: '#d1fae5', color: '#065f46' } },
  PM:       { label: '📋 Product Manager', style: { background: '#ede9fe', color: '#6d28d9' } },
};

// ── Notification Bell ────────────────────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen]     = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [count, setCount]   = useState(0);
  const ref = useRef(null);

  const loadCount = async () => {
    try { const r = await getUnreadCount(); setCount(r.data.count); } catch {}
  };

  const loadNotifs = async () => {
    try { const r = await getNotifications(); setNotifs(r.data); } catch {}
  };

  useEffect(() => {
    loadCount();
    const id = setInterval(loadCount, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadNotifs();
    // close on outside click
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleRead = async (n) => {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setNotifs(p => p.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      setCount(c => Math.max(0, c - 1));
    }
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    setNotifs(p => p.map(x => ({ ...x, is_read: true })));
    setCount(0);
  };

  const TYPE_ICON = { requirement: '📋', task: '✅', bug: '🐛', sprint: '🏃', general: '📢' };
  const timeAgo = (dt) => {
    const diff = (Date.now() - new Date(dt)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{ position: 'relative', background: open ? 'var(--accent-light)' : 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17, transition: 'all .15s' }}
        title="Notifications"
      >
        🔔
        {count > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#dc2626', color: 'white', borderRadius: '50%', width: 17, height: 17, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 44, right: 0, width: 360, background: 'white', borderRadius: 14, boxShadow: '0 12px 48px rgba(0,0,0,.16)', border: '1px solid var(--border)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications {count > 0 && <span style={{ background: '#dc2626', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{count}</span>}</span>
            {count > 0 && <button onClick={handleReadAll} style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>}
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>🔕 No notifications</div>
            ) : notifs.map(n => (
              <div
                key={n.id}
                onClick={() => handleRead(n)}
                style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: n.is_read ? 'white' : '#eff6ff', transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'white' : '#eff6ff'}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICON[n.item_type] || '📢'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: n.is_read ? 500 : 700, color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 4, display: 'flex', gap: 8 }}>
                      <span>From {n.sender_name}</span>
                      <span>·</span>
                      <span>{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                  {!n.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1a56db', flexShrink: 0, marginTop: 4 }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Topbar({ currentPage, onNavigate }) {
  const { user, logout } = useAuth();
  const effectiveRoleKey =
    user?.role === 'Scrum Master'    ? 'SM' :
    user?.role === 'PM Team Lead'    ? 'TL' :
    user?.role === 'Product Manager' ? 'PM' :
    user?.perfiq;
  const rb = ROLE_BADGE[effectiveRoleKey] || ROLE_BADGE.EMPLOYEE;

  return (
    <div style={{
      background: 'white', borderBottom: '1px solid var(--border)',
      padding: '0 28px', height: 58, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, gap: 16
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Fraunces, serif' }}>
        {PAGE_TITLES[currentPage] || 'Dashboard'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Role badge */}
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '.3px', ...rb.style }}>
          {rb.label}
        </span>

        {/* Notification bell */}
        <NotificationBell />

        {/* Avatar + name → navigate to profile */}
        <button
          onClick={() => onNavigate('profile')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 20, padding: '5px 12px 5px 5px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text)', transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {user?.initials || '?'}
          </div>
          {user?.name?.split(' ')[0]}
        </button>

        {/* Sign out */}
        <button
          onClick={logout}
          style={{ background: 'var(--red-light)', color: 'var(--red)', border: '1px solid #fca5a5', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-light)'; e.currentTarget.style.color = 'var(--red)'; }}
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}
