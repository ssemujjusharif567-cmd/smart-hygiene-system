import React, { useState, useEffect, useRef } from 'react';
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
  const [form, setForm]         = useState({ fullName: '', email: '', username: '', password: '', confirmPassword: '' });

  /* Per-field feedback: { status: 'ok'|'error'|'loading'|'warn'|null, msg: '' } */
  const [fb, setFb] = useState({ email: {}, username: {}, confirmPassword: {} });

  const debounceRef = useRef({});

  const setFbField = (field, val) => setFb(f => ({ ...f, [field]: val }));

  const set = (k) => (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, [k]: val }));
    setError('');

    if (mode !== 'register') return;

    /* ── Username availability ── */
    if (k === 'username') {
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

    /* ── Email format + availability ── */
    if (k === 'email') {
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

    /* ── Confirm password match ── */
    if (k === 'confirmPassword' || k === 'password') {
      const pw  = k === 'password'        ? val : form.password;
      const cpw = k === 'confirmPassword' ? val : form.confirmPassword;
      if (!cpw) { setFbField('confirmPassword', {}); return; }
      if (pw === cpw) setFbField('confirmPassword', { status: 'ok',   msg: 'Passwords match' });
      else            setFbField('confirmPassword', { status: 'error', msg: 'Passwords do not match' });
    }
  };

  const canSubmit = () => {
    if (mode === 'login') return true;
    return (
      fb.username?.status === 'ok' &&
      fb.email?.status    === 'ok' &&
      fb.confirmPassword?.status === 'ok' &&
      form.fullName.trim() &&
      form.password
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit()) return;
    setLoading(true);
    setError('');
    try {
      const isLogin = mode === 'login';
      const body = isLogin
        ? { username: form.username, password: form.password }
        : { full_name: form.fullName, email: form.email, username: form.username, password: form.password };

      const res  = await fetch(`${API}/${isLogin ? 'login' : 'register'}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      localStorage.setItem('user', JSON.stringify(data.user));
      onAuth(data.user);
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setFb({ email: {}, username: {}, confirmPassword: {} });
    setForm({ fullName: '', email: '', username: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="auth-page">

      {/* ── Left panel ── */}
      <div className="auth-left">
        <div className="auth-left-glow" />
        <div className="auth-brand">
          <div className="auth-brand-icon"><FontAwesomeIcon icon={faDroplet} /></div>
          <div>
            <span className="auth-brand-name">Smart Hygiene System</span>
            <span className="auth-brand-sub">Smart Hygiene System Dashboard</span>
          </div>
        </div>
        <div className="auth-left-body">
          <h1 className="auth-left-title">Monitor your hygiene system in real time</h1>
          <p className="auth-left-desc">Tracks devices, sensors, alerts and analytics from a Smart Hygiene System</p>
          <div className="auth-features">
            {['Live sensor readings', 'Remote device control', 'Smart alert system', 'Analytics & reports'].map(f => (
              <div key={f} className="auth-feature-item">
                <span className="auth-feature-dot" />{f}
              </div>
            ))}
          </div>
        </div>
        <div className="auth-left-footer">Secure · Real-time · Intelligent</div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-card">

          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login'    ? 'auth-tab-active' : ''}`} onClick={() => switchMode('login')}>
              <FontAwesomeIcon icon={faShield} /> Sign In
            </button>
            <button className={`auth-tab ${mode === 'register' ? 'auth-tab-active' : ''}`} onClick={() => switchMode('register')}>
              <FontAwesomeIcon icon={faUserPlus} /> Create Account
            </button>
          </div>

          <div className="auth-card-body">
            <h2 className="auth-card-title">{mode === 'login' ? 'Welcome back' : 'Get started'}</h2>
            <p className="auth-card-sub">{mode === 'login' ? 'Sign in to access your dashboard' : 'Create your SmartWash account'}</p>

            {error && (
              <div className="auth-error">
                <FontAwesomeIcon icon={faCircleXmark} /> {error}
              </div>
            )}

            <form onSubmit={submit} className="auth-form">

              {mode === 'register' && (
                <>
                  {/* Full Name */}
                  <div className="auth-field">
                    <label>Full Name</label>
                    <div className="auth-input-wrap">
                      <FontAwesomeIcon icon={faUser} className="auth-input-icon" />
                      <input type="text" placeholder="John Doe" value={form.fullName} onChange={set('fullName')} required autoComplete="name" />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="auth-field">
                    <label>Email Address</label>
                    <div className="auth-input-wrap">
                      <FontAwesomeIcon icon={faEnvelope} className="auth-input-icon" />
                      <input
                        type="text"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={set('email')}
                        required
                        autoComplete="email"
                        className={fb.email?.status === 'error' ? 'input-invalid' : fb.email?.status === 'ok' ? 'input-valid' : ''}
                      />
                      <StatusIcon status={fb.email?.status} />
                    </div>
                    {fb.email?.msg && (
                      <span className={`auth-field-msg ${fb.email.status}`}>{fb.email.msg}</span>
                    )}
                  </div>
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

              {/* Password */}
              <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-wrap">
                  <FontAwesomeIcon icon={faLock} className="auth-input-icon" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                    <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              {/* Confirm Password — register only */}
              {mode === 'register' && (
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

              <button type="submit" className="auth-submit" disabled={loading || (mode === 'register' && !canSubmit())}>
                {loading
                  ? <><FontAwesomeIcon icon={faSpinner} spin /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                  : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <FontAwesomeIcon icon={faArrowRight} /></>
                }
              </button>
            </form>

            <p className="auth-switch">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
