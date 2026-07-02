import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../api';
import CreateAuctionModal from './CreateAuctionModal';

export default function Navbar() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  
  const [notifications, setNotifications] = useState([]);

  const dropdownRef = useRef(null);
  const notifyRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(getApiUrl('/api/notifications'), {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải thông báo:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // Poll every 15 seconds
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user]);

  const handleToggleNotifications = () => {
    const nextState = !isNotificationsOpen;
    setIsNotificationsOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(getApiUrl('/api/notifications/read'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Lỗi khi đánh dấu đã đọc tất cả:', err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(getApiUrl('/api/notifications/read'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Lỗi khi đánh dấu đã đọc thông báo:', err);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const hasUnread = notifications.some(n => !n.isRead);

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notifyRef.current && !notifyRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen to custom open-post-modal event
  useEffect(() => {
    const handleOpenModal = () => setIsPostModalOpen(true);
    window.addEventListener('open-post-modal', handleOpenModal);
    return () => window.removeEventListener('open-post-modal', handleOpenModal);
  }, []);

  const handleVerifySeller = async () => {
    setVerifyLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/users/verify-seller'), {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        await refreshUser();
      }
    } catch (err) {
      console.error('Lỗi khi xác thực người bán:', err);
    } finally {
      setVerifyLoading(false);
    }
  };



  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/60 dark:bg-neutral-950/60 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo (Trái) */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-neutral-950 to-neutral-700 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent select-none">
              Aura Bid
            </span>
          </Link>

          {/* Cụm Action (Phải) */}
          <div className="flex items-center gap-4">
            
            {/* Nút Đăng tin */}
            <button
              onClick={() => {
                if (!user) {
                  navigate('/login');
                } else {
                  setIsPostModalOpen(true);
                }
              }}
              className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 rounded-full text-xs font-semibold px-4 py-2 hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm cursor-pointer"
            >
              Đăng tin
            </button>

            {user && (
              <>
                {/* Chuông Thông báo */}
                <div className="relative" ref={notifyRef}>
                  <button
                    onClick={handleToggleNotifications}
                    className="p-2 text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white rounded-full hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50 transition-all duration-300 relative cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5.5 h-5.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                      />
                    </svg>
                    {/* Chấm đỏ khi có thông báo chưa đọc */}
                    {hasUnread && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-neutral-950 animate-pulse"></span>
                    )}
                  </button>

                  {/* Dropdown thông báo */}
                  <div
                    className={`absolute right-0 mt-3 w-80 bg-white/70 dark:bg-neutral-950/70 border border-white/20 dark:border-neutral-800/30 backdrop-blur-xl rounded-2xl shadow-xl p-4 transition-all duration-300 origin-top-right z-50 ${
                      isNotificationsOpen
                        ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                        : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
                    }`}
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-neutral-200/40 dark:border-neutral-800/50 mb-2 select-none">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">Thông báo ({notifications.filter(n => !n.isRead).length})</span>
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer bg-transparent border-0"
                      >
                        Đánh dấu đã đọc tất cả
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-xs text-neutral-400 select-none">
                          Không có thông báo nào.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkAsRead(n.id)}
                            className={`p-3 rounded-xl text-xs flex flex-col gap-1 transition-all cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 ${
                              !n.isRead
                                ? 'bg-amber-500/10 dark:bg-amber-500/5 border-l-2 border-amber-500 font-bold'
                                : 'text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className={`font-bold text-neutral-900 dark:text-neutral-100 ${!n.isRead ? 'font-black' : 'font-semibold'}`}>
                                {n.title}
                              </span>
                              {!n.isRead && (
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full flex-shrink-0 mt-1"></span>
                              )}
                            </div>
                            <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed font-normal">
                              {n.message}
                            </p>
                            <span className="text-[9px] text-neutral-400/80 font-normal">
                              {formatTime(n.createdAt)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Avatar Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 group cursor-pointer focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-200 to-neutral-300 dark:from-neutral-850 dark:to-neutral-800 flex items-center justify-center ring-1 ring-neutral-200 dark:ring-neutral-800 group-hover:ring-neutral-400 dark:group-hover:ring-neutral-600 transition-all duration-300">
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase">
                        {user.email[0]}
                      </span>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  <div
                    className={`absolute right-0 mt-3 w-56 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-xl rounded-2xl shadow-xl py-2 transition-all duration-300 origin-top-right ${
                      isDropdownOpen
                        ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                        : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
                    }`}
                  >
                    <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 flex flex-col">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {user.email}
                      </span>
                      {user.isVerifiedSeller ? (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ✓ Người bán xác thực
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                          Khách hàng đấu giá
                        </span>
                      )}
                    </div>

                    <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 flex flex-col">
                      <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold">
                        Số dư khả dụng
                      </span>
                      <span className="text-sm font-black text-neutral-900 dark:text-white mt-0.5">
                        {user.balance.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="block w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 font-bold transition-all cursor-pointer"
                      >
                        Trang cá nhân
                      </Link>

                      {!user.isVerifiedSeller && (
                        <button
                          onClick={handleVerifySeller}
                          disabled={verifyLoading}
                          className="w-full text-left px-4 py-2 text-xs text-amber-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 font-bold transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {verifyLoading ? 'Đang xác thực...' : '⚡ Nâng cấp Người bán'}
                        </button>
                      )}
                      
                      <button
                        onClick={async () => {
                          await logout();
                          setIsDropdownOpen(false);
                          navigate('/');
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 font-bold transition-all cursor-pointer"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!user && (
              <Link
                to="/login"
                className="text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Đăng nhập
              </Link>
            )}

          </div>
        </div>
      </nav>

      <CreateAuctionModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
      />
    </>
  );
}
