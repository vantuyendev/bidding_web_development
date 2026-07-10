import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const isTabActive = (path) => {
    return location.pathname === path;
  };

  const navLinkClass = (path) => {
    return `px-4.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 text-left whitespace-nowrap cursor-pointer w-full flex items-center gap-3 no-underline ${
      isTabActive(path)
        ? 'bg-amber-600 text-white shadow-md'
        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
    }`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 selection:bg-amber-500/20">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Admin Sidebar Navigation */}
        <div className="w-full md:w-64 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible border-b md:border-b-0 border-neutral-200 dark:border-neutral-800 pb-2 md:pb-0 gap-1 select-none">
          <div className="hidden md:block mb-4 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-2xl border border-amber-500/20">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400">Hệ thống quản trị</p>
            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{user?.email}</p>
          </div>

          <NavLink to="/admin" end className={() => navLinkClass('/admin')}>
            <span>📊</span> Thống kê chung
          </NavLink>
          <NavLink to="/admin/products" className={() => navLinkClass('/admin/products')}>
            <span>📦</span> Phê duyệt Sản phẩm
          </NavLink>
          <NavLink to="/admin/kyc" className={() => navLinkClass('/admin/kyc')}>
            <span>🔑</span> Duyệt KYC Người bán
          </NavLink>
          <NavLink to="/admin/wallet-requests" className={() => navLinkClass('/admin/wallet-requests')}>
            <span>💰</span> Giao dịch Ví
          </NavLink>
          <NavLink to="/admin/users" className={() => navLinkClass('/admin/users')}>
            <span>👥</span> Quản lý Người dùng
          </NavLink>
          <NavLink to="/admin/auctions" className={() => navLinkClass('/admin/auctions')}>
            <span>⚡</span> Hủy phiên Đấu giá
          </NavLink>
          <NavLink to="/admin/disputes" className={() => navLinkClass('/admin/disputes')}>
            <span>⚖️</span> Tranh chấp & Khiếu nại
          </NavLink>
          
          <div className="hidden md:block my-3 border-t border-neutral-200 dark:border-neutral-800" />
          <NavLink to="/profile" className={() => navLinkClass('/profile')}>
            <span>👤</span> Trang cá nhân
          </NavLink>
        </div>

        {/* Admin Content Container */}
        <div className="flex-1 w-full bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/80 rounded-3xl p-6 md:p-8 shadow-sm min-h-[500px]">
          <Outlet />
        </div>

      </div>
    </div>
  );
}
