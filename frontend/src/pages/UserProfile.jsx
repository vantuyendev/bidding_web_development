import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../api';

export default function UserProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [profileData, setProfileData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [, setError] = useState(null);

  // Lấy thông tin hồ sơ đầy đủ
  const fetchFullProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/users/profile'), {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfileData(data.data);
          setError(null);
        } else {
          setError(data.error || 'Không thể tải thông tin tài khoản.');
        }
      } else {
        setError('Bạn cần đăng nhập để xem thông tin.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // Lấy tất cả sản phẩm
  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/products'));
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách sản phẩm:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchFullProfile();
    fetchProducts();
  }, [user, navigate]);

  useEffect(() => {
    const handleProductCreated = () => {
      fetchFullProfile();
      fetchProducts();
    };
    window.addEventListener('product-created', handleProductCreated);
    return () => window.removeEventListener('product-created', handleProductCreated);
  }, []);

  if (loading || !profileData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse select-none">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-64 space-y-4">
            <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-800 rounded-2xl"></div>
            <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-800 rounded-2xl"></div>
            <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-800 rounded-2xl"></div>
          </div>
          <div className="flex-1 w-full bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 rounded-3xl p-8 h-96">
            <div className="h-8 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded-xl mb-6"></div>
            <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl mb-4"></div>
            <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const isTabActive = (path) => {
    return location.pathname === path;
  };

  const navLinkClass = (path) => {
    return `px-4.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 text-left whitespace-nowrap cursor-pointer w-full flex items-center gap-3 no-underline ${
      isTabActive(path)
        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
    }`;
  };

  const isAdmin = profileData.isAdmin === true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 selection:bg-amber-500/20">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Sidebar / Navigation Tab List */}
        <div className="w-full md:w-64 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible border-b md:border-b-0 border-neutral-200 dark:border-neutral-850 pb-2 md:pb-0 gap-1 select-none">
          <NavLink to="/profile" end className={() => navLinkClass('/profile')}>
            <span>👤</span> Tổng quan
          </NavLink>
          <NavLink to="/profile/wallet" className={() => navLinkClass('/profile/wallet')}>
            <span>💳</span> Ví & Giao dịch
          </NavLink>
          <NavLink to="/profile/won-auctions" className={() => navLinkClass('/profile/won-auctions')}>
            <span>🏆</span> Đấu giá đã thắng
          </NavLink>
          <NavLink to="/profile/bids" className={() => navLinkClass('/profile/bids')}>
            <span>⚖️</span> Lịch sử Đấu giá
          </NavLink>
          <NavLink to="/profile/listings" className={() => navLinkClass('/profile/listings')}>
            <span>📦</span> Quản lý Đăng bán
          </NavLink>
          <NavLink to="/profile/watchlist" className={() => navLinkClass('/profile/watchlist')}>
            <span>❤️</span> Yêu thích
          </NavLink>
          <NavLink to="/profile/notifications" className={() => navLinkClass('/profile/notifications')}>
            <span>🔔</span> Thông báo
          </NavLink>
          <NavLink to="/profile/disputes" className={() => navLinkClass('/profile/disputes')}>
            <span>⚖️</span> Khiếu nại của tôi
          </NavLink>
          
          {profileData.kycStatus !== 'APPROVED' && !isAdmin && (
            <NavLink to="/profile/kyc" className={() => navLinkClass('/profile/kyc')}>
              <span>🛡️</span> Xác thực Người bán
            </NavLink>
          )}

          {isAdmin && (
            <>
              <div className="hidden md:block my-3 border-t border-neutral-200 dark:border-neutral-800" />
              <NavLink to="/admin" className={() => navLinkClass('/admin')}>
                <span>🛠️</span> Trang Quản trị Admin
              </NavLink>
            </>
          )}
        </div>

        {/* Content Outlet Display Container */}
        <div className="flex-1 w-full bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/80 rounded-3xl p-6 md:p-8 shadow-sm min-h-[400px]">
          <Outlet context={{ profileData, fetchFullProfile, products, productsLoading }} />
        </div>

      </div>
    </div>
  );
}
