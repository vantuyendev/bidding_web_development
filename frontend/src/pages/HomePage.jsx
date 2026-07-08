import React, { useState, useEffect, useRef } from 'react';
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

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [followedSearches, setFollowedSearches] = useState({});

  const catalogSectionRef = useRef(null);

  // Live ticking timer for accurate countdowns
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
        console.error("Lỗi lấy danh sách sản phẩm:", err);
        setError('Không thể kết nối tới máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    fetchFilteredProducts();
  }, [selectedCategory, activeFilters, searchTerm]);

  // Dynamic Scroll Reveal IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.05 });

    const targets = document.querySelectorAll('.reveal-on-scroll');
    targets.forEach(t => observer.observe(t));

    return () => {
      targets.forEach(t => observer.unobserve(t));
    };
  }, [products, loading]);

  // Fetch attribute keys (filters) when category changes
  const handleCategorySelect = async (category) => {
    if (selectedCategory?.id === category?.id) {
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

  // Quick navigation to category with auto-scroll
  const scrollToCatalogAndSelectCategory = (slug) => {
    const cat = categories.find(c => c.slug === slug);
    if (cat) {
      handleCategorySelect(cat);
    } else {
      setSelectedCategory(null);
    }
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  // Toggle dynamic follow for searches
  const toggleFollowSearch = (searchName) => {
    setFollowedSearches(prev => ({
      ...prev,
      [searchName]: !prev[searchName]
    }));
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

  // Dynamic products groupings matching the 3 Featured LiveAuctioneers catalogs
  const techCollection = products.filter(p => p.categoryId === 'cat-dien-thoai');
  const clockCollection = products.filter(p => p.categoryId === 'cat-dong-ho');
  const artCollection = products.filter(p => p.categoryId === 'cat-mo-hinh-anime');

  const trendingLots = products
    .filter(p => p.status === 'ACTIVE' && new Date(p.endTime).getTime() > currentTime)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans transition-colors duration-500 overflow-x-hidden selection:bg-amber-100 selection:text-amber-900">
      
      {/* Noise background overlay for authentic physical touch */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.015] z-50 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]"></div>

      {/* Hero Section - Immersive Minimal Gradient */}
      <section className="relative min-h-[85dvh] flex flex-col items-center justify-center overflow-hidden py-24 px-4 border-b border-zinc-200/40 dark:border-zinc-800/40 bg-gradient-to-b from-[#f7f3e8]/70 via-[#FDFBF7] to-[#FDFBF7] dark:from-zinc-900/40 dark:via-zinc-950 dark:to-zinc-950">
        
        {/* Glow orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-amber-200/20 dark:bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-100/30 dark:bg-rose-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10 animate-fade-in-up">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/[0.04] dark:bg-white/[0.04] border border-zinc-900/10 dark:border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 text-amber-700 dark:text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-amber-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l-.813-5.096L3 15l5.096-.813L9 9l.813 5.096L15 15l-5.187.904ZM18 10.5l-.5 2.5-2.5-.5.5-2.5 2.5.5ZM16.8 5.4l-.3 1.5-1.5-.3.3-1.5 1.5.3Z" />
            </svg>
            Let's go treasure-hunting
          </span>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-medium tracking-tight text-zinc-950 dark:text-white leading-[1.08] mb-8 max-w-4xl mx-auto">
            Sở Hữu Những Cổ Vật & <br className="hidden sm:inline" />
            <span className="italic font-normal text-amber-700 dark:text-amber-400 font-serif">Kiệt Tác Độc Bản</span>
          </h1>

          <p className="text-zinc-500 dark:text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto mb-12 leading-relaxed">
            Khám phá các phiên đấu giá cao cấp toàn cầu. Bảo hiểm ký quỹ Escrow 100% minh bạch, hỗ trợ đặt giá tự động thông minh (Proxy-Bid) và chống bắn tỉa bắn thầu (Sniping Protection).
          </p>

          {/* Big search bar */}
          <div className="w-full max-w-2xl mx-auto mb-16 p-2 rounded-[2rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 shadow-sm backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-white dark:bg-zinc-900 rounded-[calc(2rem-0.5rem)] p-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="relative flex-grow w-full flex items-center pl-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-zinc-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
                </svg>
                <input
                  type="text"
                  placeholder="Tìm kiếm tác phẩm nghệ thuật, đồ cổ, đồng hồ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-3 pr-4 py-3 bg-transparent border-none text-xs font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 outline-none"
                />
              </div>
              <button
                onClick={() => catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto bg-zinc-950 hover:bg-amber-600 dark:bg-white dark:hover:bg-amber-400 text-white dark:text-zinc-950 font-bold text-xs py-3 px-8 rounded-2xl transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                Tìm Kiếm
              </button>
            </div>
          </div>

          {/* Highlights grids */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto border-t border-zinc-200/40 dark:border-zinc-800/40 pt-10">
            <div className="text-center">
              <p className="text-2xl font-serif font-bold text-zinc-950 dark:text-white">100% Escrow</p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mt-1">Giao dịch cọc bảo vệ</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-serif font-bold text-zinc-950 dark:text-white">Proxy-Bid</p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mt-1">Đấu giá tự động</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-serif font-bold text-zinc-950 dark:text-white">SSE Realtime</p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mt-1">Nhịp sóng tức thời</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-serif font-bold text-zinc-950 dark:text-white">24/7 Dispute</p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mt-1">Khiếu nại công bằng</p>
            </div>
          </div>

        </div>
      </section>

      {/* Main Categories Section (Visual grid style LiveAuctioneers) */}
      <section className="py-24 px-4 max-w-7xl mx-auto reveal-on-scroll">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12">
          <div>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-[0.2em] block mb-2">DANH MỤC TRỌNG TÂM</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-zinc-950 dark:text-white">
              Khám Phá Theo Chủ Đề
            </h2>
          </div>
          <button 
            onClick={() => scrollToCatalogAndSelectCategory(null)}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 mt-4 sm:mt-0 underline underline-offset-4"
          >
            Tất cả danh mục
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Item 1: Interiors & Fine Art */}
          <div 
            onClick={() => scrollToCatalogAndSelectCategory('mo-hinh-anime')}
            className="group cursor-pointer rounded-[2rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 p-2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02]"
          >
            <div className="relative aspect-[3/2] overflow-hidden rounded-[calc(2rem-0.5rem)] bg-zinc-100 dark:bg-zinc-900">
              <img 
                src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&auto=format&fit=crop&q=80" 
                alt="Fine Art & Paintings" 
                className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">Mỹ Thuật & Cổ Vật</p>
                <h3 className="text-lg font-serif font-medium">Fine Art & Antiques</h3>
              </div>
            </div>
          </div>

          {/* Item 2: Design Objects */}
          <div 
            onClick={() => scrollToCatalogAndSelectCategory('dien-thoai')}
            className="group cursor-pointer rounded-[2rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 p-2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02]"
          >
            <div className="relative aspect-[3/2] overflow-hidden rounded-[calc(2rem-0.5rem)] bg-zinc-100 dark:bg-zinc-900">
              <img 
                src="https://images.unsplash.com/photo-1550226891-ef816a3ad60c?w=600&auto=format&fit=crop&q=80" 
                alt="Premium Tech & Gadgets" 
                className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">Công Nghệ & Độc Bản</p>
                <h3 className="text-lg font-serif font-medium">Flagships & Gadgets</h3>
              </div>
            </div>
          </div>

          {/* Item 3: Luxury Timepieces */}
          <div 
            onClick={() => scrollToCatalogAndSelectCategory('dong-ho')}
            className="group cursor-pointer rounded-[2rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 p-2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02]"
          >
            <div className="relative aspect-[3/2] overflow-hidden rounded-[calc(2rem-0.5rem)] bg-zinc-100 dark:bg-zinc-900">
              <img 
                src="https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=600&auto=format&fit=crop&q=80" 
                alt="Clocks & Watches" 
                className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">Đồng Hồ Cổ Điển</p>
                <h3 className="text-lg font-serif font-medium">Clocks & Timepieces</h3>
              </div>
            </div>
          </div>

          {/* Item 4: Tableware & Sculptures */}
          <div 
            onClick={() => scrollToCatalogAndSelectCategory('dong-ho')}
            className="group cursor-pointer rounded-[2rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 p-2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02]"
          >
            <div className="relative aspect-[3/2] overflow-hidden rounded-[calc(2rem-0.5rem)] bg-zinc-100 dark:bg-zinc-900">
              <img 
                src="https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=600&auto=format&fit=crop&q=80" 
                alt="Ceramics & Tableware" 
                className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">Gốm Sứ Cao Cấp</p>
                <h3 className="text-lg font-serif font-medium">Ceramics & Tableware</h3>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Featured Auctions (Simulated Collection Cards layout LiveAuctioneers) */}
      <section className="py-24 px-4 bg-[#F5F2EA]/40 dark:bg-zinc-900/30 border-y border-zinc-200/50 dark:border-zinc-800/40 reveal-on-scroll">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12">
            <div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-[0.2em] block mb-2">ĐẠI DIỆN TIÊU BIỂU</span>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-zinc-950 dark:text-white">
                Phiên Đấu Giá Nổi Bật
              </h2>
            </div>
            <button 
              onClick={() => catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 mt-4 sm:mt-0 underline underline-offset-4"
            >
              Xem tất cả
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Catalog 1: Fine Art */}
            <div className="rounded-[2.5rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 p-3 flex flex-col bg-white dark:bg-zinc-900 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.01] hover:shadow-lg">
              <div className="grid grid-cols-3 gap-2 mb-4 rounded-[1.8rem] overflow-hidden">
                <div className="col-span-2 aspect-[4/3] bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
                  <img 
                    src={artCollection[0]?.imageUrl || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500"} 
                    alt="Art Main" 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
                <div className="grid grid-rows-2 gap-2">
                  <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
                    <img 
                      src={artCollection[1]?.imageUrl || "https://images.unsplash.com/photo-1609137144814-722cb54c5f94?w=300"} 
                      alt="Art Thumb 1" 
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                  <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
                    <img 
                      src={artCollection[2]?.imageUrl || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300"} 
                      alt="Art Thumb 2" 
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-zinc-100 mb-1 hover:text-amber-700 transition-colors">
                    The Kaufman Fine Art Collection
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium mb-3">Abell Auction House</p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-4 bg-emerald-500/10 px-3 py-1 rounded-full w-max">
                    Live Saturday • 9:00 AM EDT
                  </p>
                </div>
                <button 
                  onClick={() => scrollToCatalogAndSelectCategory('mo-hinh-anime')}
                  className="w-full py-3 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs rounded-xl hover:bg-amber-600 dark:hover:bg-amber-400 dark:hover:text-zinc-950 transition-all duration-300 cursor-pointer"
                >
                  Explore Auction
                </button>
              </div>
            </div>

            {/* Catalog 2: Antiques Clocks */}
            <div className="rounded-[2.5rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 p-3 flex flex-col bg-white dark:bg-zinc-900 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.01] hover:shadow-lg">
              <div className="grid grid-cols-3 gap-2 mb-4 rounded-[1.8rem] overflow-hidden">
                <div className="col-span-2 aspect-[4/3] bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
                  <img 
                    src={clockCollection[0]?.imageUrl || "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=500"} 
                    alt="Clock Main" 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
                <div className="grid grid-rows-2 gap-2">
                  <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
                    <img 
                      src={clockCollection[1]?.imageUrl || "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=300"} 
                      alt="Clock Thumb 1" 
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                  <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
                    <img 
                      src={clockCollection[2]?.imageUrl || "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=300"} 
                      alt="Clock Thumb 2" 
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-zinc-100 mb-1 hover:text-amber-700 transition-colors">
                    European Furniture & Horology
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium mb-3">Freeman's Appraisers</p>
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-4 bg-amber-500/10 px-3 py-1 rounded-full w-max">
                    Ends from: Jul 14 • 11:00 AM
                  </p>
                </div>
                <button 
                  onClick={() => scrollToCatalogAndSelectCategory('dong-ho')}
                  className="w-full py-3 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs rounded-xl hover:bg-amber-600 dark:hover:bg-amber-400 dark:hover:text-zinc-950 transition-all duration-300 cursor-pointer"
                >
                  Explore Auction
                </button>
              </div>
            </div>

            {/* Catalog 3: High-End Tech */}
            <div className="rounded-[2.5rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 p-3 flex flex-col bg-white dark:bg-zinc-900 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.01] hover:shadow-lg">
              <div className="grid grid-cols-3 gap-2 mb-4 rounded-[1.8rem] overflow-hidden">
                <div className="col-span-2 aspect-[4/3] bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
                  <img 
                    src={techCollection[0]?.imageUrl || "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500"} 
                    alt="Tech Main" 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
                <div className="grid grid-rows-2 gap-2">
                  <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
                    <img 
                      src={techCollection[1]?.imageUrl || "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300"} 
                      alt="Tech Thumb 1" 
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                  <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
                    <img 
                      src={techCollection[2]?.imageUrl || "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=300"} 
                      alt="Tech Thumb 2" 
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-zinc-100 mb-1 hover:text-amber-700 transition-colors">
                    Flagship Tech & Design Assets
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium mb-3">Prestige Liquidation Co</p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-4 bg-emerald-500/10 px-3 py-1 rounded-full w-max">
                    Live Realtime SSE
                  </p>
                </div>
                <button 
                  onClick={() => scrollToCatalogAndSelectCategory('dien-thoai')}
                  className="w-full py-3 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs rounded-xl hover:bg-amber-600 dark:hover:bg-amber-400 dark:hover:text-zinc-950 transition-all duration-300 cursor-pointer"
                >
                  Explore Auction
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trending Items Section */}
      {trendingLots.length > 0 && (
        <section className="py-24 px-4 max-w-7xl mx-auto reveal-on-scroll">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-[0.2em] block mb-2">ĐANG NHẬN ĐẤU GIÁ NHIỀU NHẤT</span>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-zinc-950 dark:text-white">
                Sản Phẩm Xu Hướng
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trendingLots.map(lot => {
              const endsTime = new Date(lot.endTime).getTime();
              const isUrgent = (endsTime - currentTime < 15 * 60 * 1000); // 15 mins
              return (
                <div key={lot.id} className="group rounded-[2rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 p-2 flex flex-col h-full bg-white dark:bg-zinc-900 shadow-sm transition-all duration-700 hover:scale-[1.02] hover:shadow-md">
                  <div className="relative aspect-square rounded-[calc(2rem-0.5rem)] bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 overflow-hidden mb-4 border border-zinc-100 dark:border-zinc-800">
                    <img 
                      src={lot.imageUrl} 
                      alt={lot.title} 
                      className="max-h-full max-w-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                    />
                    
                    {/* Time indicator */}
                    <div className={`absolute bottom-3 right-3 px-2.5 py-1.5 rounded-xl text-[9px] font-mono font-bold shadow-sm transition-colors flex items-center gap-1.5 ${
                      isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-zinc-950/80 text-white'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span>{getRemainingTimeText(lot.endTime, lot.status)}</span>
                    </div>
                  </div>

                  <div className="px-3 pb-3 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-amber-700 transition-colors line-clamp-1 mb-1">
                        {lot.title}
                      </h3>
                      <p className="text-[10px] text-zinc-400 mb-4 line-clamp-1">{lot.description || 'Sản phẩm cao cấp'}</p>
                    </div>

                    <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800 pt-3">
                      <div>
                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Giá hiện tại</p>
                        <p className="text-xs font-black text-amber-700 dark:text-amber-400 mt-0.5">
                          {lot.currentPrice.toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                      <Link 
                        to={`/products/${lot.id}`}
                        className="py-2 px-4 rounded-xl bg-zinc-950 hover:bg-amber-600 dark:bg-white dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-[10px] font-bold transition-all duration-300 cursor-pointer"
                      >
                        Đấu Giá
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Searches to Follow Section */}
      <section className="py-24 px-4 bg-amber-50/20 dark:bg-zinc-900/10 border-t border-zinc-200/40 dark:border-zinc-800/40 reveal-on-scroll">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-[0.2em] block mb-2">QUAN TÂM ĐẶC BIỆT</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-zinc-950 dark:text-white mb-4">
              Theo Dõi Chủ Đề Bạn Yêu Thích
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-md mx-auto">
              Nhận thông báo ngay lập tức qua email & SSE khi có các vật phẩm độc bản mới thuộc các danh mục này được đăng thầu.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Search Card 1 */}
            <div className="rounded-[2.5rem] bg-white dark:bg-zinc-900 p-4 border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between items-center text-center">
              <div className="flex gap-1.5 justify-center mb-4">
                <img src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover ring-2 ring-white dark:ring-zinc-900" alt="S1" />
                <img src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover -translate-x-3 ring-2 ring-white dark:ring-zinc-900" alt="S2" />
                <img src="https://images.unsplash.com/photo-1540518614846-7eded433c457?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover -translate-x-6 ring-2 ring-white dark:ring-zinc-900" alt="S3" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-zinc-950 dark:text-white mb-1">Thiết Kế Nội Thất</h3>
                <p className="text-[10px] text-zinc-400 mb-4">8,147 items • 125 followers</p>
              </div>
              <button 
                onClick={() => toggleFollowSearch('furniture')}
                className={`py-2 px-6 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300 cursor-pointer ${
                  followedSearches['furniture'] 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {followedSearches['furniture'] ? '✓ Đang Theo Dõi' : 'Theo Dõi Chủ Đề'}
              </button>
            </div>

            {/* Search Card 2 */}
            <div className="rounded-[2.5rem] bg-white dark:bg-zinc-900 p-4 border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between items-center text-center">
              <div className="flex gap-1.5 justify-center mb-4">
                <img src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover ring-2 ring-white dark:ring-zinc-900" alt="S1" />
                <img src="https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover -translate-x-3 ring-2 ring-white dark:ring-zinc-900" alt="S2" />
                <img src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover -translate-x-6 ring-2 ring-white dark:ring-zinc-900" alt="S3" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-zinc-950 dark:text-white mb-1">Tranh Sơn Dầu Cổ</h3>
                <p className="text-[10px] text-zinc-400 mb-4">9,158 items • 416 followers</p>
              </div>
              <button 
                onClick={() => toggleFollowSearch('paintings')}
                className={`py-2 px-6 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300 cursor-pointer ${
                  followedSearches['paintings'] 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {followedSearches['paintings'] ? '✓ Đang Theo Dõi' : 'Theo Dõi Chủ Đề'}
              </button>
            </div>

            {/* Search Card 3 */}
            <div className="rounded-[2.5rem] bg-white dark:bg-zinc-900 p-4 border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between items-center text-center">
              <div className="flex gap-1.5 justify-center mb-4">
                <img src="https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover ring-2 ring-white dark:ring-zinc-900" alt="S1" />
                <img src="https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover -translate-x-3 ring-2 ring-white dark:ring-zinc-900" alt="S2" />
                <img src="https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover -translate-x-6 ring-2 ring-white dark:ring-zinc-900" alt="S3" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-zinc-950 dark:text-white mb-1">Đồng Hồ Cơ Luxury</h3>
                <p className="text-[10px] text-zinc-400 mb-4">4,379 items • 75 followers</p>
              </div>
              <button 
                onClick={() => toggleFollowSearch('watches')}
                className={`py-2 px-6 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300 cursor-pointer ${
                  followedSearches['watches'] 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {followedSearches['watches'] ? '✓ Đang Theo Dõi' : 'Theo Dõi Chủ Đề'}
              </button>
            </div>

            {/* Search Card 4 */}
            <div className="rounded-[2.5rem] bg-white dark:bg-zinc-900 p-4 border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between items-center text-center">
              <div className="flex gap-1.5 justify-center mb-4">
                <img src="https://images.unsplash.com/photo-1609137144814-722cb54c5f94?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover ring-2 ring-white dark:ring-zinc-900" alt="S1" />
                <img src="https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover -translate-x-3 ring-2 ring-white dark:ring-zinc-900" alt="S2" />
                <img src="https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=100&auto=format&fit=crop" className="w-12 h-12 rounded-xl object-cover -translate-x-6 ring-2 ring-white dark:ring-zinc-900" alt="S3" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-zinc-950 dark:text-white mb-1">Cổ Vật & Đồ Gốm Lam</h3>
                <p className="text-[10px] text-zinc-400 mb-4">12,410 items • 228 followers</p>
              </div>
              <button 
                onClick={() => toggleFollowSearch('ceramics')}
                className={`py-2 px-6 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300 cursor-pointer ${
                  followedSearches['ceramics'] 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {followedSearches['ceramics'] ? '✓ Đang Theo Dõi' : 'Theo Dõi Chủ Đề'}
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Featured Auction Houses / Sellers */}
      <section className="py-24 px-4 max-w-7xl mx-auto reveal-on-scroll">
        <h3 className="text-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-12">ĐỐI TÁC ĐẤU GIÁ LIÊN KẾT UY TÍN</h3>
        <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 dark:opacity-40 font-serif">
          <div className="text-center text-lg font-black tracking-widest text-zinc-900 dark:text-white">BONHAMS</div>
          <div className="text-center text-lg font-black tracking-widest text-zinc-900 dark:text-white">DOYLE</div>
          <div className="text-center text-lg font-black tracking-widest text-zinc-900 dark:text-white">ABELL</div>
          <div className="text-center text-lg font-black tracking-widest text-zinc-900 dark:text-white">WRIGHT</div>
          <div className="text-center text-lg font-black tracking-widest text-zinc-900 dark:text-white">NAZMIYAL</div>
          <div className="text-center text-lg font-black tracking-widest text-zinc-900 dark:text-white">CHAIRISH</div>
        </div>
      </section>

      {/* Catalog Search, Filtering, and Main Products Grid (Refactored Live Catalog Area) */}
      <section ref={catalogSectionRef} className="py-24 px-4 bg-white dark:bg-[#070708] border-t border-zinc-200/50 dark:border-zinc-900/60 transition-colors duration-500">
        <div className="max-w-7xl mx-auto">
          
          <div className="mb-12">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-[0.2em] block mb-2">LIVE BIDDING CATALOG</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-zinc-950 dark:text-white mb-6">
              Sàn Đấu Giá Trực Tuyến
            </h2>
            
            {/* Category horizontal topbar */}
            <div className="flex flex-wrap gap-2.5 pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <button
                onClick={() => handleCategorySelect(null)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-500 cursor-pointer border flex items-center gap-1.5 ${
                  !selectedCategory
                    ? 'bg-zinc-950 border-zinc-950 text-white dark:bg-white dark:border-white dark:text-zinc-950 shadow-md scale-102'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200/40 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
                </svg>
                <span>Tất cả sản phẩm</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-500 cursor-pointer border flex items-center gap-1.5 ${
                    selectedCategory?.id === cat.id
                      ? 'bg-zinc-950 border-zinc-950 text-white dark:bg-white dark:border-white dark:text-zinc-950 shadow-md scale-102'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200/40 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.5 1.5 0 0 0 2.122 0l4.318-4.318a1.5 1.5 0 0 0 0-2.122L10.15 3.659A2.25 2.25 0 0 0 9.568 3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                  </svg>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtering bar, search and sort */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center mb-10 bg-zinc-50 dark:bg-zinc-900/30 p-4 rounded-[2rem] border border-zinc-200/40 dark:border-zinc-800/40">
            
            {/* Tabs */}
            <div className="flex bg-zinc-200/30 dark:bg-zinc-800/30 p-1.5 rounded-2xl w-full lg:w-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 lg:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                Tất cả đấu giá
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 lg:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'active'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Đang diễn ra</span>
              </button>
              <button
                onClick={() => setActiveTab('ended')}
                className={`flex-1 lg:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'ended'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h1.5m9.75 0H18M3 21h1.5m9.75 0H18M3 9h1.5m9.75 0H18M3 15h1.5m9.75 0H18m-9-12v18" />
                </svg>
                <span>Đã kết thúc</span>
              </button>
            </div>

            {/* Search box and Sort Selection */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Lọc từ khóa sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:border-amber-500 transition-colors"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-zinc-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
                  </svg>
                </div>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:border-amber-500 transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300"
              >
                <option value="newest">Xếp theo: Mới nhất</option>
                <option value="price-asc">Giá: Thấp đến Cao</option>
                <option value="price-desc">Giá: Cao đến Thấp</option>
              </select>
            </div>

          </div>

          {/* Product grid layout: Sidebar filters + products */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Sidebar dynamic attribute filters */}
            {selectedCategory && availableFilters.length > 0 && (
              <aside className="w-full md:w-64 flex-shrink-0 bg-zinc-50 dark:bg-zinc-900/20 p-6 rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm self-start">
                <div className="flex items-center justify-between border-b border-zinc-200/40 dark:border-zinc-800 pb-3.5 mb-6">
                  <h3 className="font-serif font-bold text-sm text-zinc-950 dark:text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                    </svg>
                    <span>Thuộc tính lọc</span>
                  </h3>
                  {Object.keys(activeFilters).length > 0 && (
                    <button
                      onClick={() => setActiveFilters({})}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                    >
                      Bỏ lọc
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {availableFilters.map((filter) => (
                    <div key={filter.id} className="space-y-2.5">
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
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
                                  className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
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

            {/* Grid display products */}
            <div className="flex-grow w-full">
              {loading && (
                <div className="py-24 text-center">
                  <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-zinc-400 text-xs font-semibold">Đang liên kết dữ liệu thầu...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30 text-red-600 dark:text-red-400 p-8 rounded-[2rem] text-center max-w-md mx-auto my-12">
                  <p className="font-bold mb-2 text-sm">Lỗi đồng bộ máy chủ</p>
                  <p className="text-xs">{error}</p>
                </div>
              )}

              {!loading && !error && (
                <>
                  {processedProducts.length === 0 ? (
                    <div className="py-24 bg-zinc-50/50 dark:bg-zinc-900/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] text-center max-w-lg mx-auto flex flex-col items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-zinc-400 mb-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                      </svg>
                      <h3 className="text-base font-serif font-bold text-zinc-800 dark:text-zinc-200 mb-1">Không tìm thấy vật phẩm</h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-xs">Vui lòng thay đổi từ khóa hoặc điều kiện bộ lọc thuộc tính.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {processedProducts.map((product) => {
                        const isEnded = product.status === 'ENDED' || product.status === 'ended' || product.status === 'RESOLVED' || new Date(product.endTime).getTime() <= currentTime;
                        const hasBuyNow = product.buyNowPrice !== null && product.buyNowPrice !== undefined;
                        const isUrgent = !isEnded && (new Date(product.endTime).getTime() - currentTime < 5 * 60 * 1000);

                        return (
                          <div
                            key={product.id}
                            className="group rounded-[2rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/50 dark:border-zinc-800 p-2 flex flex-col h-full bg-white dark:bg-zinc-900 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02] hover:shadow-lg"
                          >
                            
                            {/* Inner core - concentric nested design */}
                            <div className="rounded-[calc(2rem-0.5rem)] overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex flex-col h-full">
                              
                              {/* Product Image Box */}
                              <div className="relative aspect-[4/3] flex items-center justify-center p-6 border-b border-zinc-200/30 dark:border-zinc-800/40 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
                                {product.imageUrl ? (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.title}
                                    className="max-h-full max-w-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="text-zinc-400 flex flex-col items-center gap-1.5 select-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-zinc-400">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                    </svg>
                                    <span className="text-[10px] font-bold">Chưa tải ảnh</span>
                                  </div>
                                )}

                                {/* Status tags overlay */}
                                <div className="absolute top-3 left-3 flex flex-wrap gap-1 max-w-[80%]">
                                  {isEnded ? (
                                    <span className="px-2.5 py-1 rounded-full bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-wider">
                                      Hết hạn
                                    </span>
                                  ) : product.status === 'DISPUTED' ? (
                                    <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-rose-500">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 8.25h18M5.25 8.25C5.25 12.375 7.5 15 12 15s6.75-2.625 6.75-6.75M12 3l-1.5 1.5M12 3l1.5 1.5" />
                                      </svg>
                                      Tranh chấp
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      Đang diễn ra
                                    </span>
                                  )}
                                </div>

                                <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                                  {hasBuyNow && (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-2.5 h-2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                                      </svg>
                                      Mua thầu
                                    </span>
                                  )}
                                </div>

                                {/* Live Timer */}
                                {!isEnded && (
                                  <div className={`absolute bottom-3 right-3 px-2.5 py-1.5 rounded-xl text-[9px] font-mono font-bold shadow-sm transition-colors flex items-center gap-1 ${
                                    isUrgent 
                                      ? 'bg-rose-500 text-white animate-pulse' 
                                      : 'bg-zinc-950/80 text-white'
                                  }`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                    <span>{getRemainingTimeText(product.endTime, product.status)}</span>
                                  </div>
                                )}
                              </div>

                              {/* Card Content body */}
                              <div className="p-5 flex flex-col flex-grow bg-white dark:bg-zinc-900 justify-between rounded-b-[calc(2rem-0.5rem)]">
                                <div>
                                  {/* Attribute key-value previews */}
                                  <div className="flex flex-wrap gap-1 mb-2.5">
                                    {product.attributes && product.attributes.slice(0, 2).map((attr) => (
                                      <span
                                        key={attr.keyId}
                                        className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 border border-zinc-200/20 dark:border-zinc-700/20"
                                      >
                                        {attr.value}
                                      </span>
                                    ))}
                                    {(!product.attributes || product.attributes.length === 0) && (
                                      <span className="px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-850 text-[9px] font-bold text-zinc-400 dark:text-zinc-500">
                                        Chuẩn mực
                                      </span>
                                    )}
                                  </div>

                                  <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-amber-700 transition-colors line-clamp-1 mb-1.5">
                                    {product.title}
                                  </h3>
                                  
                                  <p className="text-zinc-400 dark:text-zinc-500 text-[10px] line-clamp-2 leading-relaxed mb-4">
                                    {product.description || 'Vật phẩm độc bản đang đấu giá.'}
                                  </p>
                                </div>

                                <div>
                                  {/* Bid Pricing box */}
                                  <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5 mb-4">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                        Khởi điểm
                                      </span>
                                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        {product.startPrice.toLocaleString('vi-VN')} đ
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[8px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                        Hiện tại
                                      </span>
                                      <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 mt-0.5">
                                        {product.currentPrice.toLocaleString('vi-VN')} đ
                                      </span>
                                    </div>
                                  </div>

                                  {/* Action CTA link */}
                                  <Link
                                    to={`/products/${product.id}`}
                                    className={`w-full py-3 px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider text-center block transition-all duration-300 cursor-pointer ${
                                      isEnded
                                        ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                                        : 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-amber-600 dark:hover:bg-amber-400 hover:text-white dark:hover:text-zinc-950 shadow-sm'
                                    }`}
                                  >
                                    {isEnded ? 'Kết quả thầu' : 'Đấu giá ngay'}
                                  </Link>
                                </div>

                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
