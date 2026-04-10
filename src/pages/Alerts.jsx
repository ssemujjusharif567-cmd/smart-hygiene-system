import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation, faCircleExclamation, faCircleInfo,
  faServer, faDroplet, faPumpSoap, faTemperatureHalf,
  faBatteryQuarter, faVolumeXmark, faClock, faCheckCircle,
  faFilter, faBell,
} from '@fortawesome/free-solid-svg-icons';

const SEVERITY_META = {
  High:   { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: faTriangleExclamation  },
  Medium: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: faCircleExclamation    },
  Low:    { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: faCircleInfo           },
};

const FILTERS = ['All', 'High', 'Medium', 'Low', 'Resolved'];

const getAlertStatStyles = (color, isDark) => {
  if (isDark) {
    return {
      background: `${color}15`,
      borderColor: `${color}40`,
    };
  }
  return {
    background: `${color}08`,
    borderColor: `${color}40`,
  };
};

const getIconForAlertType = (title) => {
  if (title.includes('Water')) return faDroplet;
  if (title.includes('Soap')) return faPumpSoap;
  if (title.includes('Temperature')) return faTemperatureHalf;
  if (title.includes('Battery')) return faBatteryQuarter;
  if (title.includes('Speaker') || title.includes('Audio')) return faVolumeXmark;
  if (title.includes('Offline') || title.includes('Device')) return faServer;
  return faBell;
};

const Alerts = () => {
  const [filter, setFilter] = useState('All');
  const [dismissed, setDismissed] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({ High: 0, Medium: 0, Low: 0 });
  const [loading, setLoading] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(document.body.classList.contains('theme-black'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkTheme(document.body.classList.contains('theme-black'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/alerts/?format=json');
        if (res.ok) {
          const data = await res.json();
          const alertArray = Array.isArray(data) ? data : data.results || [];
          setAlerts(alertArray.map(a => ({ 
            ...a, 
            icon: getIconForAlertType(a.title)
          })));
        }
      } catch (error) {
        console.error('Alerts fetch error', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  useEffect(() => {
    const activeAlerts = alerts.filter(a => a.status === 'active' && !dismissed.includes(a.id));
    setCounts({
      High:   activeAlerts.filter(a => a.severity === 'High').length,
      Medium: activeAlerts.filter(a => a.severity === 'Medium').length,
      Low:    activeAlerts.filter(a => a.severity === 'Low').length,
    });
  }, [alerts, dismissed]);

  const visible = alerts.filter(a => {
    if (dismissed.includes(a.id)) return false;
    if (filter === 'All')      return a.status === 'active';
    if (filter === 'Resolved') return a.status === 'resolved';
    return a.severity === filter && a.status === 'active';
  });

  if (loading) {
    return <div className="al-page">Loading Alerts...</div>;
  }

  return (
    <div className="al-page">

      {/* Banner */}
      <div className="al-banner">
        <div className="al-banner-left">
          <div className="al-banner-icon">
            <FontAwesomeIcon icon={faBell} />
          </div>
          <div>
            <h2 className="al-banner-title">Alerts</h2>
            <p className="al-banner-sub">Monitor and manage all system notifications</p>
          </div>
        </div>
        <div className="al-banner-stats">
          {Object.entries(counts).map(([sev, count]) => {
            const m = SEVERITY_META[sev];
            const styles = getAlertStatStyles(m.color, isDarkTheme);
            return (
              <div key={sev} className="al-stat" style={{ borderColor: styles.borderColor, background: styles.background }}>
                <span className="al-stat-num" style={{ color: m.color }}>{count}</span>
                <span className="al-stat-label" style={{ color: m.color }}>{sev}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter bar */}
      <div className="al-filter-bar">
        <FontAwesomeIcon icon={faFilter} className="al-filter-icon" />
        {FILTERS.map(f => (
          <button
            key={f}
            className={`al-filter-btn ${filter === f ? 'al-filter-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
            {f !== 'All' && f !== 'Resolved' && counts[f] > 0 && (
              <span className="al-filter-count" style={{ background: SEVERITY_META[f].color }}>{counts[f]}</span>
            )}
          </button>
        ))}
        <span className="al-filter-result">{visible.length} alert{visible.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Alert list */}
      {visible.length === 0 ? (
        <div className="al-empty">
          <FontAwesomeIcon icon={faCheckCircle} className="al-empty-icon" />
          <p>No alerts in this category</p>
        </div>
      ) : (
        <div className="al-list">
          {visible.map(alert => {
            const m = SEVERITY_META[alert.severity];
            return (
              <div
                key={alert.id}
                className={`al-card ${alert.status === 'resolved' ? 'al-card-resolved' : ''}`}
                style={{ '--sev-color': m.color, '--sev-bg': m.bg, '--sev-border': m.border }}
              >
                {/* Left accent bar */}
                <div className="al-card-bar" style={{ background: m.color }} />

                {/* Icon */}
                <div className="al-card-icon" style={{ background: m.bg, color: m.color }}>
                  <FontAwesomeIcon icon={alert.icon} />
                </div>

                {/* Body */}
                <div className="al-card-body">
                  <div className="al-card-top">
                    <span className="al-card-title">{alert.title}</span>
                    <div className="al-card-badges">
                      <span className="al-badge" style={{ background: m.bg, color: m.color, borderColor: m.border }}>
                        <FontAwesomeIcon icon={m.icon} />
                        {alert.severity}
                      </span>
                      {alert.status === 'resolved' && (
                        <span className="al-badge al-badge-resolved">
                          <FontAwesomeIcon icon={faCheckCircle} />
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="al-card-message">{alert.message}</p>
                  <div className="al-card-meta">
                    <span><FontAwesomeIcon icon={faServer} /> {alert.device}</span>
                    <span className="al-meta-dot" />
                    <span>{alert.location}</span>
                    <span className="al-meta-dot" />
                    <span><FontAwesomeIcon icon={faClock} /> {new Date(alert.time).toLocaleDateString()} · {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Dismiss */}
                {alert.status === 'active' && (
                  <button className="al-dismiss" onClick={() => setDismissed(d => [...d, alert.id])} title="Dismiss">
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Alerts;
