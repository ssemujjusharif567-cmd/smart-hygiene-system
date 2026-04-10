import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse, faServer, faBell, faChartLine, faGear,
  faDroplet, faChevronLeft, faChevronRight, faUserShield, faMoon, faSun, faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';

const nav = [
  { to: '/',          icon: faHouse,     label: 'Dashboard' },
  { to: '/devices',   icon: faServer,    label: 'Devices'   },
  { to: '/alerts',    icon: faBell,      label: 'Alerts',  badge: true },
  { to: '/analytics', icon: faChartLine, label: 'Analytics' },
  { to: '/settings',  icon: faGear,      label: 'Settings'  },
];

const Sidebar = ({ theme, setTheme, alertCount, user, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Keep app-shell data attribute in sync so CSS sibling selector works
  useEffect(() => {
    const shell = document.querySelector('.app-shell');
    if (shell) shell.dataset.collapsed = collapsed ? 'true' : 'false';
  }, [collapsed]);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <FontAwesomeIcon icon={faDroplet} />
        </div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">SmartWash</span>
            <span className="sidebar-logo-sub">Control Center</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {nav.map(({ to, icon, label, badge }) => {
          const count = badge ? alertCount : 0;
          return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          >
            <FontAwesomeIcon icon={icon} className="sidebar-link-icon" fixedWidth />
            {!collapsed && <span className="sidebar-link-label">{label}</span>}
            {!collapsed && count > 0 && <span className="sidebar-badge">{count}</span>}
            {collapsed && count > 0 && <span className="sidebar-badge sidebar-badge-dot" />}
          </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />

      {/* Theme Toggle */}
      <div className="sidebar-theme-toggle">
        {!collapsed && <span className="sidebar-theme-label">Theme</span>}
        <div className="sidebar-theme-buttons">
          <button
            type="button"
            className={`sidebar-theme-btn ${theme === 'default' ? 'active' : ''}`}
            onClick={() => setTheme('default')}
            title="Default Theme"
            style={{ display: collapsed ? 'none' : 'inline-flex' }}
          >
            <FontAwesomeIcon icon={faSun} />
          </button>

          <button
            type="button"
            className={`sidebar-theme-btn ${theme === 'black' ? 'active' : ''}`}
            onClick={() => (collapsed ? setTheme(theme === 'black' ? 'default' : 'black') : setTheme('black'))}
            title={collapsed ? `Toggle theme (currently ${theme})` : 'Black Theme'}
          >
            <FontAwesomeIcon icon={collapsed ? (theme === 'black' ? faSun : faMoon) : faMoon} />
          </button>
        </div>
      </div>
      {/* User */}
      {!collapsed && (
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            <FontAwesomeIcon icon={faUserShield} />
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.full_name || user?.username || 'Admin'}</span>
            <span className="sidebar-user-role">System Manager</span>
          </div>
          <button className="sidebar-logout-btn" onClick={onLogout} title="Sign out">
            <FontAwesomeIcon icon={faRightFromBracket} />
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)}>
        <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
        {!collapsed && <span>Collapse</span>}
      </button>

    </aside>
  );
};

export default Sidebar;
