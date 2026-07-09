import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * HeroBanner — Homepage hero section
 * Left: headline + email/search CTA
 * Right: decorative auction house display
 */
export default function HeroBanner({ featuredItems = [] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section
      id="hero-banner"
      aria-label="Hero"
      style={{
        background: 'linear-gradient(135deg, hsl(196,40%,96%) 0%, hsl(40,20%,98%) 60%, hsl(40,20%,97%) 100%)',
        borderBottom: '1px solid hsl(0,0%,89%)',
      }}
    >
      <div className="page-container py-10 lg:py-14">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

          {/* ── Left Column ── */}
          <div className="flex-1 flex flex-col gap-5 max-w-xl">
            <div>
              <h1
                className="font-display text-4xl lg:text-5xl font-bold leading-tight tracking-tight"
                style={{ color: 'hsl(12,14%,11%)' }}
              >
                Discover &amp; Win<br />
                <span style={{ color: 'hsl(196,100%,36%)' }}>at Auction</span>
              </h1>
              <p
                className="mt-3 text-base leading-relaxed"
                style={{ color: 'hsl(12,8%,40%)' }}
              >
                Bid on fine art, jewelry, collectibles &amp; more. Thousands of
                live and timed auctions happening right now.
              </p>
            </div>

            {/* Search bar CTA */}
            <form onSubmit={handleSearch} className="flex gap-0 w-full max-w-md">
              <input
                id="hero-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items and auctioneers…"
                aria-label="Search items and auctioneers"
                className="flex-1 bid-input rounded-r-none border-r-0 text-sm"
                style={{ borderRadius: '4px 0 0 4px' }}
              />
              <button
                id="hero-search-btn"
                type="submit"
                aria-label="Search"
                style={{
                  background: 'hsl(196,100%,36%)',
                  color: 'white',
                  border: '2px solid hsl(196,100%,36%)',
                  borderRadius: '0 4px 4px 0',
                  padding: '0 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'hsl(196,100%,28%)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'hsl(196,100%,36%)'; }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
              </button>
            </form>

            {/* Quick stats */}
            <div className="flex gap-6 flex-wrap">
              {[
                { label: 'Live Now', value: '12+', color: 'hsl(3,83%,60%)' },
                { label: 'Upcoming', value: '340+', color: 'hsl(196,100%,36%)' },
                { label: 'Categories', value: '50+', color: 'hsl(12,14%,28%)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col">
                  <span className="font-display text-2xl font-bold" style={{ color }}>
                    {value}
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'hsl(12,8%,55%)' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right Column: Featured Lot Previews ── */}
          {featuredItems.length > 0 && (
            <div
              className="hidden lg:flex gap-4 items-end"
              style={{ minWidth: 0 }}
            >
              {featuredItems.slice(0, 3).map((item, i) => (
                <FeaturedLotThumb key={item.id} item={item} index={i} />
              ))}
            </div>
          )}

          {/* Fallback decorative panel when no featured items */}
          {featuredItems.length === 0 && (
            <div className="hidden lg:flex gap-3 items-end opacity-60">
              {[180, 160, 140].map((h, i) => (
                <div
                  key={i}
                  className="skeleton rounded-lg"
                  style={{ width: 120, height: h }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FeaturedLotThumb({ item, index }) {
  const heights = [200, 170, 145];
  const h = heights[index] ?? 160;

  return (
    <a
      href={`/products/${item.id}`}
      className="flex-shrink-0 overflow-hidden rounded-lg group"
      style={{
        width: 130,
        height: h,
        background: '#f4f4f4',
        border: '1px solid hsl(0,0%,89%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        textDecoration: 'none',
      }}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.title}
          style={{
            maxHeight: '100%',
            maxWidth: '100%',
            objectFit: 'contain',
            display: 'block',
            transition: 'transform 0.3s ease',
          }}
          className="group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full skeleton" />
      )}
    </a>
  );
}
