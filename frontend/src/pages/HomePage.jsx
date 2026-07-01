import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { getApiUrl } from '../api';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [availableFilters, setAvailableFilters] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'ended'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'price-asc', 'price-desc'

  // Live ticking timer for accurate countdowns
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(getApiUrl('/api/categories'));
        const data = await res.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (err) {
        console.error("Lỗi lấy danh mục:", err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch products reactive to filters, categories, and search query
  useEffect(() => {
    async function fetchFilteredProducts() {
      setLoading(true);
      try {
        let url = getApiUrl('/api/products/search?limit=100');

        if (searchTerm) {
          url += `&q=${encodeURIComponent(searchTerm)}`;
        }

        if (selectedCategory) {
          url += `&categorySlug=${encodeURIComponent(selectedCategory.slug)}`;
        }

        if (Object.keys(activeFilters).length > 0) {
          url += `&filters=${encodeURIComponent(JSON.stringify(activeFilters))}`;
        }

        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setProducts(data.data);
          setError(null);
        } else {
          setError(data.error || 'Lỗi khi tải danh sách sản phẩm.');
        }
      } catch (err) {
        setError('Không thể kết nối tới máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    fetchFilteredProducts();
  }, [selectedCategory, activeFilters, searchTerm]);

  // Fetch attribute keys (filters) when category changes
  const handleCategorySelect = async (category) => {
    if (selectedCategory?.id === category?.id) {
      // Deselect category
      setSelectedCategory(null);
      setAvailableFilters([]);
      setActiveFilters({});
      return;
    }

    setSelectedCategory(category);
    setActiveFilters({});
    setAvailableFilters([]);

    if (category) {
      try {
        const res = await fetch(getApiUrl(`/api/products/filters?categorySlug=${category.slug}`));
        const data = await res.json();
        if (data.success) {
          setAvailableFilters(data.data.filters || []);
        }
      } catch (err) {
        console.error("Lỗi lấy bộ lọc động:", err);
      }
    }
  };

  // Handle dynamic checkbox selection
  const handleFilterChange = (keyId, option, checked) => {
    setActiveFilters((prev) => {
      const currentValues = prev[keyId] || [];
      let newValues;
      if (checked) {
        newValues = [...currentValues, option];
      } else {
        newValues = currentValues.filter((v) => v !== option);
      }

      const updated = { ...prev };
      if (newValues.length > 0) {
        updated[keyId] = newValues;
      } else {
        delete updated[keyId];
      }
      return updated;
    });
  };

  // Format countdown text live
  const getRemainingTimeText = (endTime, status) => {
    const isEndedStatus = status === 'ENDED' || status === 'ended' || status === 'RESOLVED';
    const isPastTime = new Date(endTime).getTime() <= currentTime;
    if (isEndedStatus || isPastTime) return 'Đã kết thúc';

    const diff = new Date(endTime).getTime() - currentTime;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  };

  // Filter & Sort Products locally for tabs and select dropdown
  const processedProducts = products
    .filter((product) => {
      const isEnded = product.status === 'ENDED' || product.status === 'ended' || product.status === 'RESOLVED' || new Date(product.endTime).getTime() <= currentTime;
      if (activeTab === 'active') {
        return !isEnded;
      } else if (activeTab === 'ended') {
        return isEnded;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.startTime) - new Date(a.startTime);
      }
      if (sortBy === 'price-asc') {
        return a.currentPrice - b.currentPrice;
      }
      if (sortBy === 'price-desc') {
        return b.currentPrice - a.currentPrice;
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors duration-300">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-zinc-950 text-zinc-100 py-16 md:py-20 border-b border-zinc-900">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-6 border border-amber-500/20">
            ⚡ SÀN ĐẤU GIÁ CAO CẤP REALTIME
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight max-w-4xl mx-auto mb-6 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Đấu Giá Tự Động & Sở Hữu <span className="text-amber-400">Vật Phẩm Độc Bản</span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Hỗ trợ cơ chế cọc bảo vệ Escrow, tự động đè giá thông minh (Auto Proxy-Bid), chống bắn tỉa bắn thầu (Sniping Protection) cùng phán quyết khiếu nại minh bạch bởi Admin.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-zinc-900 pt-8 text-center">
            <div>
              <p className="text-xl md:text-2xl font-black text-white">Escrow</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-1">Đóng băng cọc 10%</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black text-white">Proxy Bid</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-1">Đặt giá tự động</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black text-white">Live SSE</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-1">Cập nhật giá realtime</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black text-white">Dispute</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-1">Kháng nghị hoàn tiền</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Category Horizontal Topbar */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Danh mục sản phẩm</h2>
          <div className="flex flex-wrap gap-2.5 pb-2">
            <button
              onClick={() => handleCategorySelect(null)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 border cursor-pointer ${
                !selectedCategory
                  ? 'bg-amber-400 border-amber-400 text-zinc-950 shadow-md scale-102'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              🌐 Tất cả sản phẩm
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 border cursor-pointer ${
                  selectedCategory?.id === cat.id
                    ? 'bg-amber-400 border-amber-400 text-zinc-950 shadow-md scale-102'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                🏷️ {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Selection, Search and Sort Panel */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center mb-8 bg-zinc-100/50 dark:bg-zinc-900/50 p-4 rounded-3xl border border-zinc-200/40 dark:border-zinc-800/40">
          
          {/* Tabs */}
          <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-2xl w-full lg:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 lg:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 lg:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              🔥 Đang diễn ra
            </button>
            <button
              onClick={() => setActiveTab('ended')}
              className={`flex-1 lg:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ended'
                  ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              🏁 Đã kết thúc
            </button>
          </div>

          {/* Search, Sort and Filters bar */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Tìm tên hoặc mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold outline-none focus:border-amber-500 transition-colors"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value="newest">Mới nhất</option>
              <option value="price-asc">Giá: Thấp đến Cao</option>
              <option value="price-desc">Giá: Cao đến Thấp</option>
            </select>
          </div>
        </div>

        {/* Layout Grid: Sidebar Filters + Main Product Grid */}
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Dynamic Filters Sidebar */}
          {selectedCategory && availableFilters.length > 0 && (
            <aside className="w-full md:w-64 flex-shrink-0 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm self-start">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
                <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white flex items-center gap-1.5">
                  <span>⚙️</span> Bộ lọc thuộc tính
                </h3>
                {Object.keys(activeFilters).length > 0 && (
                  <button
                    onClick={() => setActiveFilters({})}
                    className="text-[10px] font-bold text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {availableFilters.map((filter) => (
                  <div key={filter.id} className="space-y-2.5">
                    <h4 className="text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      {filter.name}
                    </h4>
                    
                    {filter.options && filter.options.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {filter.options.map((option) => {
                          const isChecked = activeFilters[filter.id]?.includes(option) || false;
                          return (
                            <label
                              key={option}
                              className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer select-none font-medium"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleFilterChange(filter.id, option, e.target.checked)}
                                className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-400"
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-500 italic">Không có tùy chọn</p>
                    )}
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* Product Grid Area */}
          <section className="flex-grow">
            {loading && (
              <div className="py-24 text-center">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-zinc-500 font-medium">Đang tìm kiếm đấu giá phù hợp...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30 text-red-600 dark:text-red-400 p-6 rounded-3xl text-center max-w-md mx-auto my-12">
                <p className="font-bold mb-2">Đã xảy ra lỗi</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                {processedProducts.length === 0 ? (
                  <div className="py-24 bg-white dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center max-w-lg mx-auto">
                    <span className="text-4xl mb-4 block">📦</span>
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">Không tìm thấy sản phẩm phù hợp</h3>
                    <p className="text-zinc-500 text-xs">Vui lòng thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc thuộc tính.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {processedProducts.map((product) => {
                      const isEnded = product.status === 'ENDED' || product.status === 'ended' || product.status === 'RESOLVED' || new Date(product.endTime).getTime() <= currentTime;
                      const hasBuyNow = product.buyNowPrice !== null && product.buyNowPrice !== undefined;
                      
                      // Highlight countdown in red if remaining time is under 5 minutes
                      const isUrgent = !isEnded && (new Date(product.endTime).getTime() - currentTime < 5 * 60 * 1000);

                      return (
                        <div
                          key={product.id}
                          className="group bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg border border-zinc-200/50 dark:border-zinc-800/80 hover:border-amber-400/40 transition-all duration-300 flex flex-col h-full relative"
                        >
                          {/* Image Container */}
                          <div className="relative aspect-[4/3] bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-5 border-b border-zinc-100 dark:border-zinc-800/50 overflow-hidden">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="max-h-full max-w-full object-contain rounded-xl transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="text-zinc-400 flex flex-col items-center gap-1.5">
                                <span className="text-3xl">🖼️</span>
                                <span className="text-[10px] font-medium">Chưa có ảnh</span>
                              </div>
                            )}

                            {/* Status Badge */}
                            <div className="absolute top-3 left-3 flex flex-wrap gap-1 max-w-[80%]">
                              {isEnded ? (
                                <span className="px-2.5 py-1 rounded-xl bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 text-[10px] font-extrabold uppercase tracking-wider">
                                  Đã kết thúc
                                </span>
                              ) : product.status === 'DISPUTED' ? (
                                <span className="px-2.5 py-1 rounded-xl bg-red-500/15 text-red-500 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                                  ⚖️ Tranh chấp
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Đang diễn ra
                                </span>
                              )}
                            </div>

                            {/* Buy Now & Auto Bid Badges */}
                            <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                              {hasBuyNow && (
                                <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-zinc-950 text-[9px] font-black uppercase tracking-wider shadow-sm">
                                  ⚡ Mua đứt
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-lg bg-zinc-950/80 dark:bg-zinc-800/90 text-zinc-100 text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
                                🤖 Auto-Bid
                              </span>
                            </div>

                            {/* Countdown Badge */}
                            {!isEnded && (
                              <div className={`absolute bottom-3 right-3 px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono shadow-sm transition-colors ${
                                isUrgent 
                                  ? 'bg-rose-500 text-white animate-pulse' 
                                  : 'bg-zinc-950/80 dark:bg-zinc-900/95 text-white'
                              }`}>
                                ⏰ {getRemainingTimeText(product.endTime, product.status)}
                              </div>
                            )}
                          </div>

                          {/* Info Body */}
                          <div className="p-5 flex flex-col flex-grow">
                            
                            {/* Product Attribute Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                              {product.attributes && product.attributes.slice(0, 3).map((attr) => (
                                <span
                                  key={attr.keyId}
                                  className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 border border-zinc-200/30 dark:border-zinc-700/30"
                                >
                                  {attr.value}
                                </span>
                              ))}
                              {(!product.attributes || product.attributes.length === 0) && (
                                <span className="px-2 py-0.5 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/50 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                                  Đặc tính thường
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors line-clamp-1 mb-1">
                              {product.title}
                            </h3>
                            
                            {/* Description */}
                            <p className="text-zinc-400 dark:text-zinc-500 text-xs line-clamp-2 leading-normal mb-4 flex-grow">
                              {product.description || 'Không có mô tả chi tiết cho sản phẩm.'}
                            </p>

                            {/* Price Grid */}
                            <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5 mb-4">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                  Giá khởi điểm
                                </span>
                                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                                  {product.startPrice.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                                  Giá hiện tại
                                </span>
                                <span className="text-xs font-black text-amber-500 mt-0.5">
                                  {product.currentPrice.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            </div>

                            {/* Action CTA */}
                            <Link
                              to={`/products/${product.id}`}
                              className={`w-full py-3 px-4 rounded-2xl font-black text-xs text-center transition-all cursor-pointer ${
                                isEnded
                                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
                                  : 'bg-zinc-950 hover:bg-amber-400 dark:bg-zinc-800 dark:hover:bg-amber-400 text-white hover:text-zinc-950 shadow-sm'
                              }`}
                            >
                              {isEnded ? 'Xem Kết Quả' : 'Đấu Giá Ngay'}
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

        </div>

      </main>
    </div>
  );
}
