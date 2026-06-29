import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { getApiUrl } from '../api';


export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'ended'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'price-asc', 'price-desc'

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(getApiUrl('/api/products'), {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          setProducts(data.data);
        } else {
          setError(data.error || 'Không thể tải danh sách sản phẩm.');
        }
      } catch (err) {
        setError('Đã xảy ra lỗi khi kết nối với máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Format remaining time for cards
  const getRemainingTimeText = (endTime, status) => {
    const isEnded = status === 'ENDED' || status === 'ended' || new Date(endTime).getTime() <= Date.now();
    if (isEnded) return 'Đã kết thúc';

    const diff = new Date(endTime).getTime() - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);

    if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
    if (hours > 0) return `Còn ${hours} giờ ${minutes} phút`;
    return `Còn ${minutes} phút`;
  };

  // Filter & Sort Products
  const filteredProducts = products
    .filter((product) => {
      // 1. Search term filter
      const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Tab filter
      const isEnded = product.status === 'ENDED' || product.status === 'ended' || new Date(product.endTime).getTime() <= Date.now();
      let matchesTab = true;
      if (activeTab === 'active') {
        matchesTab = !isEnded;
      } else if (activeTab === 'ended') {
        matchesTab = isEnded;
      }

      return matchesSearch && matchesTab;
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
      <section className="relative overflow-hidden bg-zinc-900 text-zinc-100 py-16 md:py-24 border-b border-zinc-800">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-6 border border-amber-500/20">
            ⚡ ĐẤU GIÁ TRỰC TUYẾN REALTIME
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto mb-6 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Khám phá & Đấu giá các <span className="text-amber-400">Vật phẩm độc bản</span>
          </h1>
          <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Sàn đấu giá công nghệ và nghệ thuật cao cấp. Đặt giá an toàn, cập nhật thời gian thực tế với công nghệ Live Streamed Events bảo vệ người dùng tối đa.
          </p>

          {/* Quick Stats or Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-zinc-800 pt-10 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-black text-white">0%</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Phí người dùng</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-white">100%</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Bảo vệ Sniping</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-white">Realtime</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Hỗ trợ Live SSE</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-white">Ví ảo</p>
              <p className="text-xs text-zinc-500 font-medium mt-1">Được cấp sẵn 10M</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Controls Layout */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-10">
          {/* Tab Filter */}
          <div className="flex bg-zinc-200/60 dark:bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-zinc-900 shadow-md dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-zinc-900 shadow-md dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              Đang diễn ra
            </button>
            <button
              onClick={() => setActiveTab('ended')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ended'
                  ? 'bg-white text-zinc-900 shadow-md dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              Đã kết thúc
            </button>
          </div>

          {/* Search & Sort Panel */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold outline-none focus:border-amber-500 transition-colors"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value="newest">Mới nhất</option>
              <option value="price-asc">Giá: Thấp đến Cao</option>
              <option value="price-desc">Giá: Cao đến Thấp</option>
            </select>
          </div>
        </div>

        {/* Loading and Error states */}
        {loading && (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-500 font-medium">Đang tải danh sách đấu giá...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30 text-red-600 dark:text-red-400 p-6 rounded-3xl text-center max-w-md mx-auto my-12">
            <p className="font-bold mb-2">Đã xảy ra lỗi</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <>
            {filteredProducts.length === 0 ? (
              <div className="py-24 bg-white dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center max-w-lg mx-auto">
                <span className="text-4xl mb-4 block">📦</span>
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-1">Không tìm thấy sản phẩm</h3>
                <p className="text-zinc-500 text-xs">Vui lòng thử tìm kiếm khác hoặc đổi bộ lọc trạng thái.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => {
                  const isEnded = product.status === 'ENDED' || product.status === 'ended' || new Date(product.endTime).getTime() <= Date.now();
                  return (
                    <div
                      key={product.id}
                      className="group bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-md hover:shadow-xl border border-zinc-100 dark:border-zinc-800/80 transition-all duration-300 flex flex-col h-full"
                    >
                      {/* Product Image and Badge */}
                      <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-6 border-b border-zinc-100 dark:border-zinc-800/50 overflow-hidden">
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
                        <div className="absolute top-4 left-4">
                          {isEnded ? (
                            <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                              Đã kết thúc
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Đang diễn ra
                            </span>
                          )}
                        </div>

                        {/* Countdown Badge */}
                        {!isEnded && (
                          <div className="absolute bottom-4 right-4 bg-zinc-950/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono">
                            ⏰ {getRemainingTimeText(product.endTime, product.status)}
                          </div>
                        )}
                      </div>

                      {/* Info Body */}
                      <div className="p-6 flex flex-col flex-grow">
                        <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-50 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors line-clamp-1 mb-2">
                          {product.title}
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-xs line-clamp-2 leading-relaxed mb-6 flex-grow">
                          {product.description || 'Không có mô tả chi tiết cho sản phẩm này.'}
                        </p>

                        {/* Pricing section */}
                        <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mb-6">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                              Giá khởi điểm
                            </span>
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 mt-0.5">
                              {product.startPrice.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                              Giá hiện tại
                            </span>
                            <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                              {product.currentPrice.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>

                        {/* Action CTA Button */}
                        <Link
                          to={`/products/${product.id}`}
                          className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs text-center transition-all cursor-pointer ${
                            isEnded
                              ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
                              : 'bg-zinc-900 hover:bg-amber-500 dark:bg-zinc-800 dark:hover:bg-amber-600 text-white hover:text-zinc-950 font-black shadow-md'
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
      </main>
    </div>
  );
}
