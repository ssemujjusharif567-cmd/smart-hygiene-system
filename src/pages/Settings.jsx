import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { API_BASE } from '../api';
import {
  faPlug, faGear, faBell, faKey, faEnvelope, faPowerOff,
  faMobileScreen, faDesktop, faCheck, faLocationDot,
  faWifi, faMicrochip, faServer, faCircle, faTriangleExclamation,
  faSpinner, faTrash, faCrown, faShieldAlt, faEye, faUserPlus, faXmark, faCopy,
} from '@fortawesome/free-solid-svg-icons';

const API = `${API_BASE}/api/settings`;
const ACCOUNTS_API = `${API_BASE}/api/accounts`;

const tabs = [
  { key: 'api',           label: 'API Settings',         icon: faPlug,     color: '#6366f1' },
  { key: 'device',        label: 'Device Configuration', icon: faGear,     color: '#0ea5e9' },
  { key: 'notifications', label: 'Notifications',        icon: faBell,     color: '#f59e0b' },
  { key: 'access',        label: 'Access Control',       icon: faKey,      color: '#8b5cf6' },
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

const PowerGroup = ({ title, color, icon, items, onToggle, systemOnline }) => (
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
          <Toggle checked={item.status} onChange={v => onToggle(item.id, v)} disabled={!systemOnline} />
        </div>
      ))}
    </div>
  </div>
);

