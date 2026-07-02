import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-neutral-950 text-white py-16 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 xl:px-8 text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-neutral-900 text-neutral-300 text-xs font-bold uppercase tracking-wider mb-6 border border-neutral-800">
            ⚡ SÀN ĐẤU GIÁ REALTIME
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight max-w-4xl mx-auto mb-6 text-white">
            Đấu Giá Tự Động & Sở Hữu <span className="text-neutral-300">Vật Phẩm Độc Bản</span>
          </h1>
          <p className="text-neutral-400 text-sm md:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Hỗ trợ cơ chế cọc bảo vệ Escrow, tự động đè giá thông minh (Auto Proxy-Bid), chống bắn tỉa bắn thầu (Sniping Protection) cùng phán quyết khiếu nại minh bạch bởi Admin.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-neutral-900 pt-8 text-center">
            <div>
              <p className="text-xl md:text-2xl font-black text-white">Escrow</p>
              <p className="text-[10px] text-neutral-500 font-bold mt-1">Đóng băng cọc 10%</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black text-white">Proxy Bid</p>
              <p className="text-[10px] text-neutral-500 font-bold mt-1">Đặt giá tự động</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black text-white">Live SSE</p>
              <p className="text-[10px] text-neutral-500 font-bold mt-1">Cập nhật giá realtime</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-black text-white">Dispute</p>
              <p className="text-[10px] text-neutral-500 font-bold mt-1">Kháng nghị hoàn tiền</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Area */}
      <main className="max-w-7xl mx-auto px-4 xl:px-8 py-10">
        
        {/* Category Horizontal Topbar */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-3">Danh mục sản phẩm</h2>
          <div className="flex flex-wrap gap-2.5 pb-2">
            <button
              onClick={() => handleCategorySelect(null)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer border ${
                !selectedCategory
                  ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-950'
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              🌐 Tất cả sản phẩm
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat)}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer border ${
                  selectedCategory?.id === cat.id
                    ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-950'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                🏷️ {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Selection, Search and Sort Panel */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center mb-8 bg-white dark:bg-neutral-900 p-4 rounded-md border border-neutral-200 dark:border-neutral-800">
          
          {/* Tabs */}
          <div className="flex bg-neutral-100 dark:bg-neutral-950 p-1 rounded-md w-full lg:w-auto border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 lg:flex-initial px-5 py-2 rounded-sm text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-neutral-950 dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 lg:flex-initial px-5 py-2 rounded-sm text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-neutral-950 dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
              }`}
            >
              🔥 Đang diễn ra
            </button>
            <button
              onClick={() => setActiveTab('ended')}
              className={`flex-1 lg:flex-initial px-5 py-2 rounded-sm text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'ended'
                  ? 'bg-white text-neutral-950 dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
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
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-xs font-semibold outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-455">🔍</span>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-xs font-semibold outline-none focus:border-neutral-900 dark:focus:border-white transition-colors cursor-pointer"
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
            <aside className="w-full md:w-64 flex-shrink-0 bg-white dark:bg-neutral-900 p-6 rounded-md border border-neutral-200 dark:border-neutral-800 self-start">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4">
                <h3 className="font-extrabold text-sm text-neutral-950 dark:text-white flex items-center gap-1.5">
                  <span>⚙️</span> Bộ lọc thuộc tính
                </h3>
                {Object.keys(activeFilters).length > 0 && (
                  <button
                    onClick={() => setActiveFilters({})}
                    className="text-[10px] font-bold text-neutral-900 hover:underline dark:text-neutral-100"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {availableFilters.map((filter) => (
                  <div key={filter.id} className="space-y-2.5">
                    <h4 className="text-xs font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                      {filter.name}
                    </h4>
                    
                    {filter.options && filter.options.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {filter.options.map((option) => {
                          const isChecked = activeFilters[filter.id]?.includes(option) || false;
                          return (
                            <label
                              key={option}
                              className="flex items-center gap-2.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer select-none font-medium"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleFilterChange(filter.id, option, e.target.checked)}
                                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer accent-neutral-900"
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-neutral-500 italic">Không có tùy chọn</p>
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
                <div className="w-12 h-12 border-4 border-neutral-900 border-t-transparent dark:border-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-neutral-500 font-medium">Đang tìm kiếm đấu giá phù hợp...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30 text-red-600 dark:text-red-400 p-6 rounded-md text-center max-w-md mx-auto my-12">
                <p className="font-bold mb-2">Đã xảy ra lỗi</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                {processedProducts.length === 0 ? (
                  <div className="py-24 bg-white dark:bg-neutral-900/40 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-md text-center max-w-lg mx-auto">
                    <span className="text-4xl mb-4 block">📦</span>
                    <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200 mb-1">Không tìm thấy sản phẩm phù hợp</h3>
                    <p className="text-neutral-500 text-xs">Vui lòng thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc thuộc tính.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {processedProducts.map((product) => {
                      const isEnded = product.status === 'ENDED' || product.status === 'ended' || product.status === 'RESOLVED' || new Date(product.endTime).getTime() <= currentTime;
                      const hasBuyNow = product.buyNowPrice !== null && product.buyNowPrice !== undefined;
                      
                      // Highlight countdown in red if remaining time is under 24 hours
                      const diffTime = new Date(product.endTime).getTime() - currentTime;
                      const under24h = !isEnded && diffTime > 0 && diffTime < 24 * 60 * 60 * 1000;

                      return (
                        <div
                          key={product.id}
                          className="bg-white dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-800 flex flex-col h-full relative"
                        >
                          {/* Image Container: Aspect 16:9, rounded-t-md */}
                          <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center border-b border-neutral-200 dark:border-neutral-800 overflow-hidden rounded-t-md">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-neutral-400 flex flex-col items-center gap-1.5">
                                <span className="text-3xl">🖼️</span>
                                <span className="text-[10px] font-medium">Chưa có ảnh</span>
                              </div>
                            )}

                            {/* Status Badge */}
                            <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[80%]">
                              {isEnded ? (
                                <span className="px-2 py-0.5 rounded-sm bg-neutral-500/90 text-white text-[9px] font-bold uppercase tracking-wider">
                                  Đã kết thúc
                                </span>
                              ) : product.status === 'DISPUTED' ? (
                                <span className="px-2 py-0.5 rounded-sm bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                  ⚖️ Tranh chấp
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-sm bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                  Đang diễn ra
                                </span>
                              )}
                            </div>

                            {/* Buy Now Badge */}
                            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                              {hasBuyNow && (
                                <span className="px-1.5 py-0.5 rounded-sm bg-neutral-900 text-white text-[9px] font-bold uppercase tracking-wider">
                                  ⚡ Mua đứt
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Info Body */}
                          <div className="p-4 flex flex-col flex-grow">
                            
                            {/* Product Attribute Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {product.attributes && product.attributes.slice(0, 2).map((attr) => (
                                <span
                                  key={attr.keyId}
                                  className="px-1.5 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-[9px] font-bold text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-750"
                                >
                                  {attr.value}
                                </span>
                              ))}
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white leading-tight line-clamp-1 mb-1.5">
                              {product.title}
                            </h3>
                            
                            {/* Description */}
                            <p className="text-neutral-500 dark:text-neutral-400 text-xs line-clamp-2 leading-normal mb-4 flex-grow">
                              {product.description || 'Không có mô tả chi tiết cho sản phẩm.'}
                            </p>

                            {/* Price & Countdown Container: side by side horizontally */}
                            <div className="flex items-center justify-between gap-2 border-t border-neutral-200 dark:border-neutral-800 pt-3 mb-4">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                                  Giá hiện tại
                                </span>
                                <span className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">
                                  {product.currentPrice.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                                  Thời gian
                                </span>
                                {!isEnded ? (
                                  <div className={`mt-0.5 px-2 py-0.5 rounded-sm text-xs font-bold font-mono ${
                                    under24h 
                                      ? 'bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400 border border-red-100' 
                                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                                  }`}>
                                    {getRemainingTimeText(product.endTime, product.status)}
                                  </div>
                                ) : (
                                  <div className="mt-0.5 px-2 py-0.5 rounded-sm text-xs font-bold bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                                    Đã kết thúc
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action CTA Button */}
                            <Link
                              to={`/products/${product.id}`}
                              className={`w-full py-2 px-4 rounded-md font-bold text-xs text-center transition-colors duration-200 cursor-pointer ${
                                isEnded
                                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300'
                                  : 'bg-neutral-900 hover:bg-neutral-850 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white'
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
