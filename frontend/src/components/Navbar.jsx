import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../api';
import CreateAuctionModal from './CreateAuctionModal';
import { useTheme } from '../context/ThemeContext';

// ── Biểu tượng ──────────────────────────────────────────────────
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
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

// ── Các liên kết nhanh cố định ────────────────────────────────────
const QUICK_LINKS = [
  { label: 'How to Win', href: '#how-to-win', icon: '🏆' },
  { label: 'Upcoming Auctions', href: '/?tab=upcoming', icon: '📅' },
  { label: 'Price Results', href: '/?tab=ended', icon: '📊' },
];

const CATEGORY_SUBCATEGORIES = {
  'dien-thoai': [
    { label: 'iPhone / Apple', query: 'iPhone' },
    { label: 'Samsung Galaxy', query: 'Samsung' },
    { label: 'Xiaomi & Redmi', query: 'Xiaomi' },
    { label: 'Điện thoại cổ', query: 'Cổ' },
    { label: 'Phụ kiện điện thoại', query: 'Phụ kiện' }
  ],
  'laptop-may-tinh': [
    { label: 'MacBook / Apple', query: 'MacBook' },
    { label: 'Laptop Gaming', query: 'Gaming' },
    { label: 'Laptop Văn phòng', query: 'Văn phòng' },
    { label: 'Linh kiện PC', query: 'Linh kiện' },
    { label: 'Bàn phím cơ', query: 'Bàn phím' }
  ],
  'dong-ho': [
    { label: 'Đồng hồ cơ cổ', query: 'Cổ' },
    { label: 'Đồng hồ thông minh', query: 'Smartwatch' },
    { label: 'Đồng hồ Thụy Sỹ', query: 'Thụy Sỹ' },
    { label: 'Đồng hồ Nhật Bản', query: 'Nhật' },
    { label: 'Đồng hồ treo tường', query: 'Treo tường' }
  ],
  'mo-hinh-anime': [
    { label: 'Action Figures', query: 'Figure' },
    { label: 'Nendoroid / Chibi', query: 'Nendoroid' },
    { label: 'Scale Figures', query: 'Scale' },
    { label: 'Gundam / Gunpla', query: 'Gundam' },
    { label: 'Mô hình 1/6', query: '1/6' }
  ],
  'thiet-bi-am-thanh': [
    { label: 'Tai nghe chụp tai', query: 'Tai nghe' },
    { label: 'Loa Bluetooth', query: 'Loa' },
    { label: 'Micro thu âm', query: 'Micro' },
    { label: 'Amply & DAC', query: 'Amply' },
    { label: 'Loa kiểm âm', query: 'Kiểm âm' }
  ],
  'may-anh': [
    { label: 'Máy ảnh DSLR', query: 'DSLR' },
    { label: 'Máy ảnh Mirrorless', query: 'Mirrorless' },
    { label: 'Ống kính máy ảnh', query: 'Lens' },
    { label: 'Máy ảnh Film cổ', query: 'Film' },
    { label: 'Action Cam / Gimbal', query: 'Action' }
  ],
  'sach-truyen-tranh': [
    { label: 'Manga / Comic', query: 'Manga' },
    { label: 'Sách Văn học', query: 'Văn học' },
    { label: 'Sách Kinh tế', query: 'Kinh tế' },
    { label: 'Sách Ngoại văn', query: 'Ngoại văn' },
    { label: 'Tiểu thuyết lịch sử', query: 'Tiểu thuyết' }
  ],
  'nhac-cu': [
    { label: 'Đàn Guitar', query: 'Guitar' },
    { label: 'Đàn Piano', query: 'Piano' },
    { label: 'Keyboard / Organ', query: 'Organ' },
    { label: 'Trống & Bộ gõ', query: 'Trống' },
    { label: 'Phụ kiện nhạc cụ', query: 'Phụ kiện' }
  ],
  'do-co': [
    { label: 'Gốm sứ cổ', query: 'Gốm' },
    { label: 'Tiền cổ', query: 'Tiền cổ' },
    { label: 'Tranh sơn dầu', query: 'Tranh' },
    { label: 'Đồ gỗ mỹ nghệ', query: 'Gỗ' },
    { label: 'Kỷ vật xưa', query: 'Kỷ vật' }
  ],
  'trang-suc-da-quy': [
    { label: 'Nhẫn kim cương', query: 'Kim cương' },
    { label: 'Vòng tay vàng', query: 'Vàng' },
    { label: 'Đá phong thủy', query: 'Đá' },
    { label: 'Dây chuyền bạc', query: 'Bạc' },
    { label: 'Ngọc trai', query: 'Ngọc trai' }
  ],
  'xe-dap-the-thao': [
    { label: 'Xe đạp địa hình', query: 'Địa hình' },
    { label: 'Xe đạp đua (Road)', query: 'Road' },
    { label: 'Giày chạy bộ', query: 'Giày' },
    { label: 'Vợt cầu lông', query: 'Vợt' },
    { label: 'Phụ kiện thể thao', query: 'Thể thao' }
  ]
};

