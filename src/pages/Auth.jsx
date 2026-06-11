import React, { useState, useRef } from 'react';
import { API_BASE } from '../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDroplet, faUser, faEnvelope, faLock, faEye, faEyeSlash,
  faArrowRight, faSpinner, faShield, faUserPlus,
  faCircleCheck, faCircleXmark, faCircleExclamation,
} from '@fortawesome/free-solid-svg-icons';

const API = `${API_BASE}/api/accounts`;

/* Simple email format check on the client side */
const isValidEmailFormat = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/* Status icon helper */
const StatusIcon = ({ status }) => {
  if (status === 'ok')      return <FontAwesomeIcon icon={faCircleCheck}       className="auth-field-status ok"      />;
  if (status === 'error')   return <FontAwesomeIcon icon={faCircleXmark}       className="auth-field-status error"   />;
  if (status === 'loading') return <FontAwesomeIcon icon={faSpinner} spin      className="auth-field-status loading" />;
  if (status === 'warn')    return <FontAwesomeIcon icon={faCircleExclamation} className="auth-field-status warn"    />;
  return null;
};

const Auth = ({ onAuth }) => {
  const [mode, setMode]         = useState('login');
  const [showPw, setShowPw]     = useState(false);
  const [showCpw, setShowCpw]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');
  const [form, setForm]         = useState({ fullName: '', email: '', username: '', password: '', confirmPassword: '', otpCode: '' });

  /* Per-field feedback: { status: 'ok'|'error'|'loading'|'warn'|null, msg: '' } */
  const [fb, setFb] = useState({ email: {}, username: {}, confirmPassword: {} });
  const [inviteInfo, setInviteInfo] = useState(null);

  const debounceRef = useRef({});

  const setFbField = (field, val) => setFb(f => ({ ...f, [field]: val }));

  const set = (k) => (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, [k]: val }));
    setError('');
    setMessage('');

    if (mode === 'register' || mode === 'reset') {
      if (k === 'username' && mode === 'register') {
        if (!val.trim()) { setFbField('username', {}); return; }
        setFbField('username', { status: 'loading' });
        clearTimeout(debounceRef.current.username);
        debounceRef.current.username = setTimeout(async () => {
          try {
            const r = await fetch(`${API}/check/?username=${encodeURIComponent(val)}`);
            const d = await r.json();
            if (d.username_taken) setFbField('username', { status: 'error', msg: 'Username is already taken' });
            else                  setFbField('username', { status: 'ok',    msg: 'Username is available' });
          } catch { setFbField('username', {}); }
        }, 500);
      }

      if (k === 'email' && mode === 'register') {
        if (!val.trim()) { setFbField('email', {}); return; }
        if (!isValidEmailFormat(val)) {
          setFbField('email', { status: 'error', msg: 'Enter a valid email address' });
          return;
        }
        setFbField('email', { status: 'loading' });
        clearTimeout(debounceRef.current.email);
        debounceRef.current.email = setTimeout(async () => {
          try {
            const r = await fetch(`${API}/check/?email=${encodeURIComponent(val)}`);
            const d = await r.json();
            if (!d.email_valid)  setFbField('email', { status: 'error', msg: 'Enter a valid email address' });
            else if (d.email_taken) setFbField('email', { status: 'error', msg: 'Email is already registered' });
            else                 setFbField('email', { status: 'ok',    msg: 'Email is available' });
          } catch { setFbField('email', {}); }
        }, 500);
      }

      if (k === 'confirmPassword' || k === 'password') {
        const pw  = k === 'password'        ? val : form.password;
        const cpw = k === 'confirmPassword' ? val : form.confirmPassword;
        if (!cpw) { setFbField('confirmPassword', {}); return; }
        if (pw === cpw) setFbField('confirmPassword', { status: 'ok',   msg: 'Passwords match' });
        else            setFbField('confirmPassword', { status: 'error', msg: 'Passwords do not match' });
      }
    }
  };

  const canSubmit = () => {
    if (mode === 'login') return form.username.trim() && form.password;
    if (mode === 'register') {
      if (!inviteInfo) return form.username.trim() && form.otpCode.trim();
      return form.password && form.confirmPassword && fb.confirmPassword?.status === 'ok';
    }
    return (
      form.username.trim() &&
      form.password &&
      form.otpCode.trim() &&
      fb.confirmPassword?.status === 'ok'
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit()) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      let endpoint;
      let body;
      if (mode === 'login') {
        endpoint = 'login';
        body = { username: form.username, password: form.password };
      } else if (mode === 'register') {
        if (!inviteInfo) {
          endpoint = 'otp/verify';
          body = {
            username: form.username,
            otp_code: form.otpCode,
          };
        } else {
          endpoint = 'register';
          body = {
            username: form.username,
            password: form.password,
            otp_code: form.otpCode,
          };
        }
      } else {
        endpoint = 'otp/reset';
        body = { username: form.username, otp_code: form.otpCode, new_password: form.password };
      }

      const res  = await fetch(`${API}/${endpoint}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      if (mode === 'login') {
        onAuth(data.user);
      } else if (mode === 'register') {
        if (!inviteInfo) {
          setInviteInfo({
            username: data.username,
            email: data.target_email,
            full_name: data.target_full_name,
            role: data.target_role,
          });
          setMessage('Invite confirmed. Please choose a password to complete signup.');
        } else {
          onAuth(data.user);
        }
      } else {
        setMessage(data.message || 'Password reset successfully. Please sign in.');
        switchMode('login');
      }
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setMessage('');
    setInviteInfo(null);
    setFb({ email: {}, username: {}, confirmPassword: {} });
    setForm({ fullName: '', email: '', username: '', password: '', confirmPassword: '', otpCode: '' });
  };

  return (
    <div className="auth-page">

      {/* ── Left panel (desktop only) ── */}
      <div className="auth-left">
        <div className="auth-left-glow" />
        <div className="auth-brand">
          <div className="auth-brand-icon"><FontAwesomeIcon icon={faDroplet} /></div>
          <div>
            <span className="auth-brand-name">SmartWash</span>
            <span className="auth-brand-sub">Hygiene Intelligence Platform</span>
          </div>
        </div>
        <div className="auth-left-body">
          <div className="auth-left-eyebrow">
            <span className="auth-left-eyebrow-dot" />
            IoT Hygiene Monitoring
          </div>
          <h1 className="auth-left-title">
            Monitor your hygiene system <span>in real time</span>
          </h1>
          <p className="auth-left-desc">Track every device, sensor, alert and usage trend from one unified dashboard — built for this system.</p>
          <div className="auth-features">
            {[
              'Live sensor readings & device status',
              'Remote device control & power management',
              'Smart alert system with severity levels',
              'Analytics, reports & usage trends',
            ].map(f => (
              <div key={f} className="auth-feature-item">
                <span className="auth-feature-check">✓</span>{f}
              </div>
            ))}
          </div>
          <div className="auth-left-stats">
            <div className="auth-stat"><span className="auth-stat-num">10+</span><span className="auth-stat-label">Devices</span></div>
            <div className="auth-stat"><span className="auth-stat-num">24/7</span><span className="auth-stat-label">Monitoring</span></div>
            <div className="auth-stat"><span className="auth-stat-num">Live</span><span className="auth-stat-label">Data</span></div>
          </div>
        </div>
        <div className="auth-left-footer">Secure · Real-time · Intelligent</div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-card">

          {/* Mobile-only header — mirrors left panel */}
          <div className="auth-mobile-header">
            <div className="auth-brand">
              <div className="auth-brand-icon"><FontAwesomeIcon icon={faDroplet} /></div>
              <div>
                <span className="auth-brand-name">SmartWash</span>
                <span className="auth-brand-sub">Hygiene Intelligence Platform</span>
              </div>
            </div>
            <div className="auth-mobile-eyebrow">
              <span className="auth-left-eyebrow-dot" />
              IoT Hygiene Monitoring
            </div>
            <h1 className="auth-mobile-title">
              Monitor your hygiene system <span>in real time</span>
            </h1>
            <p className="auth-mobile-desc">Track every device, sensor, alert and usage trend from one unified dashboard — built for this system.</p>
            <div className="auth-mobile-features">
              {[
                'Live sensor readings & device status',
                'Remote device control & power management',
                'Smart alert system with severity levels',
                'Analytics, reports & usage trends',
              ].map(f => (
                <div key={f} className="auth-feature-item">
                  <span className="auth-feature-check">✓</span>{f}
                </div>
              ))}
            </div>
            <div className="auth-mobile-stats">
              <div className="auth-stat"><span className="auth-stat-num">10+</span><span className="auth-stat-label">Devices</span></div>
              <div className="auth-stat"><span className="auth-stat-num">24/7</span><span className="auth-stat-label">Monitoring</span></div>
              <div className="auth-stat"><span className="auth-stat-num">Live</span><span className="auth-stat-label">Data</span></div>
            </div>
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login'    ? 'auth-tab-active' : ''}`} onClick={() => switchMode('login')}>
              <FontAwesomeIcon icon={faShield} /> Sign In
            </button>
            <button className={`auth-tab ${mode === 'register' ? 'auth-tab-active' : ''}`} onClick={() => switchMode('register')}>
              <FontAwesomeIcon icon={faUserPlus} /> Setup Account
            </button>
          </div>

          <div className="auth-card-body">
            <h2 className="auth-card-title">
              {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Set up your account' : 'Reset your password'}
            </h2>
            <p className="auth-card-sub">
              {mode === 'login'
                ? 'Sign in to access the SmartWash dashboard'
                : mode === 'register'
                  ? inviteInfo
                    ? 'Complete your signup by choosing a password.'
                    : 'Create your account using a one-time token from an admin or superadmin.'
                  : 'Use the one-time token from a superadmin to update your password'
              }
            </p>

            {error && (
              <div className="auth-error">
                <FontAwesomeIcon icon={faCircleXmark} /> {error}
              </div>
            )}
            {message && (
              <div className="auth-success">
                <FontAwesomeIcon icon={faCircleCheck} /> {message}
              </div>
            )}

            <form onSubmit={submit} className="auth-form">

              {mode === 'register' && (
              <>
                {!inviteInfo ? (
                  <div className="auth-field auth-invite-note" style={{ gridColumn: '1 / -1' }}>
                    <p>Enter your username and one-time token to load the invitation details assigned by your administrator.</p>
                  </div>
                ) : (
                  <>
                    <div className="auth-field">
                      <label>Invited Full Name</label>
                      <div className="auth-input-wrap">
                        <FontAwesomeIcon icon={faUser} className="auth-input-icon" />
                        <input type="text" value={inviteInfo.full_name} readOnly />
                      </div>
                    </div>
                    <div className="auth-field">
                      <label>Invited Email</label>
                      <div className="auth-input-wrap">
                        <FontAwesomeIcon icon={faEnvelope} className="auth-input-icon" />
                        <input type="email" value={inviteInfo.email} readOnly />
                      </div>
                    </div>
                    <div className="auth-field">
                      <label>Invite Role</label>
                      <div className="auth-input-wrap">
                        <input type="text" value={inviteInfo.role === 'admin' ? 'Admin' : 'Viewer'} readOnly />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

              {/* Username */}
              <div className="auth-field">
                <label>Username</label>
                <div className="auth-input-wrap">
                  <FontAwesomeIcon icon={faUser} className="auth-input-icon" />
                  <input
                    type="text"
                    placeholder="your_username"
                    value={form.username}
                    onChange={set('username')}
                    required
                    autoComplete="username"
                    className={mode === 'register' && fb.username?.status === 'error' ? 'input-invalid' : mode === 'register' && fb.username?.status === 'ok' ? 'input-valid' : ''}
                  />
                  {mode === 'register' && <StatusIcon status={fb.username?.status} />}
                </div>
                {mode === 'register' && fb.username?.msg && (
                  <span className={`auth-field-msg ${fb.username.status}`}>{fb.username.msg}</span>
                )}
              </div>

              {mode === 'reset' && (
                <div className="auth-field">
                  <label>One-time token</label>
                  <div className="auth-input-wrap">
                    <FontAwesomeIcon icon={faLock} className="auth-input-icon" />
                    <input
                      type="text"
                      placeholder="Enter OTP code"
                      value={form.otpCode}
                      onChange={set('otpCode')}
                      required
                      autoComplete="one-time-code"
                    />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'reset' || inviteInfo) && (
                <div className="auth-field">
                  <label>Password</label>
                  <div className="auth-input-wrap">
                    <FontAwesomeIcon icon={faLock} className="auth-input-icon" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={set('password')}
                      required={Boolean(inviteInfo) || mode === 'login'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                      <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password — register only */}
              {mode === 'register' && (
                <>
                  <div className="auth-field">
                    <label>One-time token</label>
                    <div className="auth-input-wrap">
                      <FontAwesomeIcon icon={faLock} className="auth-input-icon" />
                      <input
                        type="text"
                        placeholder="Enter OTP from admin"
                        value={form.otpCode}
                        onChange={set('otpCode')}
                        required
                        autoComplete="one-time-code"
                        readOnly={Boolean(inviteInfo)}
                      />
                    </div>
                  </div>

                  {inviteInfo && (
                    <div className="auth-field">
                      <label>Confirm Password</label>
                      <div className="auth-input-wrap">
                        <FontAwesomeIcon icon={faLock} className="auth-input-icon" />
                        <input
                          type={showCpw ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={form.confirmPassword}
                          onChange={set('confirmPassword')}
                          required
                          autoComplete="new-password"
                          className={fb.confirmPassword?.status === 'error' ? 'input-invalid' : fb.confirmPassword?.status === 'ok' ? 'input-valid' : ''}
                        />
                        <button type="button" className="auth-pw-toggle" onClick={() => setShowCpw(v => !v)} tabIndex={-1}>
                          <FontAwesomeIcon icon={showCpw ? faEyeSlash : faEye} />
                        </button>
                        <StatusIcon status={fb.confirmPassword?.status} />
                      </div>
                      {fb.confirmPassword?.msg && (
                        <span className={`auth-field-msg ${fb.confirmPassword.status}`}>{fb.confirmPassword.msg}</span>
                      )}
                    </div>
                  )}
                </>
              )}

              <button type="submit" className="auth-submit" disabled={loading || !canSubmit()}>
                {loading
                  ? <><FontAwesomeIcon icon={faSpinner} spin /> {mode === 'login' ? 'Signing in…' : mode === 'register' ? 'Setting up…' : 'Resetting…'}</>
                  : <>{mode === 'login' ? 'Sign In to Dashboard' : mode === 'register' ? (inviteInfo ? 'Complete Signup' : 'Verify Invitation') : 'Reset Password'} <FontAwesomeIcon icon={faArrowRight} /></>
                }
              </button>
            </form>

            {mode === 'login' && (
              <p className="auth-switch">
                Forgot password?{' '}
                <button type="button" onClick={() => switchMode('reset')}>
                  Reset with OTP
                </button>
              </p>
            )}

            <p className="auth-switch">
              {mode === 'login'
                ? 'First time setup?'
                : mode === 'register'
                  ? 'Already have an account?'
                  : 'Remembered your password?'
              }
              {' '}
              <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Set up account' : 'Sign in instead'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
