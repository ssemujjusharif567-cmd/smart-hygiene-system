import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDroplet, faPumpSoap, faTemperatureHalf, faHandsWash,
  faServer, faBell, faChartLine, faCircleCheck, faCircleXmark,
  faTriangleExclamation, faCircleExclamation, faArrowTrendUp,
  faArrowTrendDown, faArrowRight, faPersonWalking,
  faBatteryThreeQuarters, faLocationDot, faSun, faCloudSun,
  faCity, faMoon, faVolumeHigh, faLightbulb, faBolt, faEye,
  faWater, faToggleOn, faDisplay, faMusic,
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const ICON_MAP = {
  faPumpSoap, faDroplet, faTemperatureHalf, faHandsWash,
  faVolumeHigh, faLightbulb, faBolt, faServer,
  faEye, faWater, faToggleOn, faDisplay, faMusic,
};

const SEV = {
  High:   { color: '#ef4444', bg: '#fef2f2', icon: faTriangleExclamation },
  Medium: { color: '#f59e0b', bg: '#fffbeb', icon: faCircleExclamation   },
  Low:    { color: '#3b82f6', bg: '#eff6ff', icon: faCircleExclamation   },
};

const KPI_ICONS    = { 'Handwashes Today': faHandsWash, 'Soap Remaining': faPumpSoap, 'Water Used (mL)': faDroplet, 'Left Unwashed': faPersonWalking };
const SENSOR_ICONS = { 'Water Level': faDroplet, 'Soap Level': faPumpSoap, 'Temperature': faTemperatureHalf, 'Handwash Count': faHandsWash };

const getGreeting = (date) => {
  const h = date.getHours();
  if (h < 12) return { text: 'Good morning',   icon: faSun,      iconColor: '#f59e0b' };
  if (h < 17) return { text: 'Good afternoon', icon: faCloudSun, iconColor: '#f97316' };
  if (h < 21) return { text: 'Good evening',   icon: faCity,     iconColor: '#6366f1' };
  return             { text: 'Good night',      icon: faMoon,     iconColor: '#8b5cf6' };
};

const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const REFRESH_INTERVAL = 15000; // 15 seconds

const Dashboard = () => {
  const navigate = useNavigate();
  const [now, setNow]       = useState(new Date());
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [summary,  setSummary]  = useState({ readable_date: '', station: '', status: '', active_alerts: 0 });
  const [kpi,      setKpi]      = useState([]);
  const [sensors,  setSensors]  = useState([]);
  const [devices,  setDevices]  = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [activity, setActivity] = useState({ hours: [], values: [] });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [summaryRes, kpiRes, sensorRes, deviceRes, alertRes, activityRes] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/summary/`),
        fetch(`${API_BASE}/api/dashboard/kpi/`),
        fetch(`${API_BASE}/api/dashboard/sensors/`),
        fetch(`${API_BASE}/api/dashboard/devices/`),
        fetch(`${API_BASE}/api/dashboard/alerts/`),
        fetch(`${API_BASE}/api/dashboard/activity/`),
      ]);

      // Parse all successful responses in parallel
      const [s, k, se, de, al, ac] = await Promise.all([
        summaryRes.ok  ? summaryRes.json()  : null,
        kpiRes.ok      ? kpiRes.json()      : null,
        sensorRes.ok   ? sensorRes.json()   : null,
        deviceRes.ok   ? deviceRes.json()   : null,
        alertRes.ok    ? alertRes.json()    : null,
        activityRes.ok ? activityRes.json() : null,
      ]);

      // Only update state when we have new data — previous data stays visible
      if (s)  setSummary(s);
      if (k)  setKpi(k);
      if (se) setSensors(se);
      if (de) setDevices(de);
      if (al) setAlerts(al);
      if (ac) setActivity(ac);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch + auto-refresh every 15s
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  const { text: greetText, icon: greetIcon, iconColor: greetColor } = getGreeting(now);
  const dateStr = summary.readable_date || formatDate(now);
  const timeStr = formatTime(now);

  const displayKPI     = kpi.map(k => ({ ...k, icon: KPI_ICONS[k.label]    ?? faServer }));
  const displaySensors = sensors.map(s => ({ ...s, icon: SENSOR_ICONS[s.label] ?? faServer }));
  const displayDevices = devices.map(d => ({ ...d, icon: ICON_MAP[d.icon]   ?? faServer }));

  const chartData = {
    labels: activity.hours,
    datasets: [{
      data: activity.values,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
      y: { display: false },
    },
  };

  if (loading) {
    return (
      <div className="db-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text)' }}>
        Loading Dashboard…
      </div>
    );
  }

  return (
    <div className="db-page">

      {/* ── Subtle refresh indicator ── */}
      <div className="db-live-bar">
        <span className={`db-live-dot${isRefreshing ? ' db-live-active' : ''}`} />
        {isRefreshing ? 'Fetching latest data…' : (lastUpdated ? `Updated ${formatTime(lastUpdated)}` : 'Loading…')}
      </div>

      {/* ── Banner ── */}
      <div className="db-banner">
        <div className="db-banner-left">
          <div>
            <h2 className="db-banner-title">
              {greetText}, {user ? user.full_name : 'Admin'} <FontAwesomeIcon icon={greetIcon} style={{ color: greetColor, marginLeft: '6px' }} />
            </h2>
            <p className="db-banner-sub">{dateStr} · {timeStr} · Main Entrance Station</p>
          </div>
        </div>
        <div className="db-banner-pills">
          <span className="db-pill db-pill-green">
            <span className="db-pill-dot" />
            {summary.status || 'System Operational'}
          </span>
          <span className="db-pill db-pill-red">
            <FontAwesomeIcon icon={faBell} />
            {summary.active_alerts ?? 0} Active Alerts
          </span>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="db-kpi-row">
        {displayKPI.map(({ label, value, change, up, icon, color }) => (
          <div key={label} className="db-kpi">
            <div className="db-kpi-top">
              <div className="db-kpi-icon" style={{ background: `${color}18`, color }}>
                <FontAwesomeIcon icon={icon} />
              </div>
              <span className={`db-kpi-change ${up ? 'db-change-up' : 'db-change-down'}`}>
                <FontAwesomeIcon icon={up ? faArrowTrendUp : faArrowTrendDown} />
                {change}
              </span>
            </div>
            <span className="db-kpi-value">{value}</span>
            <span className="db-kpi-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="db-grid">

        {/* Sensor readings */}
        <div className="db-card db-card-sensors">
          <div className="db-card-head">
            <div className="db-card-head-icon" style={{ background: '#0ea5e918', color: '#0ea5e9' }}>
              <FontAwesomeIcon icon={faChartLine} />
            </div>
            <div>
              <span className="db-card-title">Live Sensor Readings</span>
              <span className="db-card-sub">Updated just now</span>
            </div>
          </div>
          <div className="db-sensor-list">
            {displaySensors.map(({ label, value, pct, icon, color }) => (
              <div key={label} className="db-sensor-row">
                <div className="db-sensor-icon" style={{ background: `${color}18`, color }}>
                  <FontAwesomeIcon icon={icon} />
                </div>
                <div className="db-sensor-body">
                  <div className="db-sensor-top">
                    <span className="db-sensor-label">{label}</span>
                    <span className="db-sensor-value" style={{ color }}>{value}</span>
                  </div>
                  <div className="db-sensor-track">
                    <div className="db-sensor-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity chart */}
        <div className="db-card db-card-chart">
          <div className="db-card-head">
            <div className="db-card-head-icon" style={{ background: '#6366f118', color: '#6366f1' }}>
              <FontAwesomeIcon icon={faHandsWash} />
            </div>
            <div>
              <span className="db-card-title">Handwash Activity</span>
              <span className="db-card-sub">Today's hourly sessions</span>
            </div>
          </div>
          <div className="db-chart-wrap">
            <Line data={chartData} options={chartOpts} />
          </div>
        </div>

        {/* Device status */}
        <div className="db-card">
          <div className="db-card-head">
            <div className="db-card-head-icon" style={{ background: '#10b98118', color: '#10b981' }}>
              <FontAwesomeIcon icon={faServer} />
            </div>
            <div>
              <span className="db-card-title">Device Status</span>
              <span className="db-card-sub">{devices.length} devices registered</span>
            </div>
            <button className="db-card-link" onClick={() => navigate('/devices')}>
              View all <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
          <div className="db-device-list">
            {displayDevices.map(dev => (
              <div key={dev.id} className="db-device-row" onClick={() => navigate(`/device/${dev.id}`)}>
                <div className="db-device-icon" style={{ background: `${dev.color}18`, color: dev.color }}>
                  <FontAwesomeIcon icon={dev.icon} />
                </div>
                <div className="db-device-info">
                  <span className="db-device-name">{dev.name}</span>
                  <span className="db-device-meta">
                    <FontAwesomeIcon icon={faLocationDot} /> {dev.location}
                    {dev.battery != null && <> · <FontAwesomeIcon icon={faBatteryThreeQuarters} /> {dev.battery}%</>}
                  </span>
                </div>
                <span className={`db-device-badge ${dev.status === 'Online' ? 'db-badge-on' : 'db-badge-off'}`}>
                  <FontAwesomeIcon icon={dev.status === 'Online' ? faCircleCheck : faCircleXmark} />
                  {dev.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="db-card">
          <div className="db-card-head">
            <div className="db-card-head-icon" style={{ background: '#ef444418', color: '#ef4444' }}>
              <FontAwesomeIcon icon={faBell} />
            </div>
            <div>
              <span className="db-card-title">Recent Alerts</span>
              <span className="db-card-sub">Last {alerts.length} notifications</span>
            </div>
            <button className="db-card-link" onClick={() => navigate('/alerts')}>
              View all <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
          <div className="db-alert-list">
            {alerts.map((a, i) => {
              const s = SEV[a.severity] ?? SEV.Low;
              return (
                <div key={i} className="db-alert-row">
                  <div className="db-alert-icon" style={{ background: s.bg, color: s.color }}>
                    <FontAwesomeIcon icon={s.icon} />
                  </div>
                  <div className="db-alert-body">
                    <span className="db-alert-title">{a.title}</span>
                    <span className="db-alert-meta">{a.device} · {a.time}</span>
                  </div>
                  <span className="db-alert-sev" style={{ background: s.bg, color: s.color }}>
                    {a.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
