import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../api';

export default function Navbar() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  
  // Post Product Form State
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [stepPrice, setStepPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [endTime, setEndTime] = useState('');
  const [weight, setWeight] = useState('');
  
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const dropdownRef = useRef(null);
  const notifyRef = useRef(null);

  // Fetch categories when opening modal
  useEffect(() => {
    if (isPostModalOpen) {
      const fetchCats = async () => {
        try {
          const res = await fetch(getApiUrl('/api/categories'));
          const data = await res.json();
          if (data.success) {
            setCategories(data.data);
            if (data.data.length > 0) {
              setCategoryId(data.data[0].id);
            }
          }
        } catch (err) {
          console.error('Lỗi khi lấy danh mục:', err);
        }
      };
      fetchCats();
      
      // Default end time is 24h from now
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tzoffset = tomorrow.getTimezoneOffset() * 60000; //offset in milliseconds
      const localISOTime = (new Date(tomorrow.getTime() - tzoffset)).toISOString().slice(0, 16);
      setEndTime(localISOTime);
    }
  }, [isPostModalOpen]);

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

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const payload = {
      title,
      description,
      startPrice: Number(startPrice),
      buyNowPrice: buyNowPrice ? Number(buyNowPrice) : null,
      stepPrice: stepPrice ? Number(stepPrice) : null,
      categoryId,
      endTime: new Date(endTime).toISOString(),
      weight: weight ? Number(weight) : null,
    };

    try {
      const res = await fetch(getApiUrl('/api/products'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setIsPostModalOpen(false);
        // Reset form
        setTitle('');
        setDescription('');
        setStartPrice('');
        setBuyNowPrice('');
        setStepPrice('');
        setWeight('');
        // Navigate to new product
        navigate(`/products/${data.data.id}`);
      } else {
        setFormError(data.error || 'Có lỗi xảy ra khi đăng sản phẩm.');
      }
    } catch (err) {
      setFormError('Lỗi kết nối máy chủ.');
    } finally {
      setFormLoading(false);
    }
  };

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

  const mockNotifications = [
    { id: 1, text: 'Phiên đấu giá iPhone 15 Pro của bạn đã kết thúc.', time: '5 phút trước', unread: true },
    { id: 2, text: 'Bạn đã bị vượt giá ở sản phẩm AirPods Pro.', time: '2 giờ trước', unread: false },
    { id: 3, text: 'Ví của bạn đã được cộng 10,000,000đ khi đăng ký.', time: '1 ngày trước', unread: false },
  ];

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
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
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
                    {/* Chấm đỏ minimalistic */}
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-neutral-950 animate-pulse"></span>
                  </button>

                  {/* Dropdown thông báo */}
                  <div
                    className={`absolute right-0 mt-3 w-80 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-xl rounded-2xl shadow-xl p-4 transition-all duration-300 origin-top-right ${
                      isNotificationsOpen
                        ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                        : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
                    }`}
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800 mb-2">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">Thông báo</span>
                      <span className="text-[10px] text-neutral-400">Đánh dấu đã đọc</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {mockNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2 rounded-xl text-xs flex flex-col gap-1 transition-all ${
                            n.unread
                              ? 'bg-neutral-50 dark:bg-neutral-800/40 border-l-2 border-neutral-900 dark:border-white font-medium'
                              : 'text-neutral-600 dark:text-neutral-400'
                          }`}
                        >
                          <p>{n.text}</p>
                          <span className="text-[9px] text-neutral-400">{n.time}</span>
                        </div>
                      ))}
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

      {/* ĐĂNG TIN MODAL */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-neutral-950/40 dark:bg-neutral-950/70 backdrop-blur-sm"
            onClick={() => setIsPostModalOpen(false)}
          ></div>

          {/* Dialog Container */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl w-full max-w-xl relative z-10 max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-fadeIn">
            
            {/* Close Button */}
            <button
              onClick={() => setIsPostModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight mb-6">
              Đăng sản phẩm đấu giá mới
            </h2>

            {/* Check if user is seller */}
            {!user.isVerifiedSeller ? (
              <div className="text-center py-6">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-700 dark:text-amber-400 text-xs mb-6 text-left leading-relaxed">
                  Bạn cần nâng cấp tài khoản của mình thành <strong>Người bán xác thực</strong> trước khi đăng tin bán hàng. Quá trình KYC tự động sẽ kích hoạt ngay lập tức.
                </div>
                <button
                  onClick={handleVerifySeller}
                  disabled={verifyLoading}
                  className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 rounded-full text-xs font-bold px-6 py-3 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50"
                >
                  {verifyLoading ? 'Đang thực hiện KYC...' : '⚡ Bắt đầu KYC và Kích hoạt Người bán'}
                </button>
              </div>
            ) : (
              <form onSubmit={handlePostSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category Selection */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Danh mục sản phẩm</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tiêu đề sản phẩm</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ví dụ: iPhone 15 Pro Max 256GB Gold VN/A"
                      className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Mô tả chi tiết</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mô tả cụ thể về tình trạng, xuất xứ và phụ kiện kèm theo..."
                      className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs min-h-[80px] focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                      required
                    />
                  </div>

                  {/* Start Price */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Giá khởi điểm (đ)</label>
                    <input
                      type="number"
                      value={startPrice}
                      onChange={(e) => setStartPrice(e.target.value)}
                      placeholder="1,000,000"
                      className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                      required
                    />
                  </div>

                  {/* Step Price */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Bước giá tối thiểu (đ)</label>
                    <input
                      type="number"
                      value={stepPrice}
                      onChange={(e) => setStepPrice(e.target.value)}
                      placeholder="50,000"
                      className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                    />
                  </div>

                  {/* Buy Now Price */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Giá mua đứt (đ) (Tùy chọn)</label>
                    <input
                      type="number"
                      value={buyNowPrice}
                      onChange={(e) => setBuyNowPrice(e.target.value)}
                      placeholder="Ví dụ: 15,000,000"
                      className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                    />
                  </div>

                  {/* Weight */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Trọng lượng (gram)</label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="Ví dụ: 200"
                      className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                    />
                  </div>

                  {/* End Time */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Thời gian kết thúc</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsPostModalOpen(false)}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-full text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-full text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {formLoading ? 'Đang xử lý...' : 'Xác nhận Đăng tin'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
}