const ShutdownModal = ({ isOpen, isShuttingDown, devices, offlineCount, phase, onDone }) => {
  if (!isOpen) return null;
  const total = devices.length;
  const pct   = total > 0 ? Math.round((offlineCount / total) * 100) : 0;
  const circ  = 2 * Math.PI * 54;
  const dash  = (pct / 100) * circ;

  return (
    <div className="sdm-overlay">
      <div className="sdm-box">
        {/* Animated ring */}
        <div className="sdm-ring-wrap">
          <svg className="sdm-ring-svg" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--sdm-row-border, rgba(255,255,255,0.08))" strokeWidth="6" />
            <circle cx="60" cy="60" r="54" fill="none"
              stroke={phase === 'done' ? '#10b981' : isShuttingDown ? '#ef4444' : '#6366f1'}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s' }}
            />
          </svg>
          <div className="sdm-ring-inner">
            <FontAwesomeIcon
              icon={phase === 'done' ? faCheck : faPowerOff}
              className={`sdm-ring-icon ${phase === 'running' ? 'sdm-pulse' : ''}`}
              style={{ color: phase === 'done' ? '#10b981' : isShuttingDown ? '#ef4444' : '#6366f1' }}
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="sdm-title">
          {phase === 'done'
            ? (isShuttingDown ? 'System Offline' : 'System Online')
            : (isShuttingDown ? 'Shutting Down…' : 'Starting Up…')}
        </h2>
        <p className="sdm-sub">
          {phase === 'done'
            ? (isShuttingDown ? 'All devices have been powered off.' : 'All devices are back online.')
            : (isShuttingDown ? 'Powering off all connected devices.' : 'Bringing devices back online.')}
        </p>

        {/* Counter */}
        <div className="sdm-counter">
          <span className="sdm-counter-num" style={{ color: isShuttingDown ? '#ef4444' : '#10b981' }}>
            {isShuttingDown ? offlineCount : total - offlineCount}
          </span>
          <span className="sdm-counter-label">/ {total} devices {isShuttingDown ? 'offline' : 'online'}</span>
        </div>

        {/* Device list — sliding window of last 3, no overflow */}
        <div className="sdm-device-list">
          {(() => {
            const doneCount = devices.filter(d => d.shutdownDone).length;
            const start = Math.max(0, doneCount - 3);
            const visible = devices.slice(start, start + 3);
            return visible.map(d => {
              const isOff = isShuttingDown ? d.shutdownDone : !d.shutdownDone;
              return (
                <div key={d.id} className={`sdm-device-row ${isOff ? 'sdm-device-off' : 'sdm-device-on'}`}>
                  <span className={`sdm-device-dot ${isOff ? 'sdm-dot-off' : 'sdm-dot-on'}`} />
                  <span className="sdm-device-name">{d.name}</span>
                  <span className="sdm-device-status">
                    {isOff
                      ? (isShuttingDown ? 'Offline' : 'Online')
                      : (isShuttingDown ? 'Online' : 'Offline')}
                  </span>
                </div>
              );
            });
          })()}
        </div>

        {phase === 'done' && (
          <div className="sdm-done-wrap">
            <p className="sdm-done-hint">Closing automatically…</p>
            <button className="sdm-done-btn" onClick={onDone}>
              <FontAwesomeIcon icon={faCheck} /> Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const InviteModal = ({ isOpen, onClose, user, otpTarget, setOtpTarget, otpResult, otpError, otpSuccess, otpLoading, onGenerate }) => {
  if (!isOpen) return null;
  return (
    <div className="s-modal-overlay" onClick={onClose}>
      <div className="invite-modal" onClick={e => e.stopPropagation()}>
        <div className="invite-modal-header">
          <div className="invite-modal-title-wrap">
            <div className="invite-modal-icon"><FontAwesomeIcon icon={faUserPlus} /></div>
            <div>
              <h3 className="invite-modal-title">Invite New User</h3>
              <p className="invite-modal-sub">Generate a one-time token to share with the new member</p>
            </div>
          </div>
          <button className="invite-modal-close" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
        </div>

        <div className="invite-modal-body">
          <Field label="Full Name" hint="Name of the person being invited">
            <div className="s-input-wrap">
              <input type="text" value={otpTarget.full_name}
                onChange={e => setOtpTarget({ ...otpTarget, full_name: e.target.value })}
                placeholder="Jane Doe" />
            </div>
          </Field>
          <Field label="Username" hint="Optional">
            <div className="s-input-wrap">
              <input type="text" value={otpTarget.username}
                onChange={e => setOtpTarget({ ...otpTarget, username: e.target.value })}
                placeholder="jane_doe" />
            </div>
          </Field>
          <Field label="Email" hint="Optional">
            <div className="s-input-wrap">
              <input type="email" value={otpTarget.email}
                onChange={e => setOtpTarget({ ...otpTarget, email: e.target.value })}
                placeholder="jane@example.com" />
              <FontAwesomeIcon icon={faEnvelope} className="s-input-icon" />
            </div>
          </Field>
          <Field label="Role" hint="Permission level">
            <div className="s-input-wrap">
              <select value={otpTarget.role} onChange={e => setOtpTarget({ ...otpTarget, role: e.target.value })}>
                <option value="viewer">Viewer — read-only</option>
                <option value="admin" disabled={!user?.is_superuser}>Admin — full management</option>
                <option value="superadmin" disabled={!user?.is_superuser}>Superadmin</option>
              </select>
            </div>
          </Field>

          {otpError   && <div className="s-alert s-alert-error">{otpError}</div>}
          {otpSuccess && <div className="s-alert s-alert-success">{otpSuccess}</div>}

          {otpResult.code && (
            <div className="invite-otp-result">
              <div className="invite-otp-code">{otpResult.code}</div>
              <div className="invite-otp-meta">
                <span>Expires {new Date(otpResult.expires_at).toLocaleString()}</span>
                <span className="invite-otp-role">
                  {otpResult.target_role === 'admin' ? 'Admin' : otpResult.target_role === 'superadmin' ? 'Superadmin' : 'Viewer'}
                </span>
              </div>
              {otpResult.target_full_name && (
                <div className="invite-otp-name">For: {otpResult.target_full_name}</div>
              )}
            </div>
          )}
        </div>

        <div className="invite-modal-footer">
          <button className="s-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="s-button" onClick={onGenerate} disabled={otpLoading}>
            {otpLoading
              ? <><FontAwesomeIcon icon={faSpinner} spin /> Generating…</>
              : <><FontAwesomeIcon icon={faKey} /> Generate Token</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const SuccessModal = ({ isOpen, onClose, data }) => {
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'username') {
        setCopiedUsername(true);
        setTimeout(() => setCopiedUsername(false), 2000);
      } else if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="s-modal-overlay" onClick={onClose}>
      <div className="success-modal" onClick={e => e.stopPropagation()}>
        <div className="success-modal-header">
          <div className="success-modal-title-wrap">
            <div className="success-modal-icon"><FontAwesomeIcon icon={faCheck} /></div>
            <div>
              <h3 className="success-modal-title">User Created</h3>
              <p className="success-modal-sub">Share these details with the new user</p>
            </div>
          </div>
          <button className="success-modal-close" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
        </div>

        <div className="success-modal-body">
          <div className="success-field">
            <label className="success-label">Username</label>
            <div className="success-value-wrap">
              <span className="success-value">{data.username}</span>
              <button className={`success-copy ${copiedUsername ? 'copied' : ''}`} onClick={() => copyToClipboard(data.username, 'username')} title="Copy to clipboard">
                <FontAwesomeIcon icon={copiedUsername ? faCheck : faCopy} />
              </button>
            </div>
          </div>
          <div className="success-field">
            <label className="success-label">Code</label>
            <div className="success-value-wrap">
              <span className="success-value">{data.code}</span>
              <button className={`success-copy ${copiedCode ? 'copied' : ''}`} onClick={() => copyToClipboard(data.code, 'code')} title="Copy to clipboard">
                <FontAwesomeIcon icon={copiedCode ? faCheck : faCopy} />
              </button>
            </div>
          </div>
          <div className="success-meta">
            <span>Role: {data.role === 'admin' ? 'Admin' : data.role === 'superadmin' ? 'Superadmin' : 'Viewer'}</span>
            <span>Expires: {new Date(data.expires_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="success-modal-footer">
          <button className="s-modal-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const DeleteModal = ({ isOpen, user, onConfirm, onCancel }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="s-modal-overlay">
      <div className="s-modal" onClick={e => e.stopPropagation()}>
        <div className="s-modal-icon">
          <FontAwesomeIcon icon={faTrash} />
        </div>
        <h3 className="s-modal-title">Delete User</h3>
        <p className="s-modal-body">
          Are you sure you want to delete <strong>{user.full_name}</strong> ({user.username})?
          This action cannot be undone.
        </p>
        <div className="s-modal-actions">
          <button className="s-modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="s-modal-confirm" onClick={onConfirm}>Delete User</button>
        </div>
      </div>
    </div>
  );
};

const ROLE_META = {
  superadmin: { icon: faCrown,     color: '#f59e0b', bg: '#f59e0b18', label: 'Superadmin' },
  admin:      { icon: faShieldAlt, color: '#8b5cf6', bg: '#8b5cf618', label: 'Admin'      },
  viewer:     { icon: faEye,       color: '#0ea5e9', bg: '#0ea5e918', label: 'Viewer'     },
};

function initials(u) {
  const name = u.full_name || u.username || '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const UserCard = ({ user: u, currentUser, onRoleChange, onDelete }) => {
  const meta  = ROLE_META[u.role] || ROLE_META.viewer;
  const isSelf = u.id === currentUser.id;
  const canEdit   = currentUser.is_superuser && !isSelf;
  const canDelete = currentUser.is_superuser && !isSelf;

  return (
    <div className={`um-card ${isSelf ? 'um-card-self' : ''}`}>
      <div className="um-card-top">
        <div className="um-avatar" style={{ background: meta.bg, color: meta.color }}>
          {initials(u)}
        </div>
        <div className="um-card-info">
          <span className="um-name">{u.full_name || u.username}</span>
          <span className="um-username">@{u.username}</span>
        </div>
        {isSelf && <span className="um-you-badge">You</span>}
      </div>

      <div className="um-email">{u.email}</div>

      <div className="um-card-footer">
        <div className="um-role-pill" style={{ background: meta.bg, color: meta.color }}>
          <FontAwesomeIcon icon={meta.icon} />
          {canEdit ? (
            <select
              className="um-role-select"
              value={u.role}
              style={{ color: meta.color }}
              onChange={e => onRoleChange(u.id, e.target.value)}
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          ) : (
            <span>{meta.label}</span>
          )}
        </div>
        {canDelete && (
          <button className="um-delete-btn" onClick={() => onDelete(u)} title="Delete user">
            <FontAwesomeIcon icon={faTrash} />
          </button>
        )}
      </div>
    </div>
  );
};

const Settings = ({ user }) => {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('settingsActiveTab') || 'api';
    }
    return 'api';
  });
  const [saveState, setSaveState] = useState('idle');
  const [loading, setLoading] = useState(true);
  const [systemOnline, setSystemOnline] = useState(true);
  const systemOnlineRef = useRef(true);
  const setSystemOnlineBoth = (val) => {
    systemOnlineRef.current = val;
    setSystemOnline(val);
  };
  const [systemToggling, setSystemToggling]       = useState(false);
  const [systemPowerStatus, setSystemPowerStatus] = useState('idle');
  const [systemPowerMessage, setSystemPowerMessage] = useState('');
  const [sdmOpen, setSdmOpen]           = useState(false);
  const [sdmPhase, setSdmPhase]         = useState('running'); // 'running' | 'done'
  const [sdmDevices, setSdmDevices]     = useState([]);
  const [sdmOffline, setSdmOffline]     = useState(0);
  const [sdmShutting, setSdmShutting]   = useState(true);
  const sdmTimer = useRef(null);
  const [otpTarget, setOtpTarget] = useState({ full_name: '', username: '', email: '', role: 'viewer' });
  const [otpResult, setOtpResult] = useState({ code: '', expires_at: '', target_full_name: '', target_role: 'viewer' });
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  // User management state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState({ username: '', code: '', full_name: '', role: '', expires_at: '' });

  const [api, setApi] = useState({ api_endpoint: '', api_key: '', poll_interval: 30 });
  const [device, setDevice] = useState({ default_location: '', device_timeout: 60, temperature_unit: 'Celsius', auto_reconnect: true });
  const [notif, setNotif] = useState({ alert_email: '', low_threshold: 20, email_alerts: true, sms_alerts: false, push_alerts: true });
  const [power, setPower] = useState([]);

  const fetchPower = () => {
    if (systemOnlineRef.current === false) return;
    fetch(`${API}/power/`).then(r => r.json()).then(setPower).catch(console.error);
  };

  const fetchUsers = useCallback(async () => {
    if (!user?.is_staff && !user?.is_superuser) return;
    setUsersLoading(true);
    try {
      const res = await fetch(`${ACCOUNTS_API}/users/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester: user.username }),
      });
      const data = await res.json();
      if (res.ok && data.users) setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/`).then(r => r.json()),
      fetch(`${API}/power/`).then(r => r.json()),
    ]).then(([settings, powerDevices]) => {
      setApi({
        api_endpoint: settings.api_endpoint ?? '',
        api_key: settings.api_key ?? '',
        poll_interval: settings.poll_interval ?? 30,
      });
      setDevice({
        default_location: settings.default_location ?? 'Main Entrance',
        device_timeout: settings.device_timeout ?? 60,
        temperature_unit: settings.temperature_unit ?? 'Celsius',
        auto_reconnect: settings.auto_reconnect ?? true,
      });
      setNotif({
        alert_email: settings.alert_email ?? '',
        low_threshold: settings.low_threshold ?? 20,
        email_alerts: settings.email_alerts ?? true,
        sms_alerts: settings.sms_alerts ?? false,
        push_alerts: settings.push_alerts ?? true,
      });
      setSystemOnlineBoth(settings.system_online ?? true);
      setPower(powerDevices);
    }).catch(console.error)
      .finally(() => setLoading(false));

    // Auto-refresh power status every 15 seconds
    const interval = setInterval(fetchPower, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'access' && (user?.is_staff || user?.is_superuser)) {
      fetchUsers();
    }
  }, [activeTab, user, fetchUsers]);

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('settingsActiveTab', activeTab);
  }, [activeTab]);

  const handleGenerateOtp = async () => {
    setOtpError('');
    setOtpSuccess('');
    setOtpResult({ code: '', expires_at: '', target_full_name: '', target_role: 'viewer' });

    if (!otpTarget.full_name.trim()) {
      setOtpError('Provide the new user full name.');
      return;
    }
    if (!otpTarget.username.trim() && !otpTarget.email.trim()) {
      setOtpError('Provide a username or email for the new user.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch(`${ACCOUNTS_API}/otp/generate/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: otpTarget.full_name,
          username: otpTarget.username,
          email: otpTarget.email,
          role: otpTarget.role,
          requester: user?.username,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Unable to generate OTP.');
        return;
      }
      setOtpResult({
        code: data.otp_code,
        expires_at: data.expires_at,
        target_full_name: data.target_full_name,
        target_role: data.target_role || 'viewer',
      });
      setOtpSuccess('OTP generated. Share this code with the new user.');
      // Instead of showing in modal, open success modal
      setSuccessData({
        username: data.target_username || otpTarget.username || 'N/A',
        code: data.otp_code,
        full_name: data.target_full_name,
        role: data.target_role || 'viewer',
        expires_at: data.expires_at,
      });
      setShowSuccessModal(true);
      setShowInviteModal(false); // Close invite modal
    } catch {
      setOtpError('Network error while generating OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`${ACCOUNTS_API}/users/${userId}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, requester: user?.username }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? {
          ...u,
          role: newRole,
          is_staff: newRole === 'admin' || newRole === 'superadmin',
          is_superuser: newRole === 'superadmin',
        } : u));
      }
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`${ACCOUNTS_API}/users/${userToDelete.id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester: user?.username }),
      });
      if (res.ok) setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setOtpTarget({ full_name: '', username: '', email: '', role: 'viewer' });
    setOtpResult({ code: '', expires_at: '', target_full_name: '', target_role: 'viewer' });
    setOtpError('');
    setOtpSuccess('');
  };

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
    if (!systemOnline) return; // block individual toggles when system is off
    setPower(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    try {
      await fetch(`${API}/power/${id}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, requester: user?.username }),
      });
    } catch {
      setPower(prev => prev.map(d => d.id === id ? { ...d, status: !newStatus } : d));
    }
  };

  const handleSystemPowerToggle = async () => {
    const next = !systemOnline;
    const snapshot = power.map(d => ({ ...d, shutdownDone: false }));
    setSdmShutting(next === false); // shutting down = going offline
    setSdmDevices(snapshot);
    setSdmOffline(0);
    setSdmPhase('running');
    setSdmOpen(true);
    setSystemToggling(true);

    // Animate devices one by one
    let count = 0;
    sdmTimer.current = setInterval(() => {
      count++;
      setSdmDevices(prev => prev.map((d, i) => i < count ? { ...d, shutdownDone: true } : d));
      setSdmOffline(count);
      if (count >= snapshot.length) clearInterval(sdmTimer.current);
    }, 350);

    try {
      const res = await fetch(`${API}/system-power/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_online: next, requester: user?.username }),
      });
      // Wait for animation to finish (at least all devices animated)
      await delay(Math.max(snapshot.length * 350 + 400, 1800));
      clearInterval(sdmTimer.current);
      setSdmDevices(prev => prev.map(d => ({ ...d, shutdownDone: true })));
      setSdmOffline(snapshot.length);

      if (res.ok) {
        setSystemOnlineBoth(next);
        if (!next) setPower(prev => prev.map(d => ({ ...d, status: false })));
        window.dispatchEvent(new CustomEvent('systemOnlineChange', { detail: next }));
        setSdmPhase('done');
        setTimeout(() => setSdmOpen(false), 5000);
      } else {
        const err = await res.json().catch(() => ({}));
        setSdmOpen(false);
        setSystemPowerStatus('error');
        setSystemPowerMessage(err.error || 'Unable to change system power.');
        setTimeout(() => { setSystemPowerStatus('idle'); setSystemPowerMessage(''); }, 4000);
      }
    } catch {
      clearInterval(sdmTimer.current);
      setSdmOpen(false);
      setSystemPowerStatus('error');
      setSystemPowerMessage('Network error. Please try again.');
      setTimeout(() => { setSystemPowerStatus('idle'); setSystemPowerMessage(''); }, 4000);
    } finally {
      setSystemToggling(false);
    }
  };

  const handleSdmDone = () => setSdmOpen(false);

  const grouped = (group) => power.filter(d => d.group === group);

  const canManageUsers = user?.is_staff || user?.is_superuser;

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
          {saveState === 'saving' && <FontAwesomeIcon icon={faSpinner} />}
          {saveState === 'saved' && <FontAwesomeIcon icon={faCheck} />}
          {saveState === 'idle' ? 'Save Changes' : saveState === 'saving' ? 'Saving…' : 'Saved!'}
        </button>
      </div>

      {user?.is_superuser && (
        <div className="s-callout">
          <div>
            <strong>Superadmin shortcut</strong>
            <p>Generate one-time signup tokens in the Access Control tab whenever you invite a new user.</p>
          </div>
          <button type="button" className="s-button s-button-secondary" onClick={() => setActiveTab('access')}>
            Go to Access Control
          </button>
        </div>
      )}

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

          {/* Access Control */}
          {activeTab === 'access' && (
            <div className="s-card">
              <SectionHeader icon={faKey} color="#8b5cf6" title="Access Control" desc="Manage users and generate signup tokens." />

              {!canManageUsers ? (
                <div className="s-alert s-alert-warning">
                  Only admin and superadmin users can manage access control.
                </div>
              ) : (
                <>
                  <div className="um-header">
                    <div className="um-header-left">
                      <span className="um-header-title">Team Members</span>
                      <span className="um-count">{users.length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="um-refresh-btn" onClick={fetchUsers} title="Refresh">
                        <FontAwesomeIcon icon={faSpinner} className={usersLoading ? 'fa-spin' : ''} />
                      </button>
                      {user?.is_superuser && (
                        <button className="um-add-btn" onClick={() => setShowInviteModal(true)}>
                          <FontAwesomeIcon icon={faUserPlus} /> Add User
                        </button>
                      )}
                    </div>
                  </div>

                  {usersLoading ? (
                    <div className="um-loading">
                      <FontAwesomeIcon icon={faSpinner} spin />
                      <span>Loading users…</span>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="um-empty">No users found.</div>
                  ) : (
                    <div className="um-grid">
                      {users.map(u => (
                        <UserCard
                          key={u.id}
                          user={u}
                          currentUser={user}
                          onRoleChange={handleRoleChange}
                          onDelete={handleDeleteUser}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
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
                  <Toggle checked={systemOnline} onChange={handleSystemPowerToggle} disabled={systemToggling || !user?.is_superuser} />
                  {!user?.is_superuser && (
                    <div className="s-system-note" style={{ marginTop: '12px' }}>
                      Only a superadmin may toggle system power.
                    </div>
                  )}
                </div>
              </div>

              {systemPowerStatus === 'error' && (
                <div className="s-status-note error" style={{ marginBottom: '16px' }}>
                  <FontAwesomeIcon icon={faTriangleExclamation} />
                  <span>{systemPowerMessage}</span>
                </div>
              )}

              <div className="s-power-stats">
                {[
                  { label: 'Devices', group: 'devices', color: '#10b981' },
                  { label: 'Sensors', group: 'sensors', color: '#0ea5e9' },
                  { label: 'Boards',  group: 'boards',  color: '#f59e0b' },
                  { label: 'Total',   group: null,       color: '#6366f1' },
                ].map(({ label, group, color }) => {
                  const items = group ? grouped(group) : power;
                  return (
                    <div key={label} className="s-stat-chip" style={{ borderColor: `${color}30` }}>
                      <span className="s-stat-num" style={{ color }}>{items.filter(d => d.status).length}<span className="s-stat-total">/{items.length}</span></span>
                      <span className="s-stat-label">{label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="s-power-groups">
                <PowerGroup title="Connected Devices" color="#10b981" icon={faServer}    items={grouped('devices')} onToggle={handlePowerToggle} systemOnline={systemOnline} />
                <PowerGroup title="Sensors"           color="#0ea5e9" icon={faMicrochip} items={grouped('sensors')} onToggle={handlePowerToggle} systemOnline={systemOnline} />
                <PowerGroup title="Control Boards"    color="#f59e0b" icon={faCircle}    items={grouped('boards')}  onToggle={handlePowerToggle} systemOnline={systemOnline} />
                <PowerGroup title="Other Components"  color="#6366f1" icon={faWifi}      items={grouped('other')}   onToggle={handlePowerToggle} systemOnline={systemOnline} />
              </div>
            </div>
          )}

        </div>
      </div>

      <InviteModal
        isOpen={showInviteModal}
        onClose={closeInviteModal}
        user={user}
        otpTarget={otpTarget}
        setOtpTarget={setOtpTarget}
        otpResult={otpResult}
        otpError={otpError}
        otpSuccess={otpSuccess}
        otpLoading={otpLoading}
        onGenerate={handleGenerateOtp}
      />
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        data={successData}
      />
      <ShutdownModal
        isOpen={sdmOpen}
        isShuttingDown={sdmShutting}
        devices={sdmDevices}
        offlineCount={sdmOffline}
        phase={sdmPhase}
        onDone={handleSdmDone}
      />
      <DeleteModal
        isOpen={showDeleteModal}
        user={userToDelete}
        onConfirm={confirmDelete}
        onCancel={() => { setShowDeleteModal(false); setUserToDelete(null); }}
      />
    </div>
  );
};

export default Settings;
