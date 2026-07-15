import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../api';

/* ─── Animated number counter ─────────────────────────────── */
function AnimatedNumber({ target, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    const from = 0;
    const to = typeof target === 'number' ? target : parseInt(target, 10) || 0;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return <>{display}</>;
}

/* ─── Autocomplete dropdown ────────────────────────────────── */
function SearchSuggestions({ suggestions, loading, onSelect }) {
  if (!loading && suggestions.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        right: 0,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.3)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        zIndex: 50,
        animation: 'heroSuggestIn 0.15s ease',
      }}
    >
      {loading ? (
        <div style={{ padding: '14px 18px', color: '#94a3b8', fontSize: 13 }}>
          Đang tìm kiếm…
        </div>
      ) : (
        suggestions.map((item) => (
          <button
            key={item.id}
            onMouseDown={() => onSelect(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.12s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(0,151,186,0.08)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                  background: 'linear-gradient(135deg,hsl(196,60%,88%),hsl(40,40%,92%))',
                }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                {item.currentPrice
                  ? `$${parseFloat(item.currentPrice).toLocaleString()}`
                  : 'Chưa có giá'}
                {item.categoryName && ` · ${item.categoryName}`}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

/* ─── Main Hero ────────────────────────────────────────────── */
export default function HeroBanner({ featuredItems = [], categories = [] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [stats, setStats] = useState({ liveCount: null, upcomingCount: null, categoryCount: null });
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  /* ── Fetch live stats ── */
  useEffect(() => {
    fetch(getApiUrl('/api/products/search?limit=200'), { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        const now = Date.now();
        const items = d.data || [];
        const live = items.filter(p =>
          p.status === 'ACTIVE' &&
          p.startTime && new Date(p.startTime).getTime() <= now &&
          p.endTime && new Date(p.endTime).getTime() > now
        ).length;
        const upcoming = items.filter(p => p.startTime && new Date(p.startTime).getTime() > now).length;
        setStats(s => ({ ...s, liveCount: live, upcomingCount: upcoming }));
      })
      .catch(() => {});

    fetch(getApiUrl('/api/categories'))
      .then(r => r.json())
      .then(d => {
        if (d.success) setStats(s => ({ ...s, categoryCount: d.data?.length || 0 }));
      })
      .catch(() => {});
  }, []);

  /* ── Autocomplete ── */
  const fetchSuggestions = useCallback((q) => {
    if (!q.trim()) { setSuggestions([]); return; }
    setSugLoading(true);
    fetch(getApiUrl(`/api/products/search?q=${encodeURIComponent(q)}&limit=6`), { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) setSuggestions(d.data.slice(0, 6).map(p => ({
          id: p.id,
          title: p.title,
          imageUrl: p.imageUrl || p.image_url,
          currentPrice: p.currentPrice ?? p.current_price ?? p.startPrice ?? p.start_price,
          categoryName: p.category?.name || p.categoryName || null,
        })));
      })
      .catch(() => {})
      .finally(() => setSugLoading(false));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => fetchSuggestions(query), 280);
    } else {
      setSuggestions([]);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  /* ── Outside click closes dropdown ── */
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Handlers ── */
  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setFocused(false);
      navigate(`/?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelect = (item) => {
    setFocused(false);
    setQuery('');
    navigate(`/products/${item.id}`);
  };

  const showDropdown = focused && (sugLoading || suggestions.length > 0);

  const statItems = [
    {
      value: stats.liveCount,
      label: 'Đang diễn ra',
      icon: (
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: '#ef4c45', marginRight: 6, animation: 'heroPulse 1.4s ease-in-out infinite',
          boxShadow: '0 0 0 0 rgba(239,76,69,0.6)',
        }} />
      ),
      color: '#ef4c45',
      suffix: '',
    },
    {
      value: stats.upcomingCount,
      label: 'Sắp diễn ra',
      icon: null,
      color: '#0097ba',
      suffix: '',
    },
    {
      value: stats.categoryCount,
      label: 'Danh mục',
      icon: null,
      color: '#f4c430',
      suffix: '+',
    },
  ];

  const quickCats = categories.slice(0, 5);

  return (
    <>
      <style>{`
        @keyframes heroPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,76,69,0.5); }
          50%      { box-shadow: 0 0 0 8px rgba(239,76,69,0); }
        }
        @keyframes heroOrb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(40px,-30px) scale(1.15); }
        }
        @keyframes heroOrb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-30px,25px) scale(1.1); }
        }
        @keyframes heroSlideUp {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes heroSuggestIn {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes heroFadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        .hero-search-input::placeholder { color: rgba(255,255,255,0.45); }
        .hero-search-input:focus { outline: none; }
        .hero-cat-pill:hover { background: rgba(255,255,255,0.2) !important; }
      `}</style>

      <section
        id="hero-banner"
        aria-label="Hero"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, hsl(220,40%,10%) 0%, hsl(210,35%,13%) 40%, hsl(196,50%,16%) 100%)',
          minHeight: 420,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* ── Decorative orbs ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
        }}>
          {/* orb 1 — teal */}
          <div style={{
            position: 'absolute', top: '-10%', right: '15%',
            width: 480, height: 480, borderRadius: '50%',
            background: 'radial-gradient(circle, hsla(196,100%,50%,0.22) 0%, transparent 70%)',
            animation: 'heroOrb1 9s ease-in-out infinite',
            filter: 'blur(2px)',
          }} />
          {/* orb 2 — gold */}
          <div style={{
            position: 'absolute', bottom: '-15%', left: '8%',
            width: 360, height: 360, borderRadius: '50%',
            background: 'radial-gradient(circle, hsla(43,90%,60%,0.15) 0%, transparent 70%)',
            animation: 'heroOrb2 12s ease-in-out infinite',
          }} />
          {/* orb 3 — subtle red */}
          <div style={{
            position: 'absolute', top: '30%', right: '-5%',
            width: 260, height: 260, borderRadius: '50%',
            background: 'radial-gradient(circle, hsla(3,83%,60%,0.10) 0%, transparent 70%)',
          }} />
          {/* grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        {/* ── Content ── */}
        <div className="page-container" style={{ position: 'relative', zIndex: 1, paddingTop: 64, paddingBottom: 64, width: '100%' }}>
          <div style={{ maxWidth: 680 }}>

            {/* Label pill */}
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(0,151,186,0.18)',
                border: '1px solid rgba(0,151,186,0.35)',
                borderRadius: 100, padding: '5px 14px',
                marginBottom: 20,
                animation: 'heroSlideUp 0.5s ease both',
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#0097ba',
                animation: 'heroPulse 1.8s ease-in-out infinite',
                boxShadow: '0 0 0 0 rgba(0,151,186,0.5)',
              }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#67d4ef', textTransform: 'uppercase' }}>
                Đấu giá trực tiếp • Live now
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-display"
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#f8fafc',
                margin: 0,
                animation: 'heroSlideUp 0.55s 0.08s ease both',
                opacity: 0,
              }}
            >
              Khám phá &amp;{' '}
              <span style={{
                background: 'linear-gradient(90deg,hsl(196,100%,60%),hsl(196,100%,75%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Chiến thắng
              </span>
              <br />
              tại Đấu giá
            </h1>

            <p
              style={{
                marginTop: 16, marginBottom: 28,
                fontSize: 15, lineHeight: 1.7,
                color: 'rgba(248,250,252,0.6)',
                maxWidth: 520,
                animation: 'heroSlideUp 0.55s 0.16s ease both',
                opacity: 0,
              }}
            >
              Hàng nghìn phiên đấu giá trực tiếp — tác phẩm nghệ thuật, trang sức, đồ sưu tầm và nhiều hơn nữa. Đặt giá và giành chiến thắng ngay hôm nay.
            </p>

            {/* Search bar */}
            <div
              ref={wrapRef}
              style={{
                position: 'relative',
                maxWidth: 520,
                animation: 'heroSlideUp 0.55s 0.24s ease both',
                opacity: 0,
              }}
            >
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 0 }}>
                {/* Search icon inside input */}
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', color: 'rgba(255,255,255,0.4)',
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <input
                    id="hero-search-input"
                    className="hero-search-input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    placeholder="Tìm kiếm sản phẩm, danh mục…"
                    aria-label="Tìm kiếm sản phẩm"
                    style={{
                      width: '100%',
                      padding: '14px 14px 14px 42px',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#f8fafc',
                      background: 'rgba(255,255,255,0.08)',
                      border: `1.5px solid ${focused ? 'rgba(0,151,186,0.7)' : 'rgba(255,255,255,0.12)'}`,
                      borderRight: 'none',
                      borderRadius: '10px 0 0 10px',
                      backdropFilter: 'blur(12px)',
                      transition: 'border-color 0.2s, background 0.2s',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  id="hero-search-btn"
                  type="submit"
                  aria-label="Tìm kiếm"
                  style={{
                    padding: '14px 22px',
                    background: 'hsl(196,100%,36%)',
                    color: 'white',
                    border: '1.5px solid hsl(196,100%,36%)',
                    borderRadius: '0 10px 10px 0',
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'hsl(196,100%,28%)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'hsl(196,100%,36%)')}
                >
                  Tìm kiếm
                </button>
              </form>

              {/* Autocomplete */}
              {showDropdown && (
                <SearchSuggestions
                  suggestions={suggestions}
                  loading={sugLoading}
                  onSelect={handleSelect}
                />
              )}
            </div>

            {/* Category pills */}
            {quickCats.length > 0 && (
              <div
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16,
                  animation: 'heroSlideUp 0.55s 0.3s ease both',
                  opacity: 0,
                }}
              >
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', alignSelf: 'center' }}>Nổi bật:</span>
                {quickCats.map((cat) => (
                  <button
                    key={cat.id || cat.slug}
                    className="hero-cat-pill"
                    onClick={() => navigate(`/?category=${cat.slug || cat.id}`)}
                    style={{
                      padding: '5px 13px',
                      fontSize: 12, fontWeight: 600,
                      color: 'rgba(255,255,255,0.8)',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 100,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Stats */}
            <div
              style={{
                display: 'flex', gap: 32, marginTop: 36, flexWrap: 'wrap',
                animation: 'heroSlideUp 0.55s 0.36s ease both',
                opacity: 0,
              }}
            >
              {statItems.map(({ value, label, icon, color, suffix }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div
                    className="font-display"
                    style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, display: 'flex', alignItems: 'center' }}
                  >
                    {icon}
                    {value === null ? (
                      <span style={{ opacity: 0.35 }}>—</span>
                    ) : (
                      <><AnimatedNumber target={value} />{suffix}</>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Featured lot cards ── */}
          {featuredItems.length > 0 && (
            <div
              style={{
                position: 'absolute',
                right: 24, top: '50%', transform: 'translateY(-50%)',
                display: 'flex', gap: 12, alignItems: 'flex-end',
                animation: 'heroFadeIn 0.8s 0.5s ease both',
                opacity: 0,
              }}
              className="hidden-mobile"
            >
              {featuredItems.slice(0, 3).map((item, i) => (
                <FeaturedLotCard key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) { .hidden-mobile { display: none !important; } }
      `}</style>
    </>
  );
}

/* ─── Featured lot card ────────────────────────────────────── */
function FeaturedLotCard({ item, index }) {
  const heights = [220, 190, 160];
  const delays = ['0.5s', '0.6s', '0.7s'];
  const h = heights[index] ?? 180;

  return (
    <a
      href={`/products/${item.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 130,
        height: h,
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        overflow: 'hidden',
        textDecoration: 'none',
        position: 'relative',
        flexShrink: 0,
        transition: 'transform 0.25s ease, border-color 0.25s ease',
        animation: `heroSlideUp 0.5s ${delays[index]} ease both`,
        opacity: 0,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.borderColor = 'rgba(0,151,186,0.5)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
      }}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ flex: 1, background: 'linear-gradient(135deg,rgba(0,151,186,0.3),rgba(255,255,255,0.05))' }} />
      )}
      {/* Price overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 10px 8px',
        background: 'linear-gradient(to top,rgba(0,0,0,0.75),transparent)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        {item.currentPrice != null && (
          <div style={{ fontSize: 12, fontWeight: 800, color: '#67d4ef', marginTop: 1 }}>
            ${parseFloat(item.currentPrice).toLocaleString()}
          </div>
        )}
      </div>
    </a>
  );
}
