import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation, faCircleExclamation, faCircleInfo,
  faServer, faDroplet, faPumpSoap, faTemperatureHalf,
  faBatteryQuarter, faVolumeXmark, faClock, faCircleCheck,
  faFilter, faBell, faCheckDouble, faEye, faTrash,
} from '@fortawesome/free-solid-svg-icons';

const SEVERITY_META = {
  High:   { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: faTriangleExclamation },
  Medium: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: faCircleExclamation   },
  Low:    { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: faCircleInfo          },
};

const FILTERS = ['All', 'High', 'Medium', 'Low', 'Resolved'];
const REFRESH_INTERVAL = 15000;

const getIconForAlertType = (title) => {
  if (title.includes('Water'))    return faDroplet;
  if (title.includes('Soap'))     return faPumpSoap;
  if (title.includes('Temp'))     return faTemperatureHalf;
  if (title.includes('Battery'))  return faBatteryQuarter;
  if (title.includes('Speaker') || title.includes('Audio')) return faVolumeXmark;
  if (title.includes('Offline') || title.includes('Device')) return faServer;
  return faBell;
};

const Alerts = ({ setAlertCount }) => {
  const [filter,      setFilter]      = useState('All');
  const [alerts,      setAlerts]      = useState([]);
  const [counts,      setCounts]      = useState({ High: 0, Medium: 0, Low: 0 });
  const [loading,     setLoading]     = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(document.body.classList.contains('theme-black'));
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [longPressTimer, setLongPressTimer] = useState(null);

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDarkTheme(document.body.classList.contains('theme-black'))
    );
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const url = API_BASE + '/api/alerts/' + (filter === 'Resolved' ? '?status=resolved&format=json' : '?format=json');
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const arr  = Array.isArray(data) ? data : (data.results || []);
        setAlerts(arr.map(a => ({ ...a, icon: getIconForAlertType(a.title) })));
      }
    } catch (e) {
      console.error('Alerts fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  useEffect(() => {
    const active = alerts.filter(a => a.status === 'active');
    setCounts({
      High:   active.filter(a => a.severity === 'High').length,
      Medium: active.filter(a => a.severity === 'Medium').length,
      Low:    active.filter(a => a.severity === 'Low').length,
    });
    if (setAlertCount && filter !== 'Resolved') setAlertCount(active.length);
  }, [alerts, setAlertCount, filter]);

  const markRead = async (id) => {
    try {
      await fetch(API_BASE + '/api/alerts/' + id + '/read/', { method: 'PATCH' });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
    } catch (e) {
      console.error('Mark read error', e);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(API_BASE + '/api/alerts/read-all/', { method: 'PATCH' });
      setAlerts(prev => prev.map(a => ({ ...a, status: 'resolved' })));
    } catch (e) {
      console.error('Mark all read error', e);
    }
  };

  const clearAll = async () => {
    try {
      await fetch(API_BASE + '/api/alerts/clear-all/', { method: 'DELETE' });
      setAlerts([]);
    } catch (e) {
      console.error('Clear all error', e);
    }
  };

  const deleteAlert = async (id) => {
    try {
      await fetch(API_BASE + '/api/alerts/' + id + '/', { method: 'DELETE' });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error('Delete alert error', e);
    }
  };

  const deleteSelectedAlerts = async () => {
    const ids = Array.from(selectedAlerts);
    try {
      await Promise.all(ids.map(id => fetch(API_BASE + '/api/alerts/' + id + '/', { method: 'DELETE' })));
      setAlerts(prev => prev.filter(a => !selectedAlerts.has(a.id)));
      setSelectedAlerts(new Set());
      setSelectionMode(false);
    } catch (e) {
      console.error('Delete selected alerts error', e);
    }
  };

  const toggleAlertSelection = (id) => {
    setSelectedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    setSelectedAlerts(new Set(visible.map(a => a.id)));
  };

  const clearSelection = () => {
    setSelectedAlerts(new Set());
  };

  const handleLongPressStart = (id) => {
    const timer = setTimeout(() => {
      if (!selectionMode) setSelectionMode(true);
      toggleAlertSelection(id);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const visible = alerts.filter(a => {
    if (filter === 'All')      return a.status === 'active';
    if (filter === 'Resolved') return a.status === 'resolved';
    return a.severity === filter && a.status === 'active';
  });

  const activeCount = alerts.filter(a => a.status === 'active').length;

  const statBg = (color) => isDarkTheme
    ? { background: color + '15', borderColor: color + '40' }
    : { background: color + '08', borderColor: color + '40' };

  if (loading) return <div className="al-page">Loading Alerts…</div>;

  return (
    <div className="al-page">

      {/* Banner */}
      <div className="al-banner">
        <div className="al-banner-left">
          <div className="al-banner-icon"><FontAwesomeIcon icon={faBell} /></div>
          <div>
            <h2 className="al-banner-title">Alerts</h2>
            <p className="al-banner-sub">Monitor and manage all system notifications</p>
          </div>
        </div>
        <div className="al-banner-stats">
          {Object.entries(counts).map(([sev, count]) => {
            const m = SEVERITY_META[sev];
            return (
              <div key={sev} className="al-stat" style={statBg(m.color)}>
                <span className="al-stat-num"   style={{ color: m.color }}>{count}</span>
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
            className={'al-filter-btn' + (filter === f ? ' al-filter-active' : '')}
            onClick={() => setFilter(f)}
          >
            {f}
            {f !== 'All' && f !== 'Resolved' && counts[f] > 0 && (
              <span className="al-filter-count" style={{ background: SEVERITY_META[f].color }}>{counts[f]}</span>
            )}
          </button>
        ))}
        <span className="al-filter-result">{visible.length} alert{visible.length !== 1 ? 's' : ''}</span>
        {selectionMode ? (
          <div className="al-selection-controls">
            <button className="al-select-all-btn" onClick={selectAllVisible}>
              Select All ({visible.length})
            </button>
            <button className="al-clear-selection-btn" onClick={clearSelection}>
              Clear ({selectedAlerts.size})
            </button>
            <button 
              className="al-delete-selected-btn" 
              onClick={deleteSelectedAlerts}
              disabled={selectedAlerts.size === 0}
            >
              Delete Selected ({selectedAlerts.size})
            </button>
            <button className="al-cancel-selection-btn" onClick={() => { setSelectionMode(false); setSelectedAlerts(new Set()); }}>
              Cancel
            </button>
          </div>
        ) : (
          <>
            {activeCount > 0 && (
              <button className="al-mark-all-btn" onClick={markAllRead} title="Mark all as read">
                <FontAwesomeIcon icon={faCheckDouble} /> Mark all read
              </button>
            )}
            {alerts.length > 0 && (
              <button className="al-clear-all-btn" onClick={clearAll} title="Clear all alerts">
                <FontAwesomeIcon icon={faTrash} /> Clear all
              </button>
            )}
            {visible.length > 0 && (
              <button className="al-select-btn" onClick={() => setSelectionMode(true)}>
                Select
              </button>
            )}
          </>
        )}
      </div>

      {/* Alert list */}
      {visible.length === 0 ? (
        <div className="al-empty">
          <FontAwesomeIcon icon={faCircleCheck} className="al-empty-icon" />
          <p>{filter === 'Resolved' ? 'No resolved alerts' : 'No active alerts — all clear!'}</p>
        </div>
      ) : (
        <div className="al-list">
          {visible.map(alert => {
            const m = SEVERITY_META[alert.severity] || SEVERITY_META.Low;
            const isSelected = selectedAlerts.has(alert.id);
            return (
              <div 
                key={alert.id} 
                className={'al-card' + (alert.status === 'resolved' ? ' al-card-resolved' : '') + (selectionMode && isSelected ? ' al-card-selected' : '')}
                onTouchStart={() => !selectionMode && handleLongPressStart(alert.id)}
                onTouchEnd={handleLongPressEnd}
                onMouseDown={() => !selectionMode && handleLongPressStart(alert.id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
              >
                {selectionMode && (
                  <div className="al-card-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAlertSelection(alert.id)}
                    />
                  </div>
                )}
                <div className="al-card-bar" style={{ background: m.color }} />
                <div className="al-card-icon" style={{ background: m.bg, color: m.color }}>
                  <FontAwesomeIcon icon={alert.icon} />
                </div>
                <div className="al-card-body">
                  <div className="al-card-top">
                    <span className="al-card-title">{alert.title}</span>
                    <div className="al-card-badges">
                      <span className="al-badge" style={{ background: m.bg, color: m.color, borderColor: m.border }}>
                        <FontAwesomeIcon icon={m.icon} /> {alert.severity}
                      </span>
                      {alert.status === 'resolved' && (
                        <span className="al-badge al-badge-resolved">
                          <FontAwesomeIcon icon={faCircleCheck} /> Resolved
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="al-card-message">{alert.message}</p>
                  <div className="al-card-meta">
                    <span><FontAwesomeIcon icon={faServer} /> {alert.device}</span>
                    {alert.location && <><span className="al-meta-dot" /><span>{alert.location}</span></>}
                    <span className="al-meta-dot" />
                    <span>
                      <FontAwesomeIcon icon={faClock} />{' '}
                      {new Date(alert.time).toLocaleDateString()} · {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                {!selectionMode && (
                  <div className="al-card-actions">
                    {alert.status === 'active' && (
                      <button className="al-read-btn" onClick={() => markRead(alert.id)} title="Mark as read">
                        <FontAwesomeIcon icon={faEye} />
                        <span>Read</span>
                      </button>
                    )}
                    <button className="al-delete-btn" onClick={() => deleteAlert(alert.id)} title="Delete alert">
                      <FontAwesomeIcon icon={faTrash} />
                      <span>Delete</span>
                    </button>
                  </div>
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
