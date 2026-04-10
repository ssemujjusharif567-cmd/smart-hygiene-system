import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlug, faGear, faBell, faKey, faEnvelope, faPowerOff,
  faMobileScreen, faDesktop, faCheck, faLocationDot,
  faWifi, faMicrochip, faServer, faCircle, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

const API = '/api/settings';

const tabs = [
  { key: 'api',           label: 'API Settings',         icon: faPlug,     color: '#6366f1' },
  { key: 'device',        label: 'Device Configuration', icon: faGear,     color: '#0ea5e9' },
  { key: 'notifications', label: 'Notifications',        icon: faBell,     color: '#f59e0b' },
  { key: 'power',         label: 'Power Management',     icon: faPowerOff, color: '#10b981' },
];

const Toggle = ({ checked, onChange, disabled }) => (
  <button type="button" role="switch" aria-checked={checked}
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`toggle-switch ${checked ? 'toggle-on' : ''} ${disabled ? 'toggle-disabled' : ''}`}>
    <span className="toggle-thumb" />
  </button>
);

const Field = ({ label, hint, children, span }) => (
  <div className={`s-field${span ? ' s-field-span' : ''}`}>
    <div className="s-field-label">
      <span>{label}</span>
      {hint && <small>{hint}</small>}
    </div>
    {children}
  </div>
);

const SectionHeader = ({ icon, color, title, desc }) => (
  <div className="s-section-head">
    <div className="s-section-icon-wrap" style={{ background: `${color}18`, color }}>
      <FontAwesomeIcon icon={icon} />
    </div>
    <div>
      <h3 className="s-section-title">{title}</h3>
      <p className="s-section-desc">{desc}</p>
    </div>
  </div>
);

