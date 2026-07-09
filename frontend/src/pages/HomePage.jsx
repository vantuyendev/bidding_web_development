import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getApiUrl } from '../api';
import HeroBanner from '../components/HeroBanner';
import CategoryShelf from '../components/CategoryShelf';
import ProductCard from '../components/ProductCard';
import { SkeletonGrid } from '../components/ui/SkeletonCard';

/* ── Helper ──────────────────────────────────────────────── */
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
  };
}

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'ending',     label: 'Ending Soon' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'bids',       label: 'Most Bids' },
];

const STATUS_TABS = [
  { value: 'all',    label: 'All Items' },
  { value: 'active', label: 'Active' },
  { value: 'ended',  label: 'Ended' },
];

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam        = searchParams.get('q') || '';
  const catParam      = searchParams.get('category') || '';
  const tabParam      = searchParams.get('tab') || 'all';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab]   = useState(tabParam);
  const [sortBy, setSortBy]         = useState('newest');
  const [searchTerm, setSearchTerm] = useState(qParam);
  const [selectedCat, setSelectedCat] = useState(catParam);

  const [availableFilters, setAvailableFilters] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});

  const catalogRef = useRef(null);
  const searchDebounce = useRef(null);

  // Sync URL params ↔ state
  useEffect(() => {
    setSearchTerm(qParam);
    setSelectedCat(catParam);
    setActiveTab(tabParam || 'all');
  }, [qParam, catParam, tabParam]);

  // Fetch categories
  useEffect(() => {
    fetch(getApiUrl('/api/categories'))
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data); })
      .catch(() => {});
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let url = getApiUrl('/api/products/search?limit=60');
      if (searchTerm)  url += `&q=${encodeURIComponent(searchTerm)}`;
      if (selectedCat) url += `&categorySlug=${encodeURIComponent(selectedCat)}`;
      if (Object.keys(activeFilters).length)
        url += `&filters=${encodeURIComponent(JSON.stringify(activeFilters))}`;

      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.map(mapProduct));
        setError(null);
      } else {
        setError(data.error || 'Failed to load products.');
      }
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCat, activeFilters]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('active')),
      { threshold: 0.05 }
    );
    document.querySelectorAll('.reveal-on-scroll').forEach(t => observer.observe(t));
    return () => observer.disconnect();
  }, [products, loading]);

  // Fetch filters for category
  const handleCategorySelect = async (cat) => {
    const slug = cat ? cat.slug : '';
    setSelectedCat(slug);
    setActiveFilters({});
    const params = new URLSearchParams(searchParams);
    if (slug) params.set('category', slug); else params.delete('category');
    setSearchParams(params);
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (slug) {
      try {
        const res = await fetch(getApiUrl(`/api/products/filters?categorySlug=${slug}`));
        const data = await res.json();
        if (data.success) setAvailableFilters(data.data.filters || []);
      } catch {}
    } else {
      setAvailableFilters([]);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    if (tab === 'all') params.delete('tab'); else params.set('tab', tab);
    setSearchParams(params);
  };

  const handleFilterChange = (keyId, option, checked) => {
    setActiveFilters(prev => {
      const cur = prev[keyId] || [];
      const next = checked ? [...cur, option] : cur.filter(v => v !== option);
      const upd = { ...prev };
      if (next.length) upd[keyId] = next; else delete upd[keyId];
      return upd;
    });
  };

  // Processed / sorted products
  const now = Date.now();
  const processedProducts = products
    .filter(p => {
      const isEnded = ['ENDED','COMPLETED','PAID','SHIPPED','CANCELLED','UNSOLD'].includes(p.status)
        || (p.endTime && new Date(p.endTime).getTime() <= now);
      if (activeTab === 'active') return !isEnded;
      if (activeTab === 'ended')  return isEnded;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest')     return new Date(b.startTime) - new Date(a.startTime);
      if (sortBy === 'ending')     return new Date(a.endTime) - new Date(b.endTime);
      if (sortBy === 'price-asc')  return a.currentPrice - b.currentPrice;
      if (sortBy === 'price-desc') return b.currentPrice - a.currentPrice;
      if (sortBy === 'bids')       return (b.bidCount || 0) - (a.bidCount || 0);
      return 0;
    });

  const activeProducts  = products.filter(p => p.status === 'ACTIVE' && p.endTime && new Date(p.endTime) > now);
  const featuredItems   = activeProducts.slice(0, 3);
  const endingSoonItems = [...activeProducts].sort((a, b) => new Date(a.endTime) - new Date(b.endTime)).slice(0, 8);
  const trendingItems   = [...activeProducts].sort((a, b) => (b.bidCount || 0) - (a.bidCount || 0)).slice(0, 8);

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(40,20%,97%)' }}>

      {/* ── Hero ── */}
      <HeroBanner featuredItems={featuredItems} />

      {/* ── Category Shelf ── */}
      <CategoryShelf categories={categories} onSelect={handleCategorySelect} />

      {/* ── Ending Soon Section ── */}
      {!loading && endingSoonItems.length > 0 && (
        <section className="py-8 reveal-on-scroll" style={{ borderBottom: '1px solid hsl(0,0%,89%)' }}>
          <div className="page-container">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="badge badge-live" style={{ fontSize: 11 }}>Live</span>
                <h2 className="section-title !mb-0">Ending Soon</h2>
              </div>
              <button
                onClick={() => handleTabChange('active')}
                style={{ fontSize: 12, fontWeight: 600, color: 'hsl(196,100%,36%)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                View all →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {endingSoonItems.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Trending / Most Bids Section ── */}
      {!loading && trendingItems.length > 0 && (
        <section className="py-8 reveal-on-scroll" style={{ borderBottom: '1px solid hsl(0,0%,89%)' }}>
          <div className="page-container">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 18 }}>🔥</span>
                <h2 className="section-title !mb-0">Trending Now</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {trendingItems.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Main Catalog ── */}
      <section
        id="main-catalog"
        ref={catalogRef}
        className="py-8"
        style={{ minHeight: 480 }}
      >
        <div className="page-container">

          {/* Catalog Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="section-title !mb-1">
                {selectedCat
                  ? categories.find(c => c.slug === selectedCat)?.name || 'Category'
                  : searchTerm
                  ? `Results for "${searchTerm}"`
                  : 'All Auctions'}
              </h2>
              {!loading && (
                <p style={{ fontSize: 12, color: 'hsl(12,8%,55%)' }}>
                  {processedProducts.length.toLocaleString()} items
                  {selectedCat && (
                    <button
                      onClick={() => handleCategorySelect(null)}
                      style={{ marginLeft: 8, color: 'hsl(3,83%,60%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      ✕ Clear filter
                    </button>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Sort Dropdown */}
              <select
                id="catalog-sort"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  border: '1px solid hsl(0,0%,85%)', borderRadius: 4,
                  padding: '6px 30px 6px 10px', fontSize: 12, fontWeight: 500,
                  color: 'hsl(12,14%,11%)', background: 'white', cursor: 'pointer',
                  outline: 'none', fontFamily: 'var(--font-sans)',
                  appearance: 'auto',
                }}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div
            className="flex gap-0 mb-6"
            style={{ borderBottom: '1px solid hsl(0,0%,89%)' }}
          >
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                id={`tab-${tab.value}`}
                onClick={() => handleTabChange(tab.value)}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-display)', cursor: 'pointer',
                  background: 'none', border: 'none',
                  borderBottom: activeTab === tab.value
                    ? '2px solid hsl(196,100%,36%)'
                    : '2px solid transparent',
                  color: activeTab === tab.value ? 'hsl(196,100%,36%)' : 'hsl(12,8%,50%)',
                  transition: 'all 0.15s', marginBottom: '-1px',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sidebar + Grid layout */}
          <div className="flex gap-6">

            {/* ── Filter Sidebar (only when category selected and has filters) ── */}
            {availableFilters.length > 0 && (
              <aside
                style={{
                  width: 220, flexShrink: 0, fontSize: 12,
                  borderRight: '1px solid hsl(0,0%,89%)', paddingRight: 20,
                }}
              >
                <div
                  style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: 'hsl(12,8%,55%)', marginBottom: 16 }}
                >
                  Filter
                </div>
                {availableFilters.map(filter => (
                  <div key={filter.id} style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, color: 'hsl(12,14%,11%)' }}>
                      {filter.name}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {(filter.options || []).map(opt => (
                        <label
                          key={opt}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                        >
                          <input
                            type="checkbox"
                            checked={(activeFilters[filter.id] || []).includes(opt)}
                            onChange={e => handleFilterChange(filter.id, opt, e.target.checked)}
                            style={{ accentColor: 'hsl(196,100%,36%)' }}
                          />
                          <span style={{ color: 'hsl(12,14%,28%)' }}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </aside>
            )}

            {/* ── Product Grid ── */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <SkeletonGrid count={8} />
              ) : error ? (
                <ErrorState message={error} onRetry={fetchProducts} />
              ) : processedProducts.length === 0 ? (
                <EmptyState
                  searchTerm={searchTerm}
                  onClear={() => {
                    setSearchTerm('');
                    setSelectedCat('');
                    setSearchParams({});
                  }}
                />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {processedProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <HowItWorks />

      {/* ── Footer Strip ── */}
      <footer
        style={{
          borderTop: '1px solid hsl(0,0%,89%)',
          background: 'hsl(12,14%,11%)',
          color: 'hsl(40,20%,85%)',
          padding: '32px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 8, letterSpacing: '-0.02em' }}
        >
          aura<span style={{ color: 'hsl(196,100%,60%)' }}>bid</span>
        </div>
        <p style={{ fontSize: 11, color: 'hsl(40,10%,60%)' }}>
          © {new Date().getFullYear()} AuraBid. All auctions are final.
        </p>
        <div className="flex justify-center gap-6 mt-4">
          {['How It Works', 'Contact', 'Privacy Policy', 'Terms of Use'].map(t => (
            <Link
              key={t} to="#"
              style={{ fontSize: 11, color: 'hsl(40,10%,60%)', textDecoration: 'none' }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'white'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'hsl(40,10%,60%)'; }}
            >
              {t}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      icon: '🔍',
      title: 'Discover',
      desc: 'Browse thousands of items across 50+ categories from verified sellers worldwide.',
    },
    {
      icon: '🏷️',
      title: 'Bid or Buy',
      desc: 'Place bids or use Buy Now. Set auto-bids to compete even when you\'re away.',
    },
    {
      icon: '🛡️',
      title: 'Secure Escrow',
      desc: '100% escrow protection on every transaction. Pay only when you\'re satisfied.',
    },
    {
      icon: '📦',
      title: 'Receive',
      desc: 'Fast shipping with full tracking. Dispute resolution available for any issue.',
    },
  ];

  return (
    <section
      id="how-to-win"
      className="py-12 reveal-on-scroll"
      style={{ background: 'white', borderTop: '1px solid hsl(0,0%,89%)', borderBottom: '1px solid hsl(0,0%,89%)' }}
    >
      <div className="page-container">
        <h2 className="section-title text-center font-display" style={{ marginBottom: 32 }}>
          How AuraBid Works
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={step.title} className="flex flex-col items-center text-center gap-3">
              <div
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'hsl(196,100%,95%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, flexShrink: 0,
                }}
              >
                {step.icon}
              </div>
              <div>
                <div
                  style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', color: 'hsl(196,100%,36%)', marginBottom: 4 }}
                >
                  Step {i + 1}
                </div>
                <h3
                  style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
                    color: 'hsl(12,14%,11%)', marginBottom: 6 }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: 12, color: 'hsl(12,8%,45%)', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmptyState({ searchTerm, onClear }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'hsl(12,14%,11%)', marginBottom: 8 }}>
        {searchTerm ? `No results for "${searchTerm}"` : 'No items found'}
      </h3>
      <p style={{ fontSize: 13, color: 'hsl(12,8%,55%)', marginBottom: 20 }}>
        Try adjusting your search or filters to find what you're looking for.
      </p>
      <button
        onClick={onClear}
        className="bid-btn-primary"
        style={{ width: 'auto', padding: '10px 24px' }}
      >
        Clear Filters
      </button>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'hsl(12,14%,11%)', marginBottom: 8 }}>
        Something went wrong
      </h3>
      <p style={{ fontSize: 13, color: 'hsl(12,8%,55%)', marginBottom: 20 }}>{message}</p>
      <button
        onClick={onRetry}
        className="bid-btn-primary"
        style={{ width: 'auto', padding: '10px 24px' }}
      >
        Try Again
      </button>
    </div>
  );
}
