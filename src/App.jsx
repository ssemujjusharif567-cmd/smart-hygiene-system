import { useEffect, useState, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import './App.scss';

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
  const [theme, setTheme]           = useState('default');
  const [alertCount, setAlertCount]   = useState(0);
  // If we already have a stored user, consider auth checked immediately — no blink
  const [authChecked, setAuthChecked] = useState(() => !!localStorage.getItem('user'));
  const [user, setUser] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!stored) return null;
    try { return JSON.parse(stored); }
    catch { localStorage.removeItem('user'); return null; }
  });

  /* ── Restore session and confirm role from the backend ── */
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const storedUser = stored ? (() => { try { return JSON.parse(stored); } catch { return null; } })() : null;

    if (!storedUser) {
      // No stored user — nothing to restore
      setAuthChecked(true);
      return;
    }

    // Fetch fresh flags from DB using the stored username
    fetch(`${API_BASE}/api/accounts/me/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: storedUser.username }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.id) {
          // Only update if flags actually changed to avoid overwriting a fresh login
          const changed =
            data.is_superuser !== storedUser.is_superuser ||
            data.is_staff     !== storedUser.is_staff;
          if (changed) {
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
          }
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  /* ── Alert count ── */
  const fetchAlertCount = () => {
    fetch(`${API_BASE}/api/alerts/counts/`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setAlertCount((data.High || 0) + (data.Medium || 0) + (data.Low || 0)))
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    fetchAlertCount();
    const id = setInterval(fetchAlertCount, 15000);
    return () => clearInterval(id);
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
  }, [theme, user]);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIosInstallTip, setShowIosInstallTip] = useState(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isSmallDevice = window.matchMedia('(max-width: 900px)').matches;
    return !isInstalled && isIos && isSafari && isSmallDevice;
  });
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [lastNotifiedAt, setLastNotifiedAt] = useState(null);
  const prevAlertCount = useRef(alertCount);
  const [notificationPermission, setNotificationPermission] = useState(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setNotificationMessage('Back online — live updates restored.');
      setLastNotifiedAt(new Date().toISOString());
      setTimeout(() => setNotificationMessage(''), 7000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setNotificationMessage('You are offline, connect to get live updates.');
      setLastNotifiedAt(new Date().toISOString());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (prevAlertCount.current !== alertCount && alertCount > prevAlertCount.current) {
      const message = `You have ${alertCount} active alerts.`;
      const scheduleNotificationUpdate = () => {
        setNotificationMessage(message);
        setLastNotifiedAt(new Date().toISOString());
        if (notificationPermission === 'granted') {
          try {
            new Notification('Smart Hygiene Alert', { body: message, icon: './icon-rounded.svg' });
          } catch (error) {
            console.error('Notification failed', error);
          }
        }
        setTimeout(() => setNotificationMessage(''), 8000);
      };

      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(scheduleNotificationUpdate);
      } else {
        scheduleNotificationUpdate();
      }
    }
    prevAlertCount.current = alertCount;
  }, [alertCount, notificationPermission]);

  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    const beforeInstallHandler = (e) => {
      if (isInstalled) return;
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setInstallPrompt(null);
      setShowIosInstallTip(false);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallHandler);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
    return choice;
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    setShowIosInstallTip(false);
  };

  const handleAuth = (userData) => {
    // userData comes directly from the login response which has correct is_superuser/is_staff
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/accounts/logout/`, { 
      method: 'POST',
      headers: { 'X-CSRFToken': getCSRFToken() },
      credentials: 'include',
    }).catch(() => {});
    localStorage.removeItem('user');
    setUser(null);
  };

  useEffect(() => {
    document.body.classList.toggle('auth-body', !user);
    document.body.classList.toggle('app-body', !!user);
  }, [user]);

  const isAuth = !user;

  return (
    <HashRouter>
      {(showInstallBanner || showIosInstallTip) && (
        <div className="pwa-install-banner">
          <div className="pwa-install-copy">
            <strong>Install the app</strong>
            <p>
              {installPrompt
                ? 'Tap install for faster access on mobile devices.'
                : 'Open Safari share menu and choose “Add to Home Screen.”'}
            </p>
          </div>
          {installPrompt ? (
            <button className="pwa-install-button" onClick={handleInstallClick}>Install</button>
          ) : (
            <button className="pwa-install-button" onClick={dismissInstallBanner}>Got it</button>
          )}
          <button className="pwa-install-close" onClick={dismissInstallBanner} aria-label="Close install prompt">×</button>
        </div>
      )}
      {(isOffline || notificationMessage) && (
        <div className={`app-status-bar ${isOffline ? 'offline' : 'online'}`}>
          <div>
            {isOffline
              ? 'You are offline, connect to get live updates.'
              : notificationMessage || `You have ${alertCount} active alerts.`}
          </div>
          <div className="app-status-meta">
            <span className="app-status-badge">Alerts {alertCount}</span>
            {lastNotifiedAt && <span className="app-status-time">{new Date(lastNotifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        </div>
      )}
      <Routes>
        {/* Auth route — always accessible */}
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <Auth onAuth={handleAuth} />
        } />

        {/* App routes — protected, require login */}
        <Route path="/*" element={
          !authChecked ? <div style={{ visibility: 'hidden' }} /> : user ? (
            <>
              <Navbar theme={theme} setTheme={setTheme} alertCount={alertCount} user={user} onLogout={handleLogout} />
              <div className="app-shell" style={{ paddingTop: (isOffline || notificationMessage) ? '56px' : 0 }}>
                <Sidebar theme={theme} setTheme={setTheme} alertCount={alertCount} user={user} onLogout={handleLogout} />
                <main className="app-main">
                  <Routes>
                    <Route path="/"           element={<Dashboard />} />
                    <Route path="/devices"    element={<Devices />} />
                    <Route path="/device/:id" element={<DeviceDetails />} />
                    <Route path="/alerts"     element={<Alerts setAlertCount={setAlertCount} />} />
                    <Route path="/analytics"  element={<Analytics />} />
                    <Route path="/settings"   element={<Settings user={user} />} />
                    <Route path="*"           element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </>
          ) : <Navigate to="/login" replace />
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;
