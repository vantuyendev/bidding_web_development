import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../api';

export default function UserProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'wallet', 'history', 'listings'
  const [profileData, setProfileData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState(null);

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Số dư khả dụng */}
                <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-3xl p-6 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Số dư khả dụng</span>
                  <div className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mt-2">
                    {formatMoney(profileData.balance)}
                  </div>
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
                        Đây là 10% tiền cọc khi tham gia đấu giá sản phẩm. Hệ thống sẽ trả lại khi kết thúc phiên hoặc nếu bạn không thắng.
                      </span>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-neutral-500 tracking-tight mt-2">
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

                          <div className="w-24 text-right">
                            {isEnded ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                Đã kết thúc
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
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

        </div>

      </div>

    </div>
  );
}
