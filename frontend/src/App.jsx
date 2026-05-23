import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
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
      case 'profile':       return <Profile />;
      default:              return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
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
