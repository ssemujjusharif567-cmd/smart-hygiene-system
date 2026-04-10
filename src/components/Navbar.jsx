import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse, faServer, faBell, faChartLine, faGear,
  faDroplet, faBars, faXmark, faUserShield, faSun, faMoon, faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import './Navbar.css';

const nav = [
  { to: '/',          icon: faHouse,     label: 'Dashboard' },
  { to: '/devices',   icon: faServer,    label: 'Devices'   },
  { to: '/alerts',    icon: faBell,      label: 'Alerts',  badge: true },
  { to: '/analytics', icon: faChartLine, label: 'Analytics' },
  { to: '/settings',  icon: faGear,      label: 'Settings'  },
];

const Navbar = ({ theme, setTheme, alertCount, user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* ── Top bar: brand left, hamburger right ── */}
      <header className="nb-bar">
        {/* Brand — hidden when drawer is open */}
        <div className={`nb-bar-brand ${open ? 'nb-bar-brand-hidden' : ''}`}>
          <div className="nb-bar-brand-icon">
            <FontAwesomeIcon icon={faDroplet} />
          </div>
          <div className="nb-bar-brand-text">
            <span className="nb-bar-brand-name">SmartWash</span>
            <span className="nb-bar-brand-sub">Control Center</span>
          </div>
        </div>

        <div className="nb-bar-right">
          {/* Theme pill — hidden when drawer is open */}
          <div className={`nb-theme-pill ${open ? 'nb-theme-pill-hidden' : ''}`}>
            <button
              type="button"
              className={`nb-theme-pill-btn ${theme === 'default' ? 'nb-theme-pill-active' : ''}`}
              onClick={() => setTheme('default')}
              title="Light"
            >
              <FontAwesomeIcon icon={faSun} />
            </button>
            <button
              type="button"
              className={`nb-theme-pill-btn ${theme === 'black' ? 'nb-theme-pill-active' : ''}`}
              onClick={() => setTheme('black')}
              title="Dark"
            >
              <FontAwesomeIcon icon={faMoon} />
            </button>
          </div>

          <button className="nb-toggle" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
            <FontAwesomeIcon icon={open ? faXmark : faBars} />
          </button>
        </div>
      </header>

      {/* ── Full-screen overlay ── */}
      <div className={`nb-overlay ${open ? 'nb-overlay-show' : ''}`} onClick={close} />

      {/* ── Drawer ── */}
      <div className={`nb-drawer ${open ? 'nb-drawer-open' : ''}`}>

        {/* Brand header */}
        <div className="nb-drawer-brand">
          <div className="nb-drawer-brand-glow" />
          <div className="nb-drawer-brand-icon">
            <FontAwesomeIcon icon={faDroplet} />
          </div>
          <div className="nb-drawer-brand-text">
            <span className="nb-drawer-brand-name">SmartWash</span>
            <span className="nb-drawer-brand-sub">Control Center</span>
          </div>
          <button className="nb-drawer-close" onClick={close} aria-label="Close menu">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="nb-drawer-nav">
          {nav.map(({ to, icon, label, badge }) => {
            const count = badge ? alertCount : 0;
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nb-drawer-link ${isActive ? 'nb-drawer-link-active' : ''}`}
                onClick={close}
              >
                <span className="nb-drawer-link-icon">
                  <FontAwesomeIcon icon={icon} fixedWidth />
                </span>
                <span className="nb-drawer-link-label">{label}</span>
                {count > 0 && <span className="nb-drawer-badge">{count}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Spacer pushes footer down */}
        <div className="nb-drawer-spacer" />

        {/* Theme switcher */}
        <div className="nb-drawer-theme">
          <span className="nb-drawer-theme-label">Appearance</span>
          <div className="nb-drawer-theme-btns">
            <button
              type="button"
              className={`nb-drawer-theme-btn ${theme === 'default' ? 'nb-drawer-theme-active' : ''}`}
              onClick={() => setTheme('default')}
            >
              <FontAwesomeIcon icon={faSun} /><span>Light</span>
            </button>
            <button
              type="button"
              className={`nb-drawer-theme-btn ${theme === 'black' ? 'nb-drawer-theme-active' : ''}`}
              onClick={() => setTheme('black')}
            >
              <FontAwesomeIcon icon={faMoon} /><span>Dark</span>
            </button>
          </div>
        </div>

        {/* User + logout — pinned above bottom tab bar */}
        <div className="nb-drawer-user">
          <div className="nb-drawer-avatar">
            <FontAwesomeIcon icon={faUserShield} />
          </div>
          <div className="nb-drawer-user-info">
            <span className="nb-drawer-user-name">{user?.full_name || user?.username || 'Admin'}</span>
            <span className="nb-drawer-user-role">System Manager</span>
          </div>
          <button className="nb-drawer-logout" onClick={onLogout} title="Sign out">
            <FontAwesomeIcon icon={faRightFromBracket} />
          </button>
        </div>

      </div>

      {/* ── Bottom tab bar ── */}
      <nav className="nb-tabs">
        {nav.map(({ to, icon, label, badge }) => {
          const count = badge ? alertCount : 0;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nb-tab ${isActive ? 'nb-tab-active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <div className={`nb-tab-icon-wrap ${isActive ? 'nb-tab-icon-active' : ''}`}>
                    <FontAwesomeIcon icon={icon} />
                    {count > 0 && !isActive && <span className="nb-tab-dot" />}
                  </div>
                  <span className="nb-tab-label">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};

export default Navbar;
