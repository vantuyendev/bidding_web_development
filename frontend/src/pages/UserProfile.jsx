import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../api';
import ReviewModal from '../components/ReviewModal';

export default function UserProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'wallet', 'history', 'listings', 'watchlist', 'kyc', 'admin-kyc', 'admin-disputes'
  const [profileData, setProfileData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin Disputes states
  const [disputes, setDisputes] = useState([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputesError, setDisputesError] = useState(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState('');
  const [reviewProductName, setReviewProductName] = useState('');

  // Watchlist states
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // KYC submission states
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardImageUrl, setIdCardImageUrl] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [kycSubmitError, setKycSubmitError] = useState('');
  const [kycSubmitSuccess, setKycSubmitSuccess] = useState('');
  const [kycSubmitting, setKycSubmitting] = useState(false);

  // Admin KYC approval states
  const [pendingKycUsers, setPendingKycUsers] = useState([]);
  const [pendingKycLoading, setPendingKycLoading] = useState(false);
  const [adminActionError, setAdminActionError] = useState('');
  const [adminActionSuccess, setAdminActionSuccess] = useState('');

  // Wallet Modal states
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletAction, setWalletAction] = useState('deposit'); // 'deposit' | 'withdraw'
  const [walletAmount, setWalletAmount] = useState('');
  const [walletModalError, setWalletModalError] = useState('');
  const [walletModalSuccess, setWalletModalSuccess] = useState('');
  const [walletSubmitting, setWalletSubmitting] = useState(false);

  const handleOpenReviewModal = (productId, productName) => {
    setReviewProductId(productId);
    setReviewProductName(productName);
    setReviewModalOpen(true);
  };

  const fetchWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/watchlist'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setWatchlist(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách yêu thích:', err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const removeFromWatchlist = async (productId) => {
    try {
      const res = await fetch(getApiUrl(`/api/watchlist/${productId}`), {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setWatchlist(prev => prev.filter(p => p.id !== productId));
      }
    } catch (err) {
      console.error('Lỗi khi xóa khỏi danh sách yêu thích:', err);
    }
  };

  const fetchPendingKyc = async () => {
    setPendingKycLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/users/admin/kyc-pending'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setPendingKycUsers(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi lấy danh sách chờ KYC:', err);
    } finally {
      setPendingKycLoading(false);
    }
  };

  const fetchDisputes = async () => {
    setDisputesLoading(true);
    setDisputesError(null);
    try {
      const res = await fetch(getApiUrl('/api/disputes'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setDisputes(data.data);
      } else {
        setDisputesError(data.error || 'Lỗi tải danh sách khiếu nại.');
      }
    } catch (err) {
      setDisputesError('Lỗi kết nối máy chủ.');
    } finally {
      setDisputesLoading(false);
    }
  };

  const handleApproveKyc = async (targetUserId, action) => {
    setAdminActionError('');
    setAdminActionSuccess('');
    try {
      const res = await fetch(getApiUrl('/api/users/admin/approve-kyc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setAdminActionSuccess(data.message);
        fetchPendingKyc();
      } else {
        setAdminActionError(data.error || 'Duyệt hồ sơ thất bại.');
      }
    } catch (err) {
      setAdminActionError('Lỗi kết nối máy chủ.');
    }
  };

  const handleSubmitKyc = async (e) => {
    e.preventDefault();
    setKycSubmitError('');
    setKycSubmitSuccess('');
    setKycSubmitting(true);

    if (!idCardNumber || !shopAddress) {
      setKycSubmitError('Vui lòng cung cấp số CCCD và địa chỉ cửa hàng.');
      setKycSubmitting(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/users/submit-kyc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idCardNumber,
          idCardImageUrl: idCardImageUrl || 'https://picsum.photos/seed/kyc/400/300',
          shopAddress,
          phoneNumber
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setKycSubmitSuccess(data.message);
        fetchFullProfile();
      } else {
        setKycSubmitError(data.error || 'Nộp hồ sơ thất bại.');
      }
    } catch (err) {
      setKycSubmitError('Lỗi kết nối máy chủ.');
    } finally {
      setKycSubmitting(false);
    }
  };

  const handleWalletSubmit = async (e) => {
    e.preventDefault();
    setWalletModalError('');
    setWalletModalSuccess('');
    setWalletSubmitting(true);

    const amountNum = parseFloat(walletAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWalletModalError('Số tiền phải lớn hơn 0.');
      setWalletSubmitting(false);
      return;
    }

    const endpoint = walletAction === 'deposit' ? '/api/users/deposit' : '/api/users/withdraw';

    try {
      const res = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setWalletModalSuccess(data.message);
        setWalletAmount('');
        fetchFullProfile();
        refreshUser();
      } else {
        setWalletModalError(data.error || 'Giao dịch thất bại.');
      }
    } catch (err) {
      setWalletModalError('Lỗi kết nối máy chủ.');
    } finally {
      setWalletSubmitting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'watchlist') {
      fetchWatchlist();
    }
    if (activeTab === 'admin-kyc') {
      fetchPendingKyc();
    }
    if (activeTab === 'admin-disputes') {
      fetchDisputes();
    }
  }, [activeTab]);

  // Fetch full profile info (with transactions & bids)
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

  // Fetch all products to filter seller's own listings
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
  }, [user]);

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

  // Filter listings posted by this user
  const sellerListings = products.filter(p => p.sellerId === profileData.id);

  // Formatter helpers
  const formatMoney = (val) => Number(val).toLocaleString('vi-VN') + ' đ';
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Transaction type labels & styling
  const getTxDetails = (type) => {
    switch (type) {
      case 'DEPOSIT':
        return { label: 'Nạp tiền', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' };
      case 'WITHDRAW':
        return { label: 'Rút tiền', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20' };
      case 'HOLD_ESCROW':
        return { label: 'Tạm giữ cọc', color: 'text-neutral-500 bg-neutral-50 dark:bg-neutral-800/30' };
      case 'RELEASE_ESCROW':
        return { label: 'Giải phóng cọc', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20' };
      case 'PAYMENT':
        return { label: 'Thanh toán mua hàng', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20' };
      default:
        return { label: type, color: 'text-neutral-600 bg-neutral-50' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 selection:bg-amber-500/20">
      
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Menu điều hướng nội bộ (Sidebar / Tab List) */}
        <div className="w-full md:w-64 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible border-b md:border-b-0 border-neutral-200 dark:border-neutral-850 pb-2 md:pb-0 gap-1 select-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 text-left whitespace-nowrap cursor-pointer w-full flex items-center gap-3 ${
              activeTab === 'overview'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
            }`}
          >
            <span>👤</span> Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 text-left whitespace-nowrap cursor-pointer w-full flex items-center gap-3 ${
              activeTab === 'wallet'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
            }`}
          >
            <span>💳</span> Ví & Giao dịch
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 text-left whitespace-nowrap cursor-pointer w-full flex items-center gap-3 ${
              activeTab === 'history'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
            }`}
          >
            <span>⚖️</span> Lịch sử Đấu giá
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 text-left whitespace-nowrap cursor-pointer w-full flex items-center gap-3 ${
              activeTab === 'listings'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
            }`}
          >
            <span>📦</span> Quản lý Đăng bán
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-4.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 text-left whitespace-nowrap cursor-pointer w-full flex items-center gap-3 ${
              activeTab === 'watchlist'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
            }`}
          >
            <span>❤️</span> Yêu thích
          </button>
          {profileData.kycStatus !== 'APPROVED' && !profileData.email.toLowerCase().includes('admin') && (
            <button
              onClick={() => setActiveTab('kyc')}
              className={`px-4.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 text-left whitespace-nowrap cursor-pointer w-full flex items-center gap-3 ${
                activeTab === 'kyc'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
              }`}
            >
              <span>🛡️</span> Xác thực Người bán
            </button>
          )}
          {profileData.email.toLowerCase().includes('admin') && (
            <>
              <button
                onClick={() => setActiveTab('admin-kyc')}
                className={`px-4.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 text-left whitespace-nowrap cursor-pointer w-full flex items-center gap-3 ${
                  activeTab === 'admin-kyc'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
                }`}
              >
                <span>🔑</span> Duyệt KYC Người bán
              </button>
              <button
                onClick={() => setActiveTab('admin-disputes')}
                className={`px-4.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 text-left whitespace-nowrap cursor-pointer w-full flex items-center gap-3 ${
                  activeTab === 'admin-disputes'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
                }`}
              >
                <span>⚖️</span> Quản lý Khiếu nại (Admin)
              </button>
            </>
          )}
        </div>

        {/* Vùng hiển thị nội dung chính */}
        <div className="flex-1 w-full bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/80 rounded-3xl p-6 md:p-8 shadow-sm">
          
          {/* TAB 1: TỔNG QUAN (OVERVIEW) */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">
                {/* Avatar lớn */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-750 flex items-center justify-center ring-2 ring-neutral-200 dark:ring-neutral-850 shadow-sm select-none">
                  <span className="text-3xl font-black text-neutral-600 dark:text-neutral-300 uppercase">
                    {profileData.email[0]}
                  </span>
                </div>
                
                {/* User metadata */}
                <div className="text-center sm:text-left space-y-1.5 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                      {profileData.email.split('@')[0]}
                    </h2>
                    {profileData.isVerifiedSeller ? (
                      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                        ✓ Người bán Xác thực
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-700/30">
                        Khách hàng đấu giá
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400">{profileData.email}</p>
                  <p className="text-[10px] text-neutral-400 font-mono">ID: {profileData.id}</p>
                </div>
              </div>

              {/* Điểm Tín nhiệm (Trust Score) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Rating score */}
                <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Điểm Tín nhiệm</span>
                    <div className="text-xl font-black text-neutral-900 dark:text-white flex items-baseline gap-1 mt-0.5">
                      {profileData.reputationScore.toFixed(1)}
                      <span className="text-xs text-neutral-400 font-bold">/ 5.0</span>
                    </div>
                  </div>
                </div>

                {/* Successful Transactions */}
                <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Giao dịch Thành công</span>
                    <div className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">
                      {profileData._count?.soldProducts || 0}
                      <span className="text-xs text-neutral-400 font-bold ml-1">đơn hàng</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: VÍ & GIAO DỊCH (WALLET & TRANSACTIONS) */}
          {activeTab === 'wallet' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Thẻ Tài chính (Financial Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Số dư ví */}
                <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-3xl p-6 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Số dư ví khả dụng</span>
                  <div className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight mt-2">
                    {formatMoney(profileData.walletBalance)}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setWalletAction('deposit');
                        setWalletModalError('');
                        setWalletModalSuccess('');
                        setWalletAmount('');
                        setWalletModalOpen(true);
                      }}
                      className="flex-1 bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-[10px] font-bold py-2 rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer shadow-sm text-center"
                    >
                      Nạp tiền
                    </button>
                    <button
                      onClick={() => {
                        setWalletAction('withdraw');
                        setWalletModalError('');
                        setWalletModalSuccess('');
                        setWalletAmount('');
                        setWalletModalOpen(true);
                      }}
                      className="flex-1 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold py-2 rounded-xl hover:scale-105 hover:bg-neutral-50 dark:hover:bg-neutral-850/30 transition-all duration-300 cursor-pointer text-center"
                    >
                      Rút tiền
                    </button>
                  </div>
                </div>

                {/* Tài khoản ngân hàng */}
                <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-3xl p-6 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tài khoản ngân hàng liên kết</span>
                  <div className="text-2xl font-black text-neutral-400 tracking-tight mt-2">
                    {formatMoney(profileData.balance)}
                  </div>
                  <p className="text-[9px] text-neutral-400 mt-2 font-medium">Mock Bank Card •••• 8888</p>
                </div>

                {/* Tiền tạm giữ (Escrow) */}
                <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-3xl p-6 shadow-sm relative group">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tiền tạm giữ (Escrow)</span>
                    {/* Tooltip Icon */}
                    <div className="cursor-help text-neutral-400 hover:text-neutral-600 dark:hover:text-white relative">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-3.5 h-3.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                      </svg>
                      {/* Dropdown Tooltip box */}
                      <span className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 bg-neutral-950 text-white text-[9px] leading-relaxed p-2.5 rounded-xl shadow-xl border border-neutral-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-15">
                        Đây là 10% tiền cọc khi tham gia đấu giá hoặc tiền thanh toán 90% đang giữ ký quỹ cho đến khi nhận hàng.
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-neutral-500 tracking-tight mt-2">
                    {formatMoney(profileData.frozenBalance)}
                  </div>
                </div>

              </div>

              {/* Lịch sử Giao dịch */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Lịch sử giao dịch ví</h3>
                
                {profileData.transactions?.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs text-neutral-400">
                    Chưa phát sinh giao dịch ví nào.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-semibold">
                          <th className="pb-3 pr-4">Thời gian</th>
                          <th className="pb-3 px-4">Loại giao dịch</th>
                          <th className="pb-3 pl-4 text-right">Số tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850">
                        {profileData.transactions?.map((tx) => {
                          const txMeta = getTxDetails(tx.type);
                          const isAdd = tx.type === 'DEPOSIT' || tx.type === 'RELEASE_ESCROW';
                          return (
                            <tr key={tx.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20 transition-all duration-300">
                              <td className="py-3.5 pr-4 text-neutral-500 font-mono">
                                {formatDate(tx.createdAt)}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${txMeta.color}`}>
                                  {txMeta.label}
                                </span>
                              </td>
                              <td className={`py-3.5 pl-4 text-right font-black ${isAdd ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                                {isAdd ? '+' : '-'}{formatMoney(tx.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* TAB 3: LỊCH SỬ ĐẤU GIÁ (AUCTION HISTORY) */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Lịch sử lượt đặt giá</h3>

              {profileData.bids?.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-xs text-neutral-400 flex flex-col items-center justify-center gap-3">
                  <span className="text-3xl">⚖️</span>
                  <p>Bạn chưa tham gia đấu giá sản phẩm nào.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {profileData.bids?.map((bid) => {
                    const prod = bid.product;
                    const isEnded = prod ? (prod.status === 'ENDED' || new Date(prod.endTime).getTime() <= Date.now()) : true;
                    return (
                      <div
                        key={bid.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-neutral-200/50 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700/80 rounded-2xl transition-all duration-300"
                      >
                        <div className="space-y-1.5">
                          <Link
                            to={`/products/${bid.productId}`}
                            className="font-bold text-xs text-neutral-900 dark:text-white hover:text-amber-500 transition-colors line-clamp-1"
                          >
                            {prod?.title || 'Sản phẩm đã bị xóa'}
                          </Link>
                          <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                            <span>Thời gian: {formatDate(bid.bidTime)}</span>
                            {bid.isAutoBid && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20">
                                🤖 Robot tự động
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6">
                          <div className="text-right flex flex-col items-end">
                            <span className="text-[10px] text-neutral-400">Bạn đã đặt</span>
                            <span className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5">
                              {formatMoney(bid.bidAmount)}
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 min-w-[100px]">
                            {isEnded ? (
                              <>
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 select-none">
                                  Đã kết thúc
                                </span>
                                {prod && Number(bid.bidAmount) === Number(prod.currentPrice) && (
                                  prod.review ? (
                                    <span className="inline-flex items-center justify-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 select-none">
                                      ★ Đã đánh giá
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenReviewModal(prod.id, prod.title)}
                                      className="inline-block px-2.5 py-1 rounded-full text-[9px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer text-center select-none shadow-sm"
                                    >
                                      Đánh giá đối tác
                                    </button>
                                  )
                                )}
                              </>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 select-none">
                                Đang đấu giá
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 4: QUẢN LÝ ĐĂNG BÁN (SELLER LISTINGS) */}
          {activeTab === 'listings' && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Sản phẩm đăng đấu giá</h3>

              {productsLoading ? (
                <div className="text-center py-10 text-xs text-neutral-400">
                  Đang tải danh mục đăng bán...
                </div>
              ) : sellerListings.length === 0 ? (
                /* Empty State tuyệt đẹp */
                <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center border border-neutral-200/50 dark:border-neutral-800 text-neutral-300 dark:text-neutral-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-8 h-8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                      />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-neutral-900 dark:text-white">Bạn chưa đăng bán đấu giá sản phẩm nào</p>
                    <p className="text-[10px] text-neutral-400">Trở thành người bán và đăng bài đấu giá các mặt hàng của bạn ngay hôm nay.</p>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new Event('open-post-modal'))}
                    className="mt-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 rounded-full text-xs font-bold px-5 py-2.5 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer shadow-sm"
                  >
                    + Tạo bài Đấu giá mới
                  </button>
                </div>
              ) : (
                /* List View hiển thị sản phẩm */
                <div className="flex flex-col gap-4">
                  {sellerListings.map((prod) => {
                    const isEnded = prod.status === 'ENDED' || new Date(prod.endTime).getTime() <= Date.now();
                    return (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between gap-4 p-4 border border-neutral-200/50 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700/80 rounded-2xl transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          {/* Hình thu nhỏ */}
                          <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center flex-shrink-0 border border-neutral-200/40 dark:border-neutral-700/30">
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-neutral-300 text-xs select-none">📦</span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Link
                              to={`/products/${prod.id}`}
                              className="font-bold text-xs text-neutral-900 dark:text-white hover:text-amber-500 transition-colors line-clamp-1"
                            >
                              {prod.title}
                            </Link>
                            <span className="block text-[9px] text-neutral-400">
                              Kết thúc: {formatDate(prod.endTime)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right flex flex-col items-end">
                            <span className="text-[10px] text-neutral-400">Giá hiện tại</span>
                            <span className="text-xs font-black text-neutral-900 dark:text-white mt-0.5">
                              {formatMoney(prod.currentPrice)}
                            </span>
                          </div>

                          <div className="w-24 text-right">
                            {isEnded ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                Đã chốt
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                Đang diễn ra
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 5: YÊU THÍCH / WATCHLIST */}
          {activeTab === 'watchlist' && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Sản phẩm yêu thích</h3>

              {watchlistLoading ? (
                <div className="text-center py-10 text-xs text-neutral-400">Đang tải danh sách yêu thích...</div>
              ) : watchlist.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400 text-xs">
                  Danh sách yêu thích trống.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {watchlist.map((prod) => (
                    <div key={prod.id} className="flex items-center justify-between gap-4 p-4 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl hover:border-neutral-300 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0 border border-neutral-200/40 dark:border-neutral-700/30">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs">📦</span>
                          )}
                        </div>
                        <div>
                          <Link to={`/products/${prod.id}`} className="font-bold text-xs text-neutral-900 dark:text-white hover:text-amber-500 transition-colors line-clamp-1">
                            {prod.title}
                          </Link>
                          <span className="text-[9px] text-neutral-400 block mt-0.5">Giá hiện tại: {formatMoney(prod.currentPrice)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromWatchlist(prod.id)}
                        className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        Bỏ thích
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ĐĂNG KÝ KYC NGƯỜI BÁN */}
          {activeTab === 'kyc' && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">🛡️ Xác thực tài khoản người bán (KYC)</h3>

              {profileData.kycStatus === 'PENDING' ? (
                <div className="p-6 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs space-y-2">
                  <p className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                    <span>⏳</span> Hồ sơ xác thực đang chờ phê duyệt
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    Aura Bid đang tiến hành kiểm duyệt hồ sơ của bạn. Quá trình này thường mất từ 1 - 2 ngày làm việc. Chúng tôi sẽ gửi thông báo ngay khi hồ sơ được duyệt.
                  </p>
                </div>
              ) : profileData.kycStatus === 'REJECTED' ? (
                <div className="p-6 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-xs space-y-2 mb-4">
                  <p className="font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2">
                    <span>⚠️</span> Hồ sơ xác thực đã bị từ chối
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    Vui lòng cung cấp lại thông tin cá nhân chính xác hơn để chúng tôi tiến hành kiểm duyệt lại.
                  </p>
                </div>
              ) : null}

              {profileData.kycStatus !== 'PENDING' && (
                <form onSubmit={handleSubmitKyc} className="space-y-5 max-w-lg text-xs">
                  {kycSubmitError && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{kycSubmitError}</div>}
                  {kycSubmitSuccess && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold">{kycSubmitSuccess}</div>}

                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 font-bold">Số Căn cước công dân (CCCD)</label>
                    <input
                      type="text"
                      placeholder="Nhập 12 chữ số CCCD"
                      value={idCardNumber}
                      onChange={(e) => setIdCardNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 font-bold">Số điện thoại liên hệ</label>
                    <input
                      type="text"
                      placeholder="Nhập số điện thoại của cửa hàng"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 font-bold">Địa chỉ cửa hàng (Nơi lấy hàng trả hàng)</label>
                    <input
                      type="text"
                      placeholder="Số nhà, đường, phường, quận, tỉnh/thành phố"
                      value={shopAddress}
                      onChange={(e) => setShopAddress(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-neutral-400 font-bold">Ảnh mặt trước CCCD</label>
                    <input
                      type="text"
                      placeholder="Link hình ảnh CCCD hoặc tải ảnh lên"
                      value={idCardImageUrl}
                      onChange={(e) => setIdCardImageUrl(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">Bạn có thể dán link ảnh hoặc để trống để hệ thống tự tạo ảnh giả lập.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={kycSubmitting}
                    className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold px-6 py-3 rounded-xl cursor-pointer hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {kycSubmitting ? 'Đang nộp hồ sơ...' : 'Nộp hồ sơ duyệt'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 7: DUYỆT KYC NGƯỜI BÁN (ADMIN) */}
          {activeTab === 'admin-kyc' && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">🔑 Phê duyệt hồ sơ Người bán</h3>

              {adminActionError && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold text-xs">{adminActionError}</div>}
              {adminActionSuccess && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold text-xs">{adminActionSuccess}</div>}

              {pendingKycLoading ? (
                <div className="text-center py-10 text-xs text-neutral-400">Đang tải hồ sơ...</div>
              ) : pendingKycUsers.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400 text-xs">
                  Hiện tại không có hồ sơ nào chờ phê duyệt.
                </div>
              ) : (
                <div className="flex flex-col gap-6 text-xs">
                  {pendingKycUsers.map((user) => (
                    <div key={user.id} className="p-5 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:border-neutral-300 transition-all">
                      <div className="space-y-2">
                        <p className="font-bold text-neutral-900 dark:text-white">{user.email}</p>
                        <p className="text-neutral-500 font-mono text-[10px]">ID: {user.id}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                          <p className="text-neutral-400">Số CCCD: <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{user.idCardNumber}</span></p>
                          <p className="text-neutral-400">Số ĐT: <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{user.phoneNumber || 'N/A'}</span></p>
                          <p className="text-neutral-400 sm:col-span-2">Địa chỉ cửa hàng: <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{user.shopAddress}</span></p>
                        </div>
                        <div className="mt-2 w-48 h-32 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                          <img src={user.idCardImageUrl} alt="CCCD" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div className="flex gap-2.5 w-full md:w-auto flex-shrink-0">
                        <button
                          onClick={() => handleApproveKyc(user.id, 'APPROVE')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl cursor-pointer"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleApproveKyc(user.id, 'REJECT')}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl cursor-pointer"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* TAB 8: QUẢN LÝ KHIẾU NẠI (ADMIN) */}
          {activeTab === 'admin-disputes' && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">⚖️ Quản lý Khiếu nại tranh chấp</h3>

              {disputesError && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold text-xs">{disputesError}</div>}

              {disputesLoading ? (
                <div className="text-center py-10 text-xs text-neutral-400">Đang tải danh sách khiếu nại...</div>
              ) : disputes.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400 text-xs">
                  Hiện tại không có hồ sơ khiếu nại nào.
                </div>
              ) : (
                <div className="flex flex-col gap-4 text-xs">
                  {disputes.map((ticket) => (
                    <div key={ticket.id} className="p-5 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:border-neutral-300 transition-all">
                      <div className="space-y-2 flex-grow">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            ticket.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {ticket.status === 'PENDING' ? 'Chưa giải quyết' : 'Đã phán quyết'}
                          </span>
                          <span className="text-neutral-450 font-mono text-[9px]">Mã đơn: {ticket.id.slice(0, 8)}...</span>
                        </div>
                        
                        <p className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">
                          Sản phẩm: {ticket.product?.title || 'N/A'}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-neutral-500">
                          <p>Người khiếu nại (Mua): <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{ticket.openedBy?.email}</span></p>
                          <p>Ngày tạo: <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{formatDate(ticket.createdAt)}</span></p>
                          <p className="sm:col-span-2">Lý do khiếu nại: <span className="text-neutral-800 dark:text-neutral-200 font-semibold italic">"{ticket.reason}"</span></p>
                        </div>
                      </div>

                      <div className="flex-shrink-0 w-full md:w-auto">
                        <Link
                          to={`/disputes/${ticket.id}`}
                          className="block text-center bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold px-4 py-2.5 rounded-xl cursor-pointer hover:scale-[1.02] transition-all"
                        >
                          ⚖️ Vào phòng xử lý
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        productId={reviewProductId}
        productName={reviewProductName}
        onSuccess={fetchFullProfile}
      />

      {/* Wallet Action Form Modal */}
      {walletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/80 rounded-3xl p-6 shadow-2xl relative space-y-6">
            <button
              onClick={() => setWalletModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-750 dark:hover:text-white text-lg font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {walletAction === 'deposit' ? 'Nạp tiền vào ví Aura Bid' : 'Rút tiền về tài khoản ngân hàng'}
              </h3>
              <p className="text-[10px] text-neutral-400">
                {walletAction === 'deposit'
                  ? 'Giao dịch chuyển tiền từ tài khoản ngân hàng liên kết vào ví đặt cọc.'
                  : 'Giao dịch chuyển tiền từ ví Aura Bid về lại tài khoản ngân hàng.'}
              </p>
            </div>

            <form onSubmit={handleWalletSubmit} className="space-y-4 text-xs">
              {walletModalError && <div className="p-3.5 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{walletModalError}</div>}
              {walletModalSuccess && <div className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold">{walletModalSuccess}</div>}

              <div className="space-y-1.5">
                <label className="block text-neutral-400 font-bold">Số tiền (đ)</label>
                <input
                  type="number"
                  placeholder="Nhập số tiền giao dịch"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-850 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400"
                />
              </div>

              {/* Quick Amount Suggestions */}
              <div className="flex flex-wrap gap-2 select-none">
                {[500000, 1000000, 5000000, 10000000, 50000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setWalletAmount(String(amt))}
                    className="border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-805 transition-all text-[10px] font-semibold cursor-pointer"
                  >
                    +{amt.toLocaleString('vi-VN')}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={walletSubmitting}
                className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold py-3.5 rounded-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 cursor-pointer text-center"
              >
                {walletSubmitting ? 'Đang thực hiện...' : walletAction === 'deposit' ? 'Xác nhận nạp tiền' : 'Xác nhận rút tiền'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
