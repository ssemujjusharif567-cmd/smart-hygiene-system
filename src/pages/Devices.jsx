import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { API_BASE } from '../api';
import {
  faServer, faLocationDot, faClock, faBatteryFull,
  faBatteryThreeQuarters, faBatteryHalf, faBatteryQuarter,
  faMagnifyingGlass, faArrowRight, faCircle,
  faPumpSoap, faDroplet, faTemperatureHalf, faHandsWash,
  faVolumeHigh, faLightbulb, faBolt, faEye, faWater,
  faToggleOn, faDisplay, faMusic,
} from '@fortawesome/free-solid-svg-icons';

const ICON_MAP = {
  faPumpSoap, faDroplet, faTemperatureHalf, faHandsWash,
  faVolumeHigh, faLightbulb, faBolt, faServer,
  faEye, faWater, faToggleOn, faDisplay, faMusic,
};

const API = `${API_BASE}/api/devices`;

const batteryMeta = (b) => {
  if (b === null || b === undefined) return null;
  if (b >= 75) return { icon: faBatteryFull,          color: '#10b981', label: 'Good'     };
  if (b >= 50) return { icon: faBatteryThreeQuarters,  color: '#10b981', label: 'Good'     };
  if (b >= 25) return { icon: faBatteryHalf,           color: '#f59e0b', label: 'Low'      };
  return              { icon: faBatteryQuarter,         color: '#ef4444', label: 'Critical' };
};

