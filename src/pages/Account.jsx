import React, { useState } from 'react';
import { API_BASE } from '../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faUserTag, faLock, faSignInAlt, faUserPlus } from '@fortawesome/free-solid-svg-icons';

const Account = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isLogin
      ? `${API_BASE}/api/accounts/login/`
      : `${API_BASE}/api/accounts/register/`;
    const body = isLogin
      ? { username: formData.username, password: formData.password }
      : {
          full_name: formData.fullName,
          email: formData.email,
          username: formData.username,
          password: formData.password,
        };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('user', JSON.stringify(data.user));
          alert('Login successful!');
          // Redirect to dashboard or something
        } else {
          alert('Account created successfully! Please login.');
          setIsLogin(true);
        }
      } else {
        alert(data.error || 'Error');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error');
    }
  };

  return (
    <div className="account-page">
      <h1>
        <FontAwesomeIcon icon={faUser} /> Account
      </h1>
      <div className="auth-toggle">
        <button onClick={() => setIsLogin(true)} className={isLogin ? 'active' : ''}>
          <FontAwesomeIcon icon={faSignInAlt} /> Login
        </button>
        <button onClick={() => setIsLogin(false)} className={!isLogin ? 'active' : ''}>
          <FontAwesomeIcon icon={faUserPlus} /> Sign Up
        </button>
      </div>
      <form onSubmit={handleSubmit} className="account-form">
        {!isLogin && (
          <>
            <div className="form-group">
              <label htmlFor="fullName">
                <FontAwesomeIcon icon={faUser} /> Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required={!isLogin}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">
                <FontAwesomeIcon icon={faEnvelope} /> Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required={!isLogin}
              />
            </div>
          </>
        )}
        <div className="form-group">
          <label htmlFor="username">
            <FontAwesomeIcon icon={faUserTag} /> Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">
            <FontAwesomeIcon icon={faLock} /> Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" className="submit-btn">
          <FontAwesomeIcon icon={isLogin ? faSignInAlt : faUserPlus} /> {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
};

export default Account;