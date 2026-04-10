import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faLocationDot, faBatteryThreeQuarters, faBatteryFull,
  faBatteryHalf, faBatteryQuarter, faDroplet, faPumpSoap,
  faTemperatureHalf, faHandsWash, faVolumeHigh, faLightbulb,
  faChartLine, faClock, faCircleCheck, faCircleXmark, faServer,
  faBolt, faEye, faWater, faToggleOn, faDisplay, faMusic,
} from '@fortawesome/free-solid-svg-icons';

const ICON_MAP = {
  faPumpSoap, faDroplet, faTemperatureHalf, faHandsWash,
  faVolumeHigh, faLightbulb, faBolt, faServer,
  faEye, faWater, faToggleOn, faDisplay, faMusic,
};

const SENSOR_META = [
  { key: 'water_level', label: 'Water Level',  icon: faDroplet,         color: '#0ea5e9' },
  { key: 'soap_level',  label: 'Soap Level',   icon: faPumpSoap,        color: '#6366f1' },
  { key: 'temperature', label: 'Temperature',  icon: faTemperatureHalf, color: '#f59e0b' },
];

const API = '/api/devices';

const batteryMeta = (b) => {
  if (b === null || b === undefined) return null;
  if (b >= 75) return { icon: faBatteryFull,         color: '#10b981' };
  if (b >= 50) return { icon: faBatteryThreeQuarters, color: '#10b981' };
  if (b >= 25) return { icon: faBatteryHalf,          color: '#f59e0b' };
  return              { icon: faBatteryQuarter,        color: '#ef4444' };
};

const SensorChart = ({ data, color }) => {
  if (!data || data.length < 2) return <p style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>Not enough data yet.</p>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 500, H = 120, px = 16, py = 16;
  const iw = W - px * 2, ih = H - py * 2;

  const pts = data.map((v, i) => ({
    x: px + (i / (data.length - 1)) * iw,
    y: py + ih - ((v - min) / range) * ih,
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x},${H} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dd-chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={polyline} />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
};

const DeviceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device,  setDevice]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    fetch(`${API}/${id}/`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setDevice(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="dd-page">
      <button className="dd-back-btn" onClick={() => navigate('/devices')}>
        <FontAwesomeIcon icon={faArrowLeft} /> Back
      </button>
      <p style={{ color: '#94a3b8', padding: '40px', textAlign: 'center' }}>Loading…</p>
    </div>
  );

  if (error || !device) return (
    <div className="dd-page">
      <button className="dd-back-btn" onClick={() => navigate('/devices')}>
        <FontAwesomeIcon icon={faArrowLeft} /> Back
      </button>
      <p style={{ color: '#94a3b8', padding: '40px', textAlign: 'center' }}>Device not found.</p>
    </div>
  );

  const icon    = ICON_MAP[device.icon] ?? faServer;
  const bat     = batteryMeta(device.battery);
  const reading = device.latest_reading ?? {};
  const history = device.history ?? [];

  const fmtSensor = (val, key) => {
    if (val === null || val === undefined) return 'N/A';
    if (key === 'temperature') return `${val}°C`;
    return `${val}%`;
  };

  return (
    <div className="dd-page">

      <button className="dd-back-btn" onClick={() => navigate('/devices')}>
        <FontAwesomeIcon icon={faArrowLeft} /> Back to Devices
      </button>

      {/* Hero card */}
      <div className="dd-hero" style={{ '--dev-color': device.color }}>
        <div className="dd-hero-glow" style={{ background: `radial-gradient(ellipse at top left, ${device.color}40 0%, transparent 65%)` }} />
        <div className="dd-hero-left">
          <div className="dd-hero-icon" style={{ background: `${device.color}22`, color: device.color }}>
            <FontAwesomeIcon icon={icon} />
          </div>
          <div className="dd-hero-info">
            <h2 className="dd-hero-name">{device.name}</h2>
            <div className="dd-hero-meta">
              <span><FontAwesomeIcon icon={faLocationDot} /> {device.location}</span>
              <span className="dd-meta-dot" />
              <span><FontAwesomeIcon icon={faClock} /> Last active: {device.last_active}</span>
            </div>
          </div>
        </div>
        <div className="dd-hero-right">
          <span className={`dd-status-badge ${device.status === 'Online' ? 'dd-badge-online' : 'dd-badge-offline'}`}>
            <FontAwesomeIcon icon={device.status === 'Online' ? faCircleCheck : faCircleXmark} />
            {device.status}
          </span>
          {bat && (
            <span className="dd-battery" style={{ color: bat.color }}>
              <FontAwesomeIcon icon={bat.icon} /> {device.battery}%
            </span>
          )}
        </div>
      </div>

      {/* Sensor readings */}
      <p className="dd-section-label">Sensor Readings</p>
      <div className="dd-sensor-grid">
        {SENSOR_META.map(({ key, label, icon: sIcon, color }) => {
          const raw  = reading[key];
          const disp = fmtSensor(raw, key);
          const isNA = disp === 'N/A';
          return (
            <div key={key} className={`dd-sensor-card ${isNA ? 'dd-sensor-na' : ''}`}>
              <div className="dd-sensor-icon" style={{ background: `${color}18`, color: isNA ? '#cbd5e1' : color }}>
                <FontAwesomeIcon icon={sIcon} />
              </div>
              <div className="dd-sensor-body">
                <span className="dd-sensor-label">{label}</span>
                <span className="dd-sensor-value" style={{ color: isNA ? '#94a3b8' : color }}>{disp}</span>
              </div>
              {!isNA && key !== 'temperature' && (
                <div className="dd-sensor-bar-wrap">
                  <div className="dd-sensor-bar" style={{ background: `${color}22` }}>
                    <div className="dd-sensor-fill" style={{ width: `${raw}%`, background: color }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* History chart */}
      <p className="dd-section-label">Sensor History</p>
      <div className="dd-chart-card">
        <div className="dd-chart-header">
          <div className="dd-chart-title-wrap">
            <div className="dd-chart-icon" style={{ background: `${device.color}18`, color: device.color }}>
              <FontAwesomeIcon icon={faChartLine} />
            </div>
            <div>
              <span className="dd-chart-title">Last 10 Readings</span>
              <span className="dd-chart-sub">Real-time sensor data trend</span>
            </div>
          </div>
          <div className="dd-chart-legend">
            <span className="dd-legend-dot" style={{ background: device.color }} />
            <span>Sensor output</span>
          </div>
        </div>
        <SensorChart data={history} color={device.color} />
        {history.length > 0 && (
          <div className="dd-chart-ticks">
            {history.map((_, i) => <span key={i}>{i + 1}</span>)}
          </div>
        )}
      </div>

    </div>
  );
};

export default DeviceDetails;
