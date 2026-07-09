import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getApiUrl } from '../../api';
import ProductCard from '../../components/ProductCard';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';
import Button from '../../components/ui/Button';

function mapProduct(p) {
  return {
    id: p.id,
    title: p.title,
    imageUrl: p.imageUrl || p.image_url,
    currentPrice: parseFloat(p.currentPrice ?? p.current_price ?? p.startPrice ?? p.start_price ?? 0),
    startPrice: parseFloat(p.startPrice ?? p.start_price ?? 0),
    buyNowPrice: p.buyNowPrice ?? p.buy_now_price ?? null,
    endTime: p.endTime ?? p.end_time,
    startTime: p.startTime ?? p.start_time,
    status: p.status,
    bidCount: p.bidCount ?? p.bid_count ?? p._count?.bids ?? 0,
    sellerName: p.seller?.name || p.seller?.email || p.sellerName || null,
    categoryName: p.category?.name || p.categoryName || null,
    categoryId: p.categoryId ?? p.category_id,
    categorySlug: p.category?.slug || null,
  };
}

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Mới nhất' },
  { value: 'ending',     label: 'Sắp kết thúc' },
  { value: 'price-asc',  label: 'Giá: Thấp → Cao' },
  { value: 'price-desc', label: 'Giá: Cao → Thấp' },
  { value: 'bids',       label: 'Nhiều lượt đặt nhất' },
];

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL Params
  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const statusParam = searchParams.get('status') || 'all';
  const sortParam = searchParams.get('sort') || 'newest';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';

  // Local state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tempMinPrice, setTempMinPrice] = useState(minPriceParam);
  const [tempMaxPrice, setTempMaxPrice] = useState(maxPriceParam);

  // Sync temp inputs with url params
  useEffect(() => {
    setTempMinPrice(minPriceParam);
    setTempMaxPrice(maxPriceParam);
  }, [minPriceParam, maxPriceParam]);

  // Fetch categories and products
  useEffect(() => {
    setLoading(true);
    
    const fetchAll = async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch(getApiUrl('/api/categories')),
          fetch(getApiUrl('/api/products')),
        ]);
        const catData = await catRes.json();
        const prodData = await prodRes.json();
        
        if (catData.success) setCategories(catData.data);
        if (prodData.success) setProducts(prodData.data.map(mapProduct));
      } catch (err) {
        console.error('Lỗi tải dữ liệu Catalog:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAll();
  }, []);

  // Update a single query param
  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handlePriceFilter = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (tempMinPrice) newParams.set('minPrice', tempMinPrice);
    else newParams.delete('minPrice');
    
    if (tempMaxPrice) newParams.set('maxPrice', tempMaxPrice);
    else newParams.delete('maxPrice');
    
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
    setTempMinPrice('');
    setTempMaxPrice('');
  };

  // Filter & Sort logic in JS
  const now = Date.now();
  const filteredProducts = products
    .filter((p) => {
      // Search search term
      if (queryParam && !p.title.toLowerCase().includes(queryParam.toLowerCase()) && 
          !(p.sellerName && p.sellerName.toLowerCase().includes(queryParam.toLowerCase()))) {
        return false;
      }
      
      // Category filter
      if (categoryParam && p.categorySlug !== categoryParam) {
        return false;
      }
      
      // Status filter
      const isEnded = ['ENDED','COMPLETED','PAID','SHIPPED','CANCELLED','UNSOLD'].includes(p.status)
        || (p.endTime && new Date(p.endTime).getTime() <= now);
      
      const isUpcoming = p.startTime && new Date(p.startTime).getTime() > now;
      
      if (statusParam === 'active') {
        if (isEnded || isUpcoming) return false;
      } else if (statusParam === 'ended') {
        if (!isEnded) return false;
      } else if (statusParam === 'upcoming') {
        if (!isUpcoming) return false;
      }

      // Price filter
      if (minPriceParam && p.currentPrice < parseFloat(minPriceParam)) {
        return false;
      }
      if (maxPriceParam && p.currentPrice > parseFloat(maxPriceParam)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortParam === 'newest')     return new Date(b.startTime) - new Date(a.startTime);
      if (sortParam === 'ending')     return new Date(a.endTime) - new Date(b.endTime);
      if (sortParam === 'price-asc')  return a.currentPrice - b.currentPrice;
      if (sortParam === 'price-desc') return b.currentPrice - a.currentPrice;
      if (sortParam === 'bids')       return (b.bidCount || 0) - (a.bidCount || 0);
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 select-none text-left">
      
      {/* Title / Info Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-neutral-200/50 pb-5 mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {queryParam ? `Kết quả tìm kiếm cho "${queryParam}"` : 'Danh mục Đấu giá'}
          </h1>
          <p className="text-[10px] text-neutral-400 mt-1">
            Tìm thấy {filteredProducts.length} sản phẩm phù hợp
          </p>
        </div>

        {/* Sort drop down */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400 font-semibold whitespace-nowrap">Sắp xếp:</span>
          <select
            value={sortParam}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 bg-transparent text-neutral-900 dark:text-white focus:outline-none text-xs cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-60 flex-shrink-0 space-y-6">
          
          {/* Category Filter */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-250/10 dark:border-neutral-800/80 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-white tracking-wider uppercase">Danh mục</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => updateParam('category', '')}
                className={`text-xs text-left py-1.5 transition-colors cursor-pointer ${
                  !categoryParam
                    ? 'font-bold text-[hsl(196,100%,36%)]'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Tất cả sản phẩm
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => updateParam('category', cat.slug)}
                  className={`text-xs text-left py-1.5 transition-colors cursor-pointer ${
                    categoryParam === cat.slug
                      ? 'font-bold text-[hsl(196,100%,36%)]'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-250/10 dark:border-neutral-800/80 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-white tracking-wider uppercase">Trạng thái phiên</h3>
            <div className="flex flex-col gap-2">
              {[
                { value: 'all', label: 'Tất cả phiên' },
                { value: 'active', label: 'Đang diễn ra (Live)' },
                { value: 'upcoming', label: 'Sắp diễn ra' },
                { value: 'ended', label: 'Đã kết thúc' },
              ].map((st) => (
                <button
                  key={st.value}
                  onClick={() => updateParam('status', st.value)}
                  className={`text-xs text-left py-1.5 transition-colors cursor-pointer ${
                    statusParam === st.value
                      ? 'font-bold text-[hsl(196,100%,36%)]'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Filter */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-250/10 dark:border-neutral-800/80 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-white tracking-wider uppercase">Khoảng giá</h3>
            <form onSubmit={handlePriceFilter} className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min (đ)"
                  value={tempMinPrice}
                  onChange={(e) => setTempMinPrice(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none"
                />
                <span className="text-neutral-400">—</span>
                <input
                  type="number"
                  placeholder="Max (đ)"
                  value={tempMaxPrice}
                  onChange={(e) => setTempMaxPrice(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>
              <Button type="submit" size="sm" className="w-full text-center py-1.5">
                Áp dụng
              </Button>
            </form>
          </div>

          {/* Reset Filters button */}
          {(queryParam || categoryParam || statusParam !== 'all' || minPriceParam || maxPriceParam) && (
            <button
              onClick={clearFilters}
              className="w-full text-center text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 rounded-xl py-2 cursor-pointer transition-colors"
            >
              ✕ Xóa bộ lọc
            </button>
          )}

        </aside>

        {/* Products Grid */}
        <div className="flex-1 w-full">
          {loading ? (
            <SkeletonGrid count={8} />
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400 text-xs">
              📌 Không tìm thấy sản phẩm nào khớp với bộ lọc của bạn.
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
