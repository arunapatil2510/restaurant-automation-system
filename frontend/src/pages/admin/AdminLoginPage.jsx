import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Shield, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLoginPage = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('restoAdmin2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to /admin
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/admin';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      const from = location.state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    } else {
      setError(result.message || 'Invalid credentials.');
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        {/* Header with Shield Icon */}
        <div className="admin-login-header">
          <div className="admin-login-icon-box">
            <Shield size={32} />
          </div>
          <h1 className="admin-login-title">Staff Portal Login</h1>
          <p className="admin-login-subtitle">
            Restricted access for restaurant managers, chefs, and service staff.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="admin-login-alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="admin-login-form" onSubmit={handleSubmit}>
          {/* Username / Email Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="admin-username">
              Username or Email
            </label>
            <div className="input-icon-wrapper">
              <User size={18} className="field-icon" />
              <input
                id="admin-username"
                type="text"
                className="form-input with-icon"
                placeholder="e.g. admin or admin@restosmart.com"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password Field with Show/Hide Toggle */}
          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">
              Admin Passkey / Password
            </label>
            <div className="input-icon-wrapper">
              <Lock size={18} className="field-icon" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input with-icon with-right-action"
                placeholder="Enter your admin passkey"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (
              <>
                Sign In to Dashboard <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demonstration Note */}
        <div className="admin-demo-hint">
          <div className="demo-hint-header">
            <CheckCircle2 size={15} color="var(--primary)" />
            <strong>Demo Credentials for Evaluation</strong>
          </div>
          <p>
            Username: <code>admin</code> • Passkey: <code>restoAdmin2026</code> (or your custom passkey)
          </p>
        </div>

        {/* Back Link to Customer View */}
        <div className="admin-login-footer">
          <Link to="/" className="back-to-customer-link">
            <ArrowLeft size={15} /> Return to Customer Restaurant View
          </Link>
        </div>
      </div>
    </div>
  );
};
