import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDroplet, faPumpSoap, faTemperatureHalf, faHandsWash,
  faServer, faBell, faChartLine, faCircleCheck, faCircleXmark,
  faTriangleExclamation, faCircleExclamation, faArrowTrendUp,
  faArrowTrendDown, faArrowRight, faPersonWalking,
  faBatteryThreeQuarters, faLocationDot, faSun, faCloudSun,
  faCity, faMoon,
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const SEV = {
  High:   { color: '#ef4444', bg: '#fef2f2', icon: faTriangleExclamation },
  Medium: { color: '#f59e0b', bg: '#fffbeb', icon: faCircleExclamation   },
  Low:    { color: '#3b82f6', bg: '#eff6ff', icon: faCircleExclamation   },
};

const KPI = [
  { label: 'Handwashes Today', value: '284',   change: '+12%', up: true,  icon: faHandsWash,      color: '#10b981' },
  { label: 'Soap Remaining',   value: '65%',   change: '-8%',  up: false, icon: faPumpSoap,       color: '#6366f1' },
  { label: 'Water Used (L)',   value: '1,240', change: '+5%',  up: true,  icon: faDroplet,        color: '#0ea5e9' },
  { label: 'Left Unwashed',    value: '38',    change: '-22%', up: false, icon: faPersonWalking,  color: '#ef4444' },
];

const SENSORS = [
  { label: 'Water Level',  value: '75%',  pct: 75, icon: faDroplet,         color: '#0ea5e9' },
  { label: 'Soap Level',   value: '65%',  pct: 65, icon: faPumpSoap,        color: '#6366f1' },
  { label: 'Temperature',  value: '24°C', pct: 60, icon: faTemperatureHalf, color: '#f59e0b' },
  { label: 'Handwash Count', value: '284', pct: 85, icon: faHandsWash,      color: '#10b981' },
];

const DEVICES = [
  { id: 0, name: 'Soap Dispenser',     status: 'Online',  battery: 85,  icon: faPumpSoap,        color: '#6366f1' },
  { id: 1, name: 'Water Valve',        status: 'Online',  battery: 92,  icon: faDroplet,         color: '#0ea5e9' },
  { id: 2, name: 'Temperature Sensor', status: 'Offline', battery: 78,  icon: faTemperatureHalf, color: '#f59e0b' },
  { id: 3, name: 'Handwash Counter',   status: 'Online',  battery: 90,  icon: faHandsWash,       color: '#10b981' },
];

const ALERTS = [
  { title: 'Water Tank Empty',    device: 'Water Valve',        time: '11:00 AM', severity: 'High'   },
  { title: 'Device Offline',      device: 'Temperature Sensor', time: '10:45 AM', severity: 'High'   },
  { title: 'Low Soap Level',      device: 'Soap Dispenser',     time: '11:15 AM', severity: 'Medium' },
  { title: 'Battery Low',         device: 'Handwash Counter',   time: '10:30 AM', severity: 'Low'    },
];

const getGreeting = (date) => {
  const h = date.getHours();
  if (h < 12) return { text: 'Good morning', icon: faSun, iconColor: '#f59e0b' };
  if (h < 17) return { text: 'Good afternoon', icon: faCloudSun, iconColor: '#f97316' };
  if (h < 21) return { text: 'Good evening', icon: faCity, iconColor: '#6366f1' };
  return { text: 'Good night', icon: faMoon, iconColor: '#8b5cf6' };
};

const formatDate = (date) =>
  date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const formatTime = (date) =>
  date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const Dashboard = () => {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState({ readable_date: '', station: '', status: '', active_alerts: 0 });
  const [kpi, setKpi] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activity, setActivity] = useState({ hours: [], values: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, kpiRes, sensorRes, deviceRes, alertRes, activityRes] = await Promise.all([
          fetch('/api/dashboard/summary/'),
          fetch('/api/dashboard/kpi/'),
          fetch('/api/dashboard/sensors/'),
          fetch('/api/dashboard/devices/'),
          fetch('/api/dashboard/alerts/'),
          fetch('/api/dashboard/activity/'),
        ]);

        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (kpiRes.ok) setKpi(await kpiRes.json());
        if (sensorRes.ok) setSensors(await sensorRes.json());
        if (deviceRes.ok) setDevices(await deviceRes.json());
        if (alertRes.ok) setAlerts(await alertRes.json());
        if (activityRes.ok) setActivity(await activityRes.json());
      } catch (error) {
        console.error('Dashboard fetch error', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const { text: greetText, icon: greetIcon, iconColor: greetColor } = getGreeting(now);
  const dateStr = summary.readable_date || formatDate(now);
  const timeStr = formatTime(now);

  const displayKPI = kpi.length ? kpi : KPI;
  const displaySensors = sensors.length ? sensors : SENSORS;
  const displayDevices = devices.length ? devices : DEVICES;
  const displayAlerts = alerts.length ? alerts : ALERTS;

  const chartData = {
    labels: activity.hours.length ? activity.hours : [],
    datasets: [{
      data: activity.values.length ? activity.values : [],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 2.5,
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
    return <div className="db-page">Loading Dashboard...</div>;
  }

  return (
    <div className="db-page">

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
            System Operational
          </span>
          <span className="db-pill db-pill-red">
            <FontAwesomeIcon icon={faBell} />
            3 Active Alerts
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
          <div className="db-chart-footer">
            <span className="db-chart-peak">Peak: <strong>95 sessions</strong> at 11am</span>
            <span className="db-chart-total">Total today: <strong>647</strong></span>
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
              <span className="db-card-sub">4 devices registered</span>
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
                    <FontAwesomeIcon icon={faLocationDot} /> Main Entrance
                    {dev.battery && <> · <FontAwesomeIcon icon={faBatteryThreeQuarters} /> {dev.battery}%</>}
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
              <span className="db-card-sub">Last 4 notifications</span>
            </div>
            <button className="db-card-link" onClick={() => navigate('/alerts')}>
              View all <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
          <div className="db-alert-list">
            {displayAlerts.map((a, i) => {
              const s = SEV[a.severity];
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