export default function Navbar() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  // Trạng thái
  const [categories, setCategories] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState(null); // slug danh mục
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMoreCategoriesOpen, setIsMoreCategoriesOpen] = useState(false);

  const dropdownRef = useRef(null);
  const notifyRef = useRef(null);
  const megaMenuRef = useRef(null);
  const megaTimerRef = useRef(null);
  const moreCategoriesRef = useRef(null);
  const moreCategoriesBtnRef = useRef(null);
  const scrollRef = useRef(null);

  // Phát hiện cuộn để làm mờ kính (glass blur)
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cuộn ngang bằng bánh xe chuột trên thanh danh mục
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const fetchCategories = useCallback(() => {
    fetch(getApiUrl('/api/categories'))
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data); })
      .catch(() => {});
  }, []);

  // Lấy danh sách danh mục cho thanh điều hướng
  useEffect(() => {
    fetchCategories();
    window.addEventListener('product-created', fetchCategories);
    return () => window.removeEventListener('product-created', fetchCategories);
  }, [fetchCategories]);

  // Thông báo qua SSE
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

    let es;
    let timer;
    let active = true;

    function connect() {
      if (!active) return;
      es = new EventSource(getApiUrl('/api/notifications/live'), { withCredentials: true });

      es.addEventListener('notification', (ev) => {
        try {
          const n = JSON.parse(ev.data);
          setNotifications(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev]);
        } catch (_) {}
      });

      es.onerror = () => {
        if (active) {
          es.close();
          timer = setTimeout(connect, 5000);
        }
      };
    }

    connect();

    return () => {
      active = false;
      if (es) es.close();
      clearTimeout(timer);
    };
  }, [user, fetchNotifications]);

  // Click ra ngoài để đóng các dropdown
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
      if (notifyRef.current && !notifyRef.current.contains(e.target)) setIsNotificationsOpen(false);
      if (
        moreCategoriesRef.current &&
        !moreCategoriesRef.current.contains(e.target) &&
        (!moreCategoriesBtnRef.current || !moreCategoriesBtnRef.current.contains(e.target))
      ) {
        setIsMoreCategoriesOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lắng nghe sự kiện mở modal đăng tin
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
    megaTimerRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 120);
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
          background: isScrolled ? 'var(--nav-bg-scrolled)' : 'var(--nav-bg-default)',
          backdropFilter: isScrolled ? 'blur(16px)' : 'none',
          borderBottom: '1px solid var(--nav-border)',
          boxShadow: isScrolled ? '0 1px 8px rgba(0,0,0,0.1)' : 'none',
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
                color: 'var(--nav-text-primary)',
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
                  border: '1.5px solid var(--nav-border)',
                  borderRadius: 20,
                  padding: '7px 42px 7px 16px',
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  background: 'var(--nav-bg-input)',
                  color: 'var(--nav-text-primary)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--brand-primary)'; e.target.style.background = 'var(--nav-bg-default)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--nav-border)'; e.target.style.background = 'var(--nav-bg-input)'; }}
              />
              <button
                type="submit"
                aria-label="Submit search"
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--nav-text-muted)', display: 'flex', padding: 4,
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

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--nav-text-secondary)', padding: 6,
                borderRadius: '50%', transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--nav-bg-hover)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
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
                      position: 'relative', color: 'var(--nav-text-secondary)', padding: 6,
                      borderRadius: '50%', transition: 'background 0.15s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--nav-bg-hover)'; }}
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
                          border: '2px solid var(--nav-bg-default)',
                        }}
                      />
                    )}
                  </button>

                  {/* Notifications dropdown */}
                  <div
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      width: 320, background: 'var(--nav-bg-default)',
                      border: '1px solid var(--nav-border)',
                      borderRadius: 8, boxShadow: theme === 'dark' ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px hsla(0,0%,0%,0.12)',
                      zIndex: 200, padding: '12px 0',
                      transition: 'opacity 0.2s, transform 0.2s',
                      opacity: isNotificationsOpen ? 1 : 0,
                      transform: isNotificationsOpen ? 'translateY(0)' : 'translateY(-8px)',
                      pointerEvents: isNotificationsOpen ? 'auto' : 'none',
                    }}
                  >
                    <div style={{ padding: '0 14px 10px', borderBottom: '1px solid var(--nav-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--nav-text-primary)' }}>
                        Notifications ({notifications.filter(n => !n.isRead).length})
                      </span>
                      <button onClick={handleMarkAllAsRead} style={{ fontSize: 10, color: 'var(--brand-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        Mark all read
                      </button>
                    </div>
                    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--nav-text-muted)', fontSize: 12 }}>
                          No notifications yet.
                        </div>
                      ) : notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id)}
                          style={{
                            padding: '10px 14px', cursor: 'pointer',
                            borderLeft: !n.isRead ? '3px solid hsl(196,100%,36%)' : '3px solid transparent',
                            background: !n.isRead ? (theme === 'dark' ? 'rgba(0,151,186,0.1)' : 'hsl(196,100%,97%)') : 'transparent',
                            transition: 'background 0.15s',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--nav-bg-hover)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = !n.isRead ? (theme === 'dark' ? 'rgba(0,151,186,0.1)' : 'hsl(196,100%,97%)') : 'transparent'; }}
                        >
                          <div style={{ fontSize: 12, fontWeight: n.isRead ? 500 : 700, color: 'var(--nav-text-primary)' }}>{n.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--nav-text-muted)', marginTop: 2 }}>{n.message}</div>
                          <div style={{ fontSize: 10, color: 'var(--nav-text-muted)', marginTop: 4 }}>{formatTime(n.createdAt)}</div>
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
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--nav-text-primary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name || user.email}
                    </span>
                    <ChevronDown />
                  </button>

                  {/* User Menu Dropdown */}
                  <div
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                      width: 240, background: 'var(--nav-bg-default)',
                      border: '1px solid var(--nav-border)', borderRadius: 8,
                      boxShadow: theme === 'dark' ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px hsla(0,0%,0%,0.12)',
                      zIndex: 200, overflow: 'hidden',
                      transition: 'opacity 0.2s, transform 0.2s',
                      opacity: isDropdownOpen ? 1 : 0,
                      transform: isDropdownOpen ? 'translateY(0)' : 'translateY(-8px)',
                      pointerEvents: isDropdownOpen ? 'auto' : 'none',
                    }}
                  >
                    {/* User info header */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--nav-border-light)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--nav-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.name || 'Anonymous'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--nav-text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </div>
                      {user.isVerifiedSeller && (
                        <span style={{ fontSize: 10, color: 'hsl(152,72%,40%)', fontWeight: 700, marginTop: 4, display: 'block' }}>✓ Verified Seller</span>
                      )}
                    </div>

                    {/* Balance */}
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--nav-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--nav-text-muted)' }}>Wallet balance</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--nav-text-primary)', fontFamily: 'var(--font-display)' }}>
                        {Number(user.walletBalance ?? 0).toLocaleString('vi-VN')} đ
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
                          color: 'var(--nav-text-primary)', textDecoration: 'none',
                          transition: 'background 0.1s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--nav-bg-hover)'; }}
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
                          color: 'var(--brand-primary)', background: 'none', border: 'none',
                          cursor: verifyLoading ? 'not-allowed' : 'pointer',
                          borderTop: '1px solid var(--nav-border-light)',
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
                        cursor: 'pointer', borderTop: '1px solid var(--nav-border-light)',
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
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--nav-text-primary)', textDecoration: 'none' }}
                  onMouseOver={(e) => { e.currentTarget.style.color = 'var(--brand-primary)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = 'var(--nav-text-primary)'; }}
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  style={{
                    fontSize: 13, fontWeight: 700, color: 'var(--brand-primary)',
                    border: '1.5px solid var(--brand-primary)', borderRadius: 20,
                    padding: '5px 14px', textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'var(--brand-primary)'; e.currentTarget.style.color = 'white'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--brand-primary)'; }}
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
            borderTop: '1px solid var(--nav-border-light)',
            background: 'var(--nav-bg-default)',
            position: 'relative',
          }}
        >
          <div
            ref={scrollRef}
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
            {categories.slice(0, 8).map(cat => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                id={`nav-tab-${cat.slug}`}
                className={`cat-nav-tab ${activeMegaMenu === cat.slug ? 'active' : ''}`}
                onMouseEnter={() => openMegaMenu(cat.slug)}
                onMouseLeave={closeMegaMenu}
                onClick={(e) => {
                  if (activeMegaMenu !== cat.slug) {
                    e.preventDefault();
                    openMegaMenu(cat.slug);
                  }
                }}
              >
                {cat.name}
                <ChevronDown />
              </Link>
            ))}

            {/* Dropdown "Xem thêm" button for remaining categories */}
            {categories.length > 8 && (
              <button
                ref={moreCategoriesBtnRef}
                type="button"
                onClick={() => setIsMoreCategoriesOpen(s => !s)}
                className={`cat-nav-tab ${isMoreCategoriesOpen ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
                Xem thêm
                <ChevronDown />
              </button>
            )}

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: 'var(--nav-border)', margin: '0 8px', flexShrink: 0 }} />

            {/* Quick links */}
            {QUICK_LINKS.map(lk => (
              <Link
                key={lk.href}
                to={lk.href}
                id={`nav-quick-${lk.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="cat-nav-tab"
                style={{ fontSize: 12, color: 'var(--nav-text-secondary)' }}
              >
                {lk.label}
              </Link>
            ))}
          </div>

          {/* Dropdown "Xem thêm" list, positioned outside scrollable container to prevent vertical clipping */}
          {isMoreCategoriesOpen && categories.length > 8 && (
            <div
              ref={moreCategoriesRef}
              style={{
                position: 'absolute',
                right: 'max(20px, calc((100% - 1240px) / 2 + 20px))',
                top: '100%',
                width: 200,
                background: 'var(--nav-bg-default)',
                border: '1px solid var(--nav-border)',
                borderRadius: 8,
                boxShadow: theme === 'dark' ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px hsla(0,0%,0%,0.12)',
                zIndex: 200,
                padding: '8px 0',
                transition: 'opacity 0.2s, transform 0.2s',
                opacity: isMoreCategoriesOpen ? 1 : 0,
                transform: isMoreCategoriesOpen ? 'translateY(0)' : 'translateY(-8px)',
                pointerEvents: isMoreCategoriesOpen ? 'auto' : 'none',
              }}
            >
              {categories.slice(8).map(cat => (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.slug}`}
                  onClick={() => setIsMoreCategoriesOpen(false)}
                  style={{
                    display: 'block',
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--nav-text-primary)',
                    textDecoration: 'none',
                    transition: 'background 0.1s, color 0.1s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--nav-bg-hover)';
                    e.currentTarget.style.color = 'var(--brand-primary)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '';
                    e.currentTarget.style.color = 'var(--nav-text-primary)';
                  }}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          {/* Mega Menu */}
          {activeMegaMenu && (
            <div
              ref={megaMenuRef}
              className="mega-menu visible-menu"
              onMouseEnter={() => clearTimeout(megaTimerRef.current)}
              onMouseLeave={closeMegaMenu}
              style={{
                backdropFilter: 'blur(20px)',
                background: theme === 'dark' ? 'rgba(23, 23, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderTop: '2px solid var(--brand-primary)',
                boxShadow: theme === 'dark' ? '0 12px 40px rgba(0,0,0,0.4)' : '0 12px 40px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 40px' }}>
                {(() => {
                  const cat = categories.find(c => c.slug === activeMegaMenu);
                  if (!cat) return null;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Category Header Title */}
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-primary)', borderBottom: '1px solid var(--nav-border-light)', paddingBottom: 8 }}>
                        {cat.name}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-12" style={{ padding: '4px 0' }}>
                        {/* Column 1: Popular Searches */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--nav-text-muted)', marginBottom: 12 }}>
                            Tìm kiếm nổi bật
                          </div>
                          <div className="flex flex-col gap-1">
                            {(CATEGORY_SUBCATEGORIES[cat.slug] || []).map(sub => (
                              <Link
                                key={sub.label}
                                to={`/products?category=${cat.slug}&q=${encodeURIComponent(sub.query)}`}
                                onClick={() => setActiveMegaMenu(null)}
                                style={{
                                  fontSize: 13,
                                  color: 'var(--nav-text-primary)',
                                  textDecoration: 'none',
                                  padding: '5px 0',
                                  fontWeight: 500,
                                  transition: 'all 0.15s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.color = 'var(--brand-primary)';
                                  e.currentTarget.style.transform = 'translateX(6px)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.color = 'var(--nav-text-primary)';
                                  e.currentTarget.style.transform = 'translateX(0)';
                                }}
                              >
                                <span style={{ opacity: 0.4, fontSize: 10 }}>✦</span>
                                {sub.label}
                              </Link>
                            ))}
                            {(CATEGORY_SUBCATEGORIES[cat.slug] || []).length === 0 && (
                              <div style={{ fontSize: 13, color: 'var(--nav-text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                                Đang cập nhật danh mục con...
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Column 2: Auction Status Filters */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--nav-text-muted)', marginBottom: 12 }}>
                            Bộ lọc phiên đấu
                          </div>
                          <div className="flex flex-col gap-1">
                            {[
                              { label: 'Tất cả sản phẩm', status: '', sort: '', emoji: '📋' },
                              { label: 'Đang diễn ra', status: 'active', sort: '', emoji: '🔥' },
                              { label: 'Sắp kết thúc', status: 'active', sort: 'ending', emoji: '⏰' },
                              { label: 'Đã kết thúc', status: 'ended', sort: '', emoji: '✅' },
                            ].map(opt => {
                              const params = new URLSearchParams();
                              params.set('category', cat.slug);
                              if (opt.status) params.set('status', opt.status);
                              if (opt.sort) params.set('sort', opt.sort);
                              return (
                                <Link
                                  key={opt.label}
                                  to={`/products?${params.toString()}`}
                                  onClick={() => setActiveMegaMenu(null)}
                                  style={{
                                    fontSize: 13,
                                    color: 'var(--nav-text-primary)',
                                    textDecoration: 'none',
                                    padding: '5px 0',
                                    fontWeight: 500,
                                    transition: 'all 0.15s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.color = 'var(--brand-primary)';
                                    e.currentTarget.style.transform = 'translateX(6px)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.color = 'var(--nav-text-primary)';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                  }}
                                >
                                  <span style={{ fontSize: 12 }}>{opt.emoji}</span>
                                  {opt.label}
                                </Link>
                              );
                            })}
                          </div>
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