const BatteryRing = ({ pct, color }) => {
  const r = 18, c = 22, stroke = 3;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={c * 2} height={c * 2} className="dv-ring">
      <circle cx={c} cy={c} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`} />
      <text x={c} y={c + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
};

const isColorDark = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};

const getStatStyles = (color, isDark) => {
  if (isDark) {
    return {
      background: `${color}15`,
      borderColor: `${color}40`,
      textColor: color,
    };
  }
  return {
    background: `${color}08`,
    borderColor: `${color}40`,
    textColor: color,
  };
};

const Devices = () => {
  const navigate = useNavigate();
  const [devices,      setDevices]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [systemOnline, setSystemOnline] = useState(true);
  const [isOnlineNet,  setIsOnlineNet]  = useState(navigator.onLine);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isDarkTheme,  setIsDarkTheme]  = useState(document.body.classList.contains('theme-black'));

  useEffect(() => {
    const handleOnline  = () => setIsOnlineNet(true);
    const handleOffline = () => setIsOnlineNet(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkTheme(document.body.classList.contains('theme-black'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchData = async () => {
    try {
      const [devicesRes, settingsRes] = await Promise.all([
        fetch(`${API}/`),
        fetch(`${API_BASE}/api/settings/`),
      ]);

      const deviceData = devicesRes.ok ? await devicesRes.json() : [];
      const settings  = settingsRes.ok ? await settingsRes.json() : { system_online: true };

      setSystemOnline(settings.system_online ?? true);
      if (settings.system_online === false) {
        setDevices(deviceData.map(d => ({ ...d, status: 'Offline' })));
      } else {
        setDevices(deviceData);
      }
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    const onSystemOnlineChange = (event) => {
      const online = event.detail;
      setSystemOnline(online);
      if (!online) {
        setDevices(prev => prev.map(d => ({ ...d, status: 'Offline' })));
      } else {
        fetchData();
      }
    };
    window.addEventListener('systemOnlineChange', onSystemOnlineChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('systemOnlineChange', onSystemOnlineChange);
    };
  }, []);

  const displayDevices = devices.map(d => ({
    ...d,
    effectiveStatus: (d.wifi === true && !isOnlineNet) ? 'Offline' : d.status,
  }));
  const online  = displayDevices.filter(d => d.effectiveStatus === 'Online').length;
  const offline = displayDevices.filter(d => d.effectiveStatus === 'Offline').length;

  const filtered = displayDevices.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || d.effectiveStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="dv-page">

      {/* Banner */}
      <div className="dv-banner">
        <div className="dv-banner-left">
          <div className="dv-banner-icon"><FontAwesomeIcon icon={faServer} /></div>
          <div>
            <h2 className="dv-banner-title">Devices</h2>
            <p className="dv-banner-sub">Monitor and manage all connected IoT hardware</p>
          </div>
        </div>
        <div className="dv-banner-stats">
          <div className="dv-stat" style={{ background: getStatStyles('#10b981', isDarkTheme).background, borderColor: getStatStyles('#10b981', isDarkTheme).borderColor }}>
            <span className="dv-stat-num" style={{ color: '#10b981' }}>{online}</span>
            <span className="dv-stat-label" style={{ color: '#10b981' }}>Online</span>
          </div>
          <div className="dv-stat" style={{ background: getStatStyles('#ef4444', isDarkTheme).background, borderColor: getStatStyles('#ef4444', isDarkTheme).borderColor }}>
            <span className="dv-stat-num" style={{ color: '#ef4444' }}>{offline}</span>
            <span className="dv-stat-label" style={{ color: '#ef4444' }}>Offline</span>
          </div>
          <div className="dv-stat" style={{ background: getStatStyles('#64748b', isDarkTheme).background, borderColor: getStatStyles('#64748b', isDarkTheme).borderColor }}>
            <span className="dv-stat-num" style={{ color: '#64748b' }}>{devices.length}</span>
            <span className="dv-stat-label" style={{ color: '#64748b' }}>Total</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="dv-toolbar">
        <div className="dv-search-wrap">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="dv-search-icon" />
          <input type="text" placeholder="Search devices…" value={search}
            onChange={e => setSearch(e.target.value)} className="dv-search" />
        </div>
        <div className="dv-filters">
          {['All', 'Online', 'Offline'].map(f => (
            <button key={f}
              className={`dv-filter-btn ${statusFilter === f ? 'dv-filter-active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f !== 'All' && (
                <FontAwesomeIcon icon={faCircle} style={{ color: f === 'Online' ? '#10b981' : '#ef4444', fontSize: '0.5em' }} />
              )}
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="dv-empty"><p style={{ color: '#94a3b8' }}>Loading devices…</p></div>
      ) : !systemOnline ? (
        <div className="dv-empty">
          <FontAwesomeIcon icon={faServer} className="dv-empty-icon" />
          <p>System is offline — all devices are offline.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="dv-empty">
          <FontAwesomeIcon icon={faServer} className="dv-empty-icon" />
          <p>No devices match your search</p>
        </div>
      ) : (
        <div className="dv-grid">
          {filtered.map(device => {
            const icon = ICON_MAP[device.icon] ?? faServer;
            const bat  = batteryMeta(device.battery);
            const isOnline = device.effectiveStatus === 'Online';
            return (
              <div key={device.id} className={`dv-card ${!isOnline ? 'dv-card-offline' : ''}`}
                onClick={() => navigate(`/device/${device.id}`)}>

                <div className="dv-card-header" style={{ background: `linear-gradient(135deg, ${device.color}22 0%, ${device.color}08 100%)`, borderBottom: `1px solid ${device.color}20` }}>
                  <div className="dv-card-icon-wrap" style={{ background: device.color }}>
                    <FontAwesomeIcon icon={icon} />
                  </div>
                  <span className={`dv-status-pill ${isOnline ? 'dv-pill-on' : 'dv-pill-off'}`}>
                    <span className={`dv-pulse-dot ${isOnline ? 'pulse-on' : 'pulse-off'}`} />
                    {device.effectiveStatus}
                  </span>
                </div>

                <div className="dv-card-body">
                  <h3 className="dv-card-name" style={{ color: isColorDark(device.color) ? '#fff' : undefined }}>{device.name}</h3>
                  <div className="dv-card-meta-row" style={{ color: isColorDark(device.color) ? '#e2e8f0' : undefined }}>
                    <span className="dv-meta-item">
                      <FontAwesomeIcon icon={faLocationDot} />
                      {device.location}
                    </span>
                    <span className="dv-meta-item">
                      <FontAwesomeIcon icon={faClock} />
                      {device.last_active}
                    </span>
                  </div>
                  <div className="dv-card-sensor-row" style={{ color: isColorDark(device.color) ? '#e2e8f0' : undefined }}>
                    {device.latest_reading?.water_level != null && (
                      <div className="dv-sensor-item">
                        <div className="dv-sensor-container">
                          <div className="dv-sensor-fill" style={{ height: `${device.latest_reading.water_level}%`, background: '#0ea5e9' }} />
                        </div>
                        <span className="dv-sensor-label" style={{ marginTop: '4px' }}>Water Level</span>
                      </div>
                    )}
                    {device.latest_reading?.soap_level != null && (
                      <div className="dv-sensor-item">
                        <div className="dv-sensor-container">
                          <div className="dv-sensor-fill" style={{ height: `${device.latest_reading.soap_level}%`, background: '#6366f1' }} />
                        </div>
                        <span className="dv-sensor-label" style={{ marginTop: '4px' }}>Soap Level</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="dv-card-footer">
                  {bat ? (
                    <div className="dv-battery-wrap">
                      <BatteryRing pct={device.battery} color={bat.color} />
                      <div className="dv-battery-info">
                        <span className="dv-battery-label">Battery</span>
                        <span className="dv-battery-status" style={{ color: bat.color }}>{bat.label}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="dv-wired">
                      <FontAwesomeIcon icon={faBolt} />
                      <span>Wired Power</span>
                    </div>
                  )}
                  <button className="dv-details-btn" style={{ '--btn-color': device.color }}>
                    Details <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                </div>

                <div className="dv-card-bar" style={{ background: device.color }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Devices;
