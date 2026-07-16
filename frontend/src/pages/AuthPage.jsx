import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ─── Pure visual scene — no data needed ─── */
function AuctionScene() {
  return (
    <div className="av-scene">
      {/* Rotating orbit rings */}
      <div className="av-orbit av-orbit-1" />
      <div className="av-orbit av-orbit-2" />
      <div className="av-orbit av-orbit-3" />

      {/* Central glow core */}
      <div className="av-core">
        <div className="av-core-ring" />
        <div className="av-core-inner">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      {/* Floating item cards */}
      <div className="av-card av-card-1">
        <span className="av-card-emoji">⌚</span>
        <div className="av-card-shine" />
      </div>
      <div className="av-card av-card-2">
        <span className="av-card-emoji">🏎️</span>
        <div className="av-card-shine" />
      </div>
      <div className="av-card av-card-3">
        <span className="av-card-emoji">💎</span>
        <div className="av-card-shine" />
      </div>
      <div className="av-card av-card-4">
        <span className="av-card-emoji">🖼️</span>
        <div className="av-card-shine" />
      </div>
      <div className="av-card av-card-5">
        <span className="av-card-emoji">👜</span>
        <div className="av-card-shine" />
      </div>
      <div className="av-card av-card-6">
        <span className="av-card-emoji">🍷</span>
        <div className="av-card-shine" />
      </div>

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className={`av-particle av-particle-${i + 1}`} />
      ))}
    </div>
  );
}

export default function AuthPage({ defaultMode = 'login' }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(email, password);
      } else {
        result = await register(email, password);
      }

      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', fontFamily: 'var(--font-sans)' }}>

      {/* ── Left Panel: Brand Hero ── */}
      <div className="auth-hero" aria-hidden="true">
        {/* Decorative orbs */}
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        <div className="auth-hero-content">
          {/* Logo */}
          <Link to="/" className="auth-brand-link">
            <div className="auth-logo-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="auth-logo-text">AuraBid</span>
          </Link>

          {/* Pure visual animation */}
          <AuctionScene />
        </div>
      </div>

      {/* ── Right Panel: Auth Form ── */}
      <div className="auth-form-panel">
        <div className={`auth-form-wrapper${mounted ? ' auth-form-wrapper--visible' : ''}`}>

          {/* Back link */}
          <Link to="/" className="auth-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Trang chủ
          </Link>

          {/* Mode tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab${mode === 'login' ? ' auth-tab--active' : ''}`}
              onClick={() => mode !== 'login' && switchMode()}
            >
              Đăng nhập
            </button>
            <button
              className={`auth-tab${mode === 'register' ? ' auth-tab--active' : ''}`}
              onClick={() => mode !== 'register' && switchMode()}
            >
              Đăng ký
            </button>
          </div>

          {/* Form heading */}
          <div className="auth-heading">
            <h1 className="auth-form-title">
              {mode === 'login' ? 'Chào mừng trở lại 👋' : 'Tạo tài khoản mới'}
            </h1>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}



          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Email */}
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Địa chỉ Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="auth-input"
              />
            </div>

            {/* Password */}
            <div className="auth-field">
              <label htmlFor="password" className="auth-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth-input"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                <>
                  {mode === 'login' ? 'Đăng Nhập' : 'Đăng Ký Ngay'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="auth-footer-text">
            {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button onClick={switchMode} className="auth-footer-link">
              {mode === 'login' ? 'Đăng ký miễn phí' : 'Đăng nhập'}
            </button>
          </p>

          <p className="auth-legal">
            Bằng cách tiếp tục, bạn đồng ý với{' '}
            <a href="#" className="auth-legal-link">Điều khoản dịch vụ</a>
            {' '}và{' '}
            <a href="#" className="auth-legal-link">Chính sách bảo mật</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
