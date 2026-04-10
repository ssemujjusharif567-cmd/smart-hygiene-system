import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import DeviceDetails from './pages/DeviceDetails';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import { API_BASE } from './api';
import './App.css';

function getCSRFToken() {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function App() {
  const [theme, setTheme]         = useState('default');
  const [alertCount, setAlertCount] = useState(0);
  const [user, setUser]           = useState(undefined); // undefined = checking, null = guest

  /* ── Restore session ── */
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      fetch(`${API_BASE}/api/accounts/me/`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) setUser(data);
          else { localStorage.removeItem('user'); setUser(null); }
        })
        .catch(() => { localStorage.removeItem('user'); setUser(null); });
    } else {
      setUser(null);
    }
  }, []);

  /* ── Alert count ── */
  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/api/dashboard/alerts/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAlertCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, [user]);

  /* ── Theme ── */
  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/api/theme/`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.theme) setTheme(data.theme); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    document.body.classList.remove('theme-default', 'theme-black');
    document.body.classList.add(`theme-${theme}`);
    if (!user) return;
    fetch(`${API_BASE}/api/theme/`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken(),
      },
      credentials: 'include',
      body: JSON.stringify({ theme }),
    }).catch(() => {});
  }, [theme]);

  const handleAuth = (userData) => setUser(userData);

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/accounts/logout/`, { 
      method: 'POST',
      headers: { 'X-CSRFToken': getCSRFToken() },
      credentials: 'include',
    }).catch(() => {});
    localStorage.removeItem('user');
    setUser(null);
  };

  /* Still checking session */
  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100svh', background: 'var(--bg)', color: 'var(--text)' }}>
        Loading…
      </div>
    );
  }

  /* Not logged in → show Auth page */
  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  /* Logged in → full app */
  return (
    <BrowserRouter>
      <Navbar theme={theme} setTheme={setTheme} alertCount={alertCount} user={user} onLogout={handleLogout} />
      <div className="app-shell">
        <Sidebar theme={theme} setTheme={setTheme} alertCount={alertCount} user={user} onLogout={handleLogout} />
        <main className="app-main">
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/devices"    element={<Devices />} />
            <Route path="/device/:id" element={<DeviceDetails />} />
            <Route path="/alerts"     element={<Alerts />} />
            <Route path="/analytics"  element={<Analytics />} />
            <Route path="/settings"   element={<Settings />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
