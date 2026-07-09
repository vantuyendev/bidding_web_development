import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../api';
import CreateAuctionModal from './CreateAuctionModal';

// ── Icons ──────────────────────────────────────────────────
const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);
const ChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 ml-0.5 opacity-60">
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
  </svg>
);

// ── Constant quick links ────────────────────────────────────
const QUICK_LINKS = [
  { label: 'How to Win', href: '#how-to-win', icon: '🏆' },
  { label: 'Upcoming Auctions', href: '/?tab=upcoming', icon: '📅' },
  { label: 'Price Results', href: '/?tab=ended', icon: '📊' },
];

export default function Navbar() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [categories, setCategories] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState(null); // category slug
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef(null);
  const notifyRef = useRef(null);
  const megaMenuRef = useRef(null);
  const megaTimerRef = useRef(null);

  // Scroll detection for glass blur
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch categories for nav
  useEffect(() => {
    fetch(getApiUrl('/api/categories'))
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data.slice(0, 8)); })
      .catch(() => {});
  }, []);

  // Notifications via SSE
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(getApiUrl('/api/notifications'), { credentials: 'include' });
      const data = await res.json();
      if (data.success) setNotifications(data.data);
    } catch (_) {}
  }, [user]);

  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    fetchNotifications();
    const es = new EventSource(getApiUrl('/api/notifications/live'), { withCredentials: true });
    es.addEventListener('notification', (ev) => {
      try {
        const n = JSON.parse(ev.data);
        setNotifications(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev]);
      } catch (_) {}
    });
    es.onerror = () => es.close();
    return () => es.close();
  }, [user, fetchNotifications]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
      if (notifyRef.current && !notifyRef.current.contains(e.target)) setIsNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Listen for open-post-modal event
  useEffect(() => {
    const h = () => setIsPostModalOpen(true);
    window.addEventListener('open-post-modal', h);
    return () => window.removeEventListener('open-post-modal', h);
  }, []);

  const hasUnread = notifications.some(n => !n.isRead);

  const handleMarkAllAsRead = async () => {
    await fetch(getApiUrl('/api/notifications/read'), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), credentials: 'include',
    });
    fetchNotifications();
  };

  const handleMarkAsRead = async (id) => {
    await fetch(getApiUrl('/api/notifications/read'), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }), credentials: 'include',
    });
    fetchNotifications();
  };

  const handleVerifySeller = async () => {
    setVerifyLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/users/verify-seller'), { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) await refreshUser();
    } finally { setVerifyLoading(false); }
  };

  const openMegaMenu = (slug) => {
    clearTimeout(megaTimerRef.current);
    setActiveMegaMenu(slug);
  };

  const closeMegaMenu = () => {
    megaTimerRef.current = setTimeout(() => setActiveMegaMenu(null), 120);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const formatTime = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('vi-VN') + ' ' + dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* ── Main Navbar ────────────────────────────────────── */}
      <nav
        id="main-navbar"
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          background: isScrolled ? 'hsla(0,0%,100%,0.95)' : 'white',
          backdropFilter: isScrolled ? 'blur(16px)' : 'none',
          borderBottom: '1px solid hsl(0,0%,89%)',
          boxShadow: isScrolled ? '0 1px 8px hsla(0,0%,0%,0.08)' : 'none',
        }}
      >
        {/* ── Top Bar ── */}
        <div
          className="flex items-center justify-between gap-4 px-5"
          style={{ height: 56, maxWidth: 1240, margin: '0 auto' }}
        >
          {/* Logo */}
          <Link
            to="/"
            id="navbar-logo"
            className="flex-shrink-0 flex items-center gap-1.5"
            style={{ textDecoration: 'none' }}
          >
            <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
              <rect width="28" height="28" rx="6" fill="hsl(196,100%,36%)" />
              <path d="M8 20L14 8l6 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="linejoin" />
              <path d="M10.5 16h7" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 18,
                color: 'hsl(12,14%,11%)',
                letterSpacing: '-0.02em',
              }}
            >
              aura<span style={{ color: 'hsl(196,100%,36%)' }}>bid</span>
            </span>
          </Link>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-xl hidden sm:flex"
            style={{ maxWidth: 480 }}
          >
            <div className="relative w-full">
              <input
                id="navbar-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items and auctioneers"
                aria-label="Search"
                style={{
                  width: '100%',
                  border: '1.5px solid hsl(0,0%,82%)',
                  borderRadius: 20,
                  padding: '7px 42px 7px 16px',
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  background: 'hsl(40,20%,98%)',
                  color: 'hsl(12,14%,11%)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'hsl(196,100%,36%)'; e.target.style.background = 'white'; }}
                onBlur={(e) => { e.target.style.borderColor = 'hsl(0,0%,82%)'; e.target.style.background = 'hsl(40,20%,98%)'; }}
              />
              <button
                type="submit"
                aria-label="Submit search"
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'hsl(12,8%,50%)', display: 'flex', padding: 4,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-3 flex-shrink-0">

            {/* Post Auction Button */}
            <button
              id="navbar-post-btn"
              onClick={() => user ? setIsPostModalOpen(true) : navigate('/login')}
              style={{
                background: 'hsl(196,100%,36%)',
                color: 'white',
                border: 'none',
                borderRadius: 20,
                padding: '7px 16px',
                fontSize: 12,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: 'background 0.2s, transform 0.1s',
                whiteSpace: 'nowrap',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'hsl(196,100%,28%)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'hsl(196,100%,36%)'; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
            >
              + Post Auction
            </button>

            {user && (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifyRef}>
                  <button
                    id="navbar-notifications-btn"
                    onClick={() => { setIsNotificationsOpen(s => !s); fetchNotifications(); }}
                    aria-label="Notifications"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      position: 'relative', color: 'hsl(12,8%,40%)', padding: 6,
                      borderRadius: '50%', transition: 'background 0.15s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'hsl(40,20%,95%)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    <BellIcon />
                    {hasUnread && (
                      <span
                        aria-label="Unread notifications"
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 8, height: 8, borderRadius: '50%',
                          background: 'hsl(3,83%,60%)',
                          border: '2px solid white',
                        }}
                      />
                    )}
                  </button>

                  {/* Notifications dropdown */}
                  <div
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      width: 320, background: 'white',
                      border: '1px solid hsl(0,0%,89%)',
                      borderRadius: 8, boxShadow: '0 8px 32px hsla(0,0%,0%,0.12)',
                      zIndex: 200, padding: '12px 0',
                      transition: 'opacity 0.2s, transform 0.2s',
                      opacity: isNotificationsOpen ? 1 : 0,
                      transform: isNotificationsOpen ? 'translateY(0)' : 'translateY(-8px)',
                      pointerEvents: isNotificationsOpen ? 'auto' : 'none',
                    }}
                  >
                    <div style={{ padding: '0 14px 10px', borderBottom: '1px solid hsl(0,0%,93%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(12,14%,11%)' }}>
                        Notifications ({notifications.filter(n => !n.isRead).length})
                      </span>
                      <button onClick={handleMarkAllAsRead} style={{ fontSize: 10, color: 'hsl(196,100%,36%)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        Mark all read
                      </button>
                    </div>
                    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px 14px', textAlign: 'center', color: 'hsl(12,8%,60%)', fontSize: 12 }}>
                          No notifications yet.
                        </div>
                      ) : notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id)}
                          style={{
                            padding: '10px 14px', cursor: 'pointer',
                            borderLeft: !n.isRead ? '3px solid hsl(196,100%,36%)' : '3px solid transparent',
                            background: !n.isRead ? 'hsl(196,100%,97%)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'hsl(40,20%,97%)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = !n.isRead ? 'hsl(196,100%,97%)' : 'transparent'; }}
                        >
                          <div style={{ fontSize: 12, fontWeight: n.isRead ? 500 : 700, color: 'hsl(12,14%,11%)' }}>{n.title}</div>
                          <div style={{ fontSize: 11, color: 'hsl(12,8%,50%)', marginTop: 2 }}>{n.message}</div>
                          <div style={{ fontSize: 10, color: 'hsl(12,8%,65%)', marginTop: 4 }}>{formatTime(n.createdAt)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    id="navbar-user-menu-btn"
                    onClick={() => setIsDropdownOpen(s => !s)}
                    aria-label="User menu"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      background: 'none', border: 'none', padding: 0,
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'hsl(196,100%,36%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: 13,
                      fontFamily: 'var(--font-display)',
                      flexShrink: 0,
                    }}>
                      {(user.name || user.email || '?')[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(12,14%,11%)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name || user.email}
                    </span>
                    <ChevronDown />
                  </button>

                  {/* User Menu Dropdown */}
                  <div
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      width: 240, background: 'white',
                      border: '1px solid hsl(0,0%,89%)', borderRadius: 8,
                      boxShadow: '0 8px 32px hsla(0,0%,0%,0.12)',
                      zIndex: 200, overflow: 'hidden',
                      transition: 'opacity 0.2s, transform 0.2s',
                      opacity: isDropdownOpen ? 1 : 0,
                      transform: isDropdownOpen ? 'translateY(0)' : 'translateY(-8px)',
                      pointerEvents: isDropdownOpen ? 'auto' : 'none',
                    }}
                  >
                    {/* User info header */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid hsl(0,0%,93%)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'hsl(12,14%,11%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.name || 'Anonymous'}
                      </div>
                      <div style={{ fontSize: 11, color: 'hsl(12,8%,55%)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </div>
                      {user.isVerifiedSeller && (
                        <span style={{ fontSize: 10, color: 'hsl(152,72%,40%)', fontWeight: 700, marginTop: 4, display: 'block' }}>✓ Verified Seller</span>
                      )}
                    </div>

                    {/* Balance */}
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid hsl(0,0%,93%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'hsl(12,8%,55%)' }}>Wallet balance</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'hsl(12,14%,11%)', fontFamily: 'var(--font-display)' }}>
                        {Number(user.balance ?? 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    {/* Nav links */}
                    {[
                      { label: 'My Auctions', to: '/profile?tab=auctions' },
                      { label: 'Won Items', to: '/profile?tab=won' },
                      { label: 'Watchlist', to: '/profile?tab=watchlist' },
                      { label: 'Profile & Settings', to: '/profile' },
                    ].map(({ label, to }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setIsDropdownOpen(false)}
                        style={{
                          display: 'block', padding: '9px 16px', fontSize: 12, fontWeight: 500,
                          color: 'hsl(12,14%,11%)', textDecoration: 'none',
                          transition: 'background 0.1s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'hsl(40,20%,97%)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = ''; }}
                      >
                        {label}
                      </Link>
                    ))}

                    {!user.isVerifiedSeller && (
                      <button
                        onClick={handleVerifySeller}
                        disabled={verifyLoading}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '9px 16px', fontSize: 12, fontWeight: 600,
                          color: 'hsl(196,100%,36%)', background: 'none', border: 'none',
                          cursor: verifyLoading ? 'not-allowed' : 'pointer',
                          borderTop: '1px solid hsl(0,0%,93%)',
                          opacity: verifyLoading ? 0.6 : 1,
                        }}
                      >
                        {verifyLoading ? 'Verifying…' : '⚡ Become a Seller'}
                      </button>
                    )}

                    <button
                      id="navbar-logout-btn"
                      onClick={async () => { await logout(); setIsDropdownOpen(false); navigate('/'); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '9px 16px', fontSize: 12, fontWeight: 600,
                        color: 'hsl(3,83%,60%)', background: 'none', border: 'none',
                        cursor: 'pointer', borderTop: '1px solid hsl(0,0%,93%)',
                      }}
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}

            {!user && (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  style={{ fontSize: 13, fontWeight: 600, color: 'hsl(12,14%,11%)', textDecoration: 'none' }}
                  onMouseOver={(e) => { e.currentTarget.style.color = 'hsl(196,100%,36%)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = 'hsl(12,14%,11%)'; }}
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  style={{
                    fontSize: 13, fontWeight: 700, color: 'hsl(196,100%,36%)',
                    border: '1.5px solid hsl(196,100%,36%)', borderRadius: 20,
                    padding: '5px 14px', textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'hsl(196,100%,36%)'; e.currentTarget.style.color = 'white'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'hsl(196,100%,36%)'; }}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Category Tab Bar ── */}
        <div
          style={{
            borderTop: '1px solid hsl(0,0%,93%)',
            background: 'white',
            position: 'relative',
          }}
        >
          <div
            style={{
              maxWidth: 1240, margin: '0 auto', padding: '0 20px',
              display: 'flex', alignItems: 'center', gap: 0,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {/* All Items tab */}
            <Link
              to="/products"
              id="nav-tab-all"
              className="cat-nav-tab"
              style={{ borderBottomColor: location.pathname === '/products' && !location.search ? 'hsl(196,100%,36%)' : 'transparent' }}
            >
              All
            </Link>

            {/* Dynamic category tabs */}
            {categories.map(cat => (
              <div
                key={cat.id}
                style={{ position: 'relative' }}
                onMouseEnter={() => openMegaMenu(cat.slug)}
                onMouseLeave={closeMegaMenu}
              >
                <Link
                  to={`/products?category=${cat.slug}`}
                  id={`nav-tab-${cat.slug}`}
                  className={`cat-nav-tab ${activeMegaMenu === cat.slug ? 'active' : ''}`}
                >
                  {cat.name}
                  <ChevronDown />
                </Link>
              </div>
            ))}

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: 'hsl(0,0%,89%)', margin: '0 8px', flexShrink: 0 }} />

            {/* Quick links */}
            {QUICK_LINKS.map(lk => (
              <Link
                key={lk.href}
                to={lk.href}
                id={`nav-quick-${lk.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="cat-nav-tab"
                style={{ fontSize: 12, color: 'hsl(12,8%,45%)' }}
              >
                {lk.label}
              </Link>
            ))}
          </div>

          {/* Mega Menu */}
          {activeMegaMenu && (
            <div
              ref={megaMenuRef}
              className="mega-menu visible-menu"
              onMouseEnter={() => clearTimeout(megaTimerRef.current)}
              onMouseLeave={closeMegaMenu}
            >
              <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 20px' }}>
                {(() => {
                  const cat = categories.find(c => c.slug === activeMegaMenu);
                  if (!cat) return null;
                  return (
                    <div className="flex gap-8">
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(12,8%,55%)', marginBottom: 10 }}>
                          {cat.name}
                        </div>
                        <div className="flex flex-col gap-1">
                          {['All', 'Active Auctions', 'Ending Soon', 'Recently Sold'].map(sub => {
                            const status = sub === 'Active Auctions' ? 'active' : sub === 'Ending Soon' ? 'active' : sub === 'Recently Sold' ? 'ended' : '';
                            const sort = sub === 'Ending Soon' ? 'ending' : '';
                            const params = new URLSearchParams();
                            params.set('category', cat.slug);
                            if (status) params.set('status', status);
                            if (sort) params.set('sort', sort);
                            return (
                              <Link
                                key={sub}
                                to={`/products?${params.toString()}`}
                                onClick={() => setActiveMegaMenu(null)}
                                style={{
                                  fontSize: 13, color: 'hsl(12,14%,11%)', textDecoration: 'none',
                                  padding: '4px 0', fontWeight: 400, transition: 'color 0.15s',
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.color = 'hsl(196,100%,36%)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.color = 'hsl(12,14%,11%)'; }}
                              >
                                {sub}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer for fixed nav (top bar 56px + category bar ~42px) */}
      <div style={{ height: 98 }} />

      <CreateAuctionModal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} />
    </>
  );
}
