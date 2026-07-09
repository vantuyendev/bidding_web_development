import React from 'react';
import { Link } from 'react-router-dom';
import Badge from './ui/Badge';
import CountdownBadge from './ui/CountdownBadge';

/**
 * CatalogCard — Auction house featured listing card
 * Shows multiple item thumbnails, seller, date, and time progress bar
 * Inspired by LiveAuctioneers' catalog/auction house cards
 */
export default function CatalogCard({ auction, className = '' }) {
  if (!auction) return null;

  const {
    id,
    title,
    sellerName,
    startTime,
    endTime,
    status,
    items = [],          // Array of {id, imageUrl, title}
    itemCount,
  } = auction;

  const isLive = status === 'ACTIVE' && isNow(startTime, endTime);
  const isUpcoming = !isLive && new Date(startTime).getTime() > Date.now();

  // Progress: 0–100%
  const progress = computeProgress(startTime, endTime);

  const thumbnails = items.slice(0, 3);

  return (
    <div
      className={`auction-card ${className}`}
      style={{ border: '1px solid hsl(0,0%,89%)', borderRadius: 6 }}
    >
      {/* Thumbnail Strip */}
      <div
        className="flex"
        style={{
          borderBottom: '1px solid hsl(0,0%,89%)',
          background: 'white',
          minHeight: 104,
        }}
      >
        {thumbnails.length > 0 ? (
          thumbnails.map((item, i) => (
            <div
              key={item.id ?? i}
              className="flex-1 relative flex items-center justify-center overflow-hidden"
              style={{
                background: 'hsl(40,20%,97%)',
                borderRight: i < thumbnails.length - 1 ? '1px solid hsl(0,0%,93%)' : 'none',
                minWidth: 0,
                height: 104,
              }}
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title ?? ''}
                  style={{ maxHeight: '90%', maxWidth: '90%', objectFit: 'contain' }}
                  loading="lazy"
                />
              ) : (
                <div className="skeleton w-full h-full" />
              )}
            </div>
          ))
        ) : (
          // Fallback skeleton strip
          [0, 1, 2].map(i => (
            <div key={i} className="flex-1 skeleton" style={{ height: 104 }} />
          ))
        )}
      </div>

      {/* Progress Bar */}
      <div className="auction-progress">
        <div
          className="auction-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5">
        {/* Auction name */}
        <Link
          to={id ? `/products?seller=${id}` : '#'}
          className="font-display text-[14px] font-semibold leading-snug hover:text-[hsl(196,100%,36%)] transition-colors"
          style={{
            color: 'hsl(12,14%,11%)',
            textDecoration: 'none',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </Link>

        {/* Seller name */}
        {sellerName && (
          <div className="flex items-center gap-1.5">
            {/* Gavel icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 flex-shrink-0" style={{ color: 'hsl(12,8%,55%)' }}>
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            <span
              className="text-[11px] truncate"
              style={{ color: 'hsl(12,8%,40%)', fontWeight: 500 }}
            >
              {sellerName}
            </span>
          </div>
        )}

        {/* Date / Status row */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-1.5">
            {isLive ? (
              <Badge variant="live" />
            ) : (
              <span className="text-[11px]" style={{ color: 'hsl(12,8%,55%)' }}>
                {endTime ? formatDate(endTime) : '—'}
              </span>
            )}
          </div>

          {!isLive && endTime && (
            <CountdownBadge endTime={endTime} compact className="text-[11px]" />
          )}

          {itemCount != null && (
            <span className="text-[10px]" style={{ color: 'hsl(12,8%,65%)' }}>
              {itemCount} lots
            </span>
          )}
        </div>
      </div>

      {/* Explore button */}
      <div className="px-3 pb-3">
        <Link
          to={id ? `/products?seller=${id}` : '#'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid hsl(0,0%,85%)',
            borderRadius: 4,
            padding: '7px 12px',
            fontFamily: 'var(--font-display)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'hsl(12,14%,11%)',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'hsl(12,14%,11%)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderColor = 'hsl(12,14%,11%)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '';
            e.currentTarget.style.color = 'hsl(12,14%,11%)';
            e.currentTarget.style.borderColor = 'hsl(0,0%,85%)';
          }}
        >
          Explore
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function isNow(startTime, endTime) {
  const now = Date.now();
  return new Date(startTime).getTime() <= now && new Date(endTime).getTime() > now;
}

function computeProgress(startTime, endTime) {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (!start || !end || end <= start) return 0;
  const pct = ((now - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, pct));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