const PowerGroup = ({ title, color, icon, items, onToggle }) => (
  <div className="s-power-group">
    <div className="s-power-group-header">
      <div className="s-power-group-dot" style={{ background: color }} />
      <FontAwesomeIcon icon={icon} style={{ color }} />
      <span>{title}</span>
      <span className="s-power-group-count">{items.filter(i => i.status).length}/{items.length} active</span>
    </div>
    <div className="s-power-list">
      {items.map(item => (
        <div key={item.id} className="s-power-item">
          <div className="s-power-item-left">
            <span className={`s-power-dot ${item.status ? 'dot-on' : 'dot-off'}`} />
            <div>
              <span className="s-power-name">{item.name}</span>
              <span className={`s-power-status-text ${item.status ? 'text-on' : 'text-off'}`}>
                {item.status ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <Toggle checked={item.status} onChange={v => onToggle(item.id, v)} />
        </div>
      ))}
    </div>
  </div>
);

const Settings = () => {
  const [activeTab, setActiveTab] = useState('api');
  const [saveState, setSaveState] = useState('idle');
  const [loading,   setLoading]   = useState(true);
  const [systemOnline, setSystemOnline] = useState(true);
  const [systemToggling, setSystemToggling] = useState(false);

  const [api,    setApi]    = useState({ api_endpoint: '', api_key: '', poll_interval: 30 });
  const [device, setDevice] = useState({ default_location: '', device_timeout: 60, temperature_unit: 'Celsius', auto_reconnect: true });
  const [notif,  setNotif]  = useState({ alert_email: '', low_threshold: 20, email_alerts: true, sms_alerts: false, push_alerts: true });
  const [power,  setPower]  = useState([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/`).then(r => r.json()),
      fetch(`${API}/power/`).then(r => r.json()),
    ]).then(([settings, powerDevices]) => {
      setApi({
        api_endpoint:  settings.api_endpoint  ?? '',
        api_key:       settings.api_key       ?? '',
        poll_interval: settings.poll_interval ?? 30,
      });
      setDevice({
        default_location: settings.default_location  ?? 'Main Entrance',
        device_timeout:   settings.device_timeout    ?? 60,
        temperature_unit: settings.temperature_unit  ?? 'Celsius',
        auto_reconnect:   settings.auto_reconnect    ?? true,
      });
      setNotif({
        alert_email:   settings.alert_email   ?? '',
        low_threshold: settings.low_threshold ?? 20,
        email_alerts:  settings.email_alerts  ?? true,
        sms_alerts:    settings.sms_alerts    ?? false,
        push_alerts:   settings.push_alerts   ?? true,
      });
      setSystemOnline(settings.system_online ?? true);
      setPower(powerDevices);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaveState('saving');
    try {
      await fetch(`${API}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...api, ...device, ...notif }),
      });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setSaveState('idle');
    }
  };

  const handlePowerToggle = async (id, newStatus) => {
    setPower(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    try {
      await fetch(`${API}/power/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      setPower(prev => prev.map(d => d.id === id ? { ...d, status: !newStatus } : d));
    }
  };

  const handleSystemPowerToggle = async () => {
    const next = !systemOnline;
    setSystemToggling(true);
    try {
      const res = await fetch(`${API}/system-power/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_online: next }),
      });
      if (res.ok) setSystemOnline(next);
    } finally {
      setSystemToggling(false);
    }
  };

  const grouped = (group) => power.filter(d => d.group === group);

  if (loading) return <div className="s-page">Loading settings…</div>;

  return (
    <div className="s-page">

      {/* Banner */}
      <div className="s-banner">
        <div className="s-banner-text">
          <h2 className="s-banner-title">Settings</h2>
          <p className="s-banner-sub">Manage your dashboard configuration and preferences</p>
        </div>
        <button
          type="button"
          className={`s-save-btn ${saveState}`}
          onClick={handleSave}
          disabled={saveState === 'saving'}
        >
          {saveState === 'saving' && <span className="s-spinner" />}
          {saveState === 'saved'  && <FontAwesomeIcon icon={faCheck} />}
          {saveState === 'idle'   ? 'Save Changes' : saveState === 'saving' ? 'Saving…' : 'Saved!'}
        </button>
      </div>

      <div className="s-layout">

        {/* Tab nav */}
        <nav className="s-nav">
          {tabs.map(t => (
            <button key={t.key} type="button"
              className={`s-tab ${activeTab === t.key ? 's-tab-active' : ''}`}
              style={activeTab === t.key ? { '--tab-color': t.color } : {}}
              onClick={() => setActiveTab(t.key)}
            >
              <span className="s-tab-badge" style={{ background: `${t.color}18`, color: t.color }}>
                <FontAwesomeIcon icon={t.icon} />
              </span>
              <span className="s-tab-label">{t.label}</span>
              {activeTab === t.key && <span className="s-tab-pip" style={{ background: t.color }} />}
            </button>
          ))}
        </nav>

        {/* Panels */}
        <div className="s-panel">

          {/* API */}
          {activeTab === 'api' && (
            <div className="s-card">
              <SectionHeader icon={faPlug} color="#6366f1" title="API Settings" desc="Configure how the dashboard connects to your IoT backend." />
              <div className="s-grid">
                <Field label="API Endpoint" hint="Base URL for all device requests" span>
                  <div className="s-input-wrap">
                    <input type="url" value={api.api_endpoint} onChange={e => setApi({ ...api, api_endpoint: e.target.value })} />
                  </div>
                </Field>
                <Field label="API Key" hint="Keep this secret">
                  <div className="s-input-wrap">
                    <input type="password" placeholder="••••••••••••••••" value={api.api_key} onChange={e => setApi({ ...api, api_key: e.target.value })} />
                    <FontAwesomeIcon icon={faKey} className="s-input-icon" />
                  </div>
                </Field>
                <Field label="Poll Interval" hint="Seconds between data fetches (5–300)">
                  <div className="s-input-wrap">
                    <input type="number" min="5" max="300" value={api.poll_interval} onChange={e => setApi({ ...api, poll_interval: e.target.value })} />
                    <span className="s-input-suffix">sec</span>
                  </div>
                </Field>
              </div>
            </div>
          )}

          {/* Device */}
          {activeTab === 'device' && (
            <div className="s-card">
              <SectionHeader icon={faGear} color="#0ea5e9" title="Device Configuration" desc="Set defaults applied to all registered devices." />
              <div className="s-grid">
                <Field label="Default Location" hint="Used when no location is assigned">
                  <div className="s-input-wrap">
                    <input type="text" value={device.default_location} onChange={e => setDevice({ ...device, default_location: e.target.value })} />
                    <FontAwesomeIcon icon={faLocationDot} className="s-input-icon" />
                  </div>
                </Field>
                <Field label="Device Timeout" hint="Mark device offline after N seconds">
                  <div className="s-input-wrap">
                    <input type="number" min="10" value={device.device_timeout} onChange={e => setDevice({ ...device, device_timeout: e.target.value })} />
                    <span className="s-input-suffix">sec</span>
                  </div>
                </Field>
                <Field label="Temperature Unit" span>
                  <div className="s-radio-group">
                    {['Celsius', 'Fahrenheit'].map(u => (
                      <label key={u} className={`s-radio ${device.temperature_unit === u ? 's-radio-active' : ''}`}>
                        <input type="radio" name="unit" value={u} checked={device.temperature_unit === u} onChange={() => setDevice({ ...device, temperature_unit: u })} />
                        {u === 'Celsius' ? '°C — Celsius' : '°F — Fahrenheit'}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Auto-Reconnect" hint="Automatically retry disconnected devices">
                  <div className="s-toggle-row">
                    <Toggle checked={device.auto_reconnect} onChange={v => setDevice({ ...device, auto_reconnect: v })} />
                    <span className={`s-toggle-label ${device.auto_reconnect ? 'label-on' : ''}`}>
                      {device.auto_reconnect ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </Field>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="s-card">
              <SectionHeader icon={faBell} color="#f59e0b" title="Notification Preferences" desc="Choose how and when you receive alerts." />
              <div className="s-grid">
                <Field label="Alert Email" hint="Receives all critical notifications">
                  <div className="s-input-wrap">
                    <input type="email" placeholder="alerts@example.com" value={notif.alert_email} onChange={e => setNotif({ ...notif, alert_email: e.target.value })} />
                    <FontAwesomeIcon icon={faEnvelope} className="s-input-icon" />
                  </div>
                </Field>
                <Field label="Low-Level Threshold" hint="Alert when reading drops below this">
                  <div className="s-input-wrap">
                    <input type="number" min="0" max="100" value={notif.low_threshold} onChange={e => setNotif({ ...notif, low_threshold: e.target.value })} />
                    <span className="s-input-suffix">%</span>
                  </div>
                </Field>
              </div>
              <div className="s-divider"><span>Alert Channels</span></div>
              <div className="s-channel-list">
                {[
                  { key: 'email_alerts', icon: faEnvelope,     color: '#6366f1', label: 'Email Alerts',       desc: 'Send alerts to the configured email address' },
                  { key: 'sms_alerts',   icon: faMobileScreen, color: '#0ea5e9', label: 'SMS Alerts',         desc: 'Send text messages for critical events' },
                  { key: 'push_alerts',  icon: faDesktop,      color: '#10b981', label: 'Push Notifications', desc: 'Show browser push notifications' },
                ].map(({ key, icon, color, label, desc }) => (
                  <div key={key} className={`s-channel-item ${notif[key] ? 'channel-on' : ''}`}>
                    <div className="s-channel-icon" style={{ background: `${color}18`, color }}>
                      <FontAwesomeIcon icon={icon} />
                    </div>
                    <div className="s-channel-text">
                      <strong>{label}</strong>
                      <small>{desc}</small>
                    </div>
                    <Toggle checked={notif[key]} onChange={v => setNotif({ ...notif, [key]: v })} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Power */}
          {activeTab === 'power' && (
            <div className="s-card">
              <SectionHeader icon={faPowerOff} color="#10b981" title="Power Management" desc="Control and monitor power status of all connected hardware." />

              {/* System master switch */}
              <div className={`s-system-power ${systemOnline ? 's-system-on' : 's-system-off'}`}>
                <div className="s-system-power-left">
                  <div className="s-system-power-icon">
                    <FontAwesomeIcon icon={faPowerOff} />
                  </div>
                  <div>
                    <strong>System Power</strong>
                    <p>Remotely {systemOnline ? 'shut down' : 'activate'} the entire SmartWash system</p>
                  </div>
                </div>
                <div className="s-system-power-right">
                  {!systemOnline && (
                    <span className="s-system-warning">
                      <FontAwesomeIcon icon={faTriangleExclamation} /> System is offline
                    </span>
                  )}
                  <Toggle checked={systemOnline} onChange={handleSystemPowerToggle} disabled={systemToggling} />
                </div>
              </div>

              <div className="s-power-stats">
                {[
                  { label: 'Devices', group: 'devices', color: '#10b981' },
                  { label: 'Sensors', group: 'sensors', color: '#0ea5e9' },
                  { label: 'Boards',  group: 'boards',  color: '#f59e0b' },
                  { label: 'Other',   group: 'other',   color: '#6366f1' },
                ].map(({ label, group, color }) => {
                  const items = grouped(group);
                  return (
                    <div key={label} className="s-stat-chip" style={{ borderColor: `${color}30` }}>
                      <span className="s-stat-num" style={{ color }}>{items.filter(d => d.status).length}<span className="s-stat-total">/{items.length}</span></span>
                      <span className="s-stat-label">{label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="s-power-groups">
                <PowerGroup title="Connected Devices" color="#10b981" icon={faServer}    items={grouped('devices')} onToggle={handlePowerToggle} />
                <PowerGroup title="Sensors"           color="#0ea5e9" icon={faMicrochip} items={grouped('sensors')} onToggle={handlePowerToggle} />
                <PowerGroup title="Control Boards"    color="#f59e0b" icon={faCircle}    items={grouped('boards')}  onToggle={handlePowerToggle} />
                <PowerGroup title="Other Components"  color="#6366f1" icon={faWifi}      items={grouped('other')}   onToggle={handlePowerToggle} />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
