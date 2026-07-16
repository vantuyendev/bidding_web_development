import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiUrl } from '../api';


export default function Header() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserStatus = async () => {
    try {
      const res = await fetch(getApiUrl('/api/auth/me'), {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Lỗi khi lấy thông tin phiên đăng nhập:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStatus();

    // Lắng nghe sự kiện tùy chỉnh cho cập nhật số dư hoặc thay đổi trạng thái xác thực
    const handleAuthChange = () => {
      fetchUserStatus();
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setUser(null);
        // Kích hoạt sự kiện thay đổi xác thực
        window.dispatchEvent(new Event('auth-change'));
        navigate('/');
      }
    } catch (err) {
      console.error('Lỗi khi đăng xuất:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85 transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/10 group-hover:scale-105 transition-transform duration-300">
            <svg
              className="h-5 w-5 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2L2 22h20L12 2zm0 4l6.5 13h-13L12 6z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-50 dark:to-zinc-300 bg-clip-text text-transparent">
            Aura Bid
          </span>
        </Link>

        {/* Auth / Account Controls */}
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900"></div>
          ) : user ? (
            <div className="flex items-center gap-3 md:gap-6">
              {/* User Balance Display */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-505">
                  Số dư ví
                </span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {(user.walletBalance ?? 0).toLocaleString('vi-VN')} đ
                </span>
              </div>

              {/* User Email & Logout */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 max-w-[150px] truncate">
                    {user.email}
                  </span>
                  <span className="sm:hidden text-[10px] font-bold text-amber-500">
                    {(user.walletBalance ?? 0).toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-full bg-zinc-105 hover:bg-rose-50 text-zinc-600 hover:text-rose-600 dark:bg-zinc-900 dark:hover:bg-rose-950/20 dark:text-zinc-400 dark:hover:text-rose-400 px-4 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 px-4 py-2 text-xs font-bold transition-all active:scale-95"
              >
                Đăng ký / Đăng nhập
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
