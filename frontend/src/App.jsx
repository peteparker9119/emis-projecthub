import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { getLatestScrumAlert, deactivateScrumAlert } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sprints from './pages/Sprints';
import Reports from './pages/Reports';
import Members from './pages/Members';
import Profile from './pages/Profile';
import TrackEmployees from './pages/TrackEmployees';
import MyTasks from './pages/MyTasks';
import SprintActivity from './pages/SprintActivity';
import Letters from './pages/Letters';
import AdminControls from './pages/AdminControls';
import Projects from './pages/Projects';
import ItemPage from './pages/ItemPage';
import Requirements from './pages/Requirements';
import Ideas from './pages/Ideas';
import MenuBuilder from './pages/MenuBuilder';
import GroomingHub from './pages/GroomingHub';
import ScrumMaster from './pages/ScrumMaster';
import PMDailyLog from './pages/PMDailyLog';
import PMActivity from './pages/PMActivity';
import Meetings from './pages/Meetings';
import KanbanBoard from './pages/KanbanBoard';
import Epics from './pages/Epics';
import Releases from './pages/Releases';

const ALERT_ICONS = { standup: '🏆', breach: '🚨', urgent: '🔴', info: '📢' };
const ALERT_COLORS = { standup: '#0d9488', breach: '#dc2626', urgent: '#7c3aed', info: '#1a56db' };

function ScrumAlertBanner() {
  const { user } = useAuth();
  const [alert, setAlert]         = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const lastSeenId = useRef(null);

  // SM pushes alerts — they don't receive their own popup
  const isSM = user?.role === 'Scrum Master';

  useEffect(() => {
    if (isSM) return; // SM only sends, never receives
    const check = async () => {
      try {
        const r = await getLatestScrumAlert();
        const incoming = r.data.alert;
        if (incoming && incoming.id !== lastSeenId.current) {
          lastSeenId.current = incoming.id;
          setDismissed(false);
          setAlert(incoming);
        }
        if (!incoming) setAlert(null);
      } catch {}
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [isSM]);

  if (isSM || !alert || dismissed) return null;

  const color = ALERT_COLORS[alert.alert_type] || '#1a56db';
  const icon  = ALERT_ICONS[alert.alert_type]  || '📢';
  const timeAgo = (dt) => {
    const diff = (Date.now() - new Date(dt)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    // backdrop: pointer-events none so page stays interactive
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ pointerEvents: 'auto', background: 'white', borderRadius: 18, padding: '20px 26px', boxShadow: '0 16px 60px rgba(0,0,0,.25)', border: `2px solid ${color}`, maxWidth: 440, width: '92vw', animation: 'saSlide .35s ease' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color }}>{alert.alert_type === 'standup' ? '🏆 Standup Time!' : alert.alert_type === 'breach' ? '🚨 Sprint Breach Alert' : alert.alert_type === 'urgent' ? '🔴 Urgent Alert' : '📢 SM Notification'}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{timeAgo(alert.created_at)}</span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, marginBottom: 6 }}>{alert.message}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>From <strong>{alert.created_by_name}</strong> (Scrum Master)</div>
          </div>
          <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text3)', padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setDismissed(true)} style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: color, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Got it</button>
        </div>
      </div>
      <style>{`@keyframes saSlide { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [taskTab, setTaskTab] = useState('list');

  // Loading spinner
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#1a56db,#0d9488)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 18 }}>EP</div>
      <div style={{ fontSize: 15, color: 'var(--text2)', fontWeight: 600 }}>Starting ProjectHub…</div>
    </div>
  );

  // Not logged in — show role-selector login
  if (!user) return <Login />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <Dashboard onNavigate={setPage} />;
      case 'projects':      return <Projects />;
      case 'sprints':       return <Sprints />;
      case 'tasks':         return <ItemPage type="tasks" tab={taskTab} onTabChange={setTaskTab} />;
      case 'requirements':  return <Requirements />;
      case 'bugs':          return <ItemPage type="bugs" />;
      case 'ideas':         return <Ideas />;
      case 'mytasks':       return <MyTasks />;
      case 'reports':       return <Reports />;
      case 'members':       return <Members />;
      case 'track':         return <TrackEmployees />;
      case 'sprintactivity':return <SprintActivity />;
      case 'letters':       return <Letters />;
      case 'menubuilder':   return <MenuBuilder />;
      case 'admin':         return <AdminControls />;
      case 'groomhub':      return <GroomingHub />;
      case 'scrummaster':   return <ScrumMaster />;
      case 'pmdailylog':    return <PMDailyLog />;
      case 'pmactivity':    return <PMActivity />;
      case 'meetings':      return <Meetings />;
      case 'kanban':        return <KanbanBoard />;
      case 'epics':         return <Epics />;
      case 'releases':      return <Releases />;
      case 'profile':       return <Profile />;
      default:              return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <ScrumAlertBanner />
      <Sidebar currentPage={page} onNavigate={setPage} />
      <main style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Topbar currentPage={page} onNavigate={setPage} />
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
