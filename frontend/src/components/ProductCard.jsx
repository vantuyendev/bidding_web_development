import React from 'react';
import { Link } from 'react-router-dom';
import Badge from './ui/Badge';
import CountdownBadge from './ui/CountdownBadge';
import WatchlistButton from './ui/WatchlistButton';

/**
 * ProductCard — Reusable auction item card
 * Inspired by LiveAuctioneers: image hover, badge overlay, countdown, watchlist heart
 */
export default function ProductCard({ product, watched = false, className = '' }) {
  if (!product) return null;

  const {
    id,
    title,
    imageUrl,
    currentPrice,
    startPrice,
    buyNowPrice,
    endTime,
    startTime,
    status,
    bidCount,
    sellerName,
    categoryName,
  } = product;

  const isLive     = status === 'ACTIVE' && isAuctionLive(startTime, endTime);
  const isUpcoming = startTime && new Date(startTime).getTime() > Date.now();
  const isEnded    = status === 'ENDED' || status === 'COMPLETED' || status === 'PAID' || status === 'SHIPPED';
  const hasBuyNow  = !!buyNowPrice;

  const badgeVariant = isEnded ? 'ended' : isLive ? 'live' : isUpcoming ? 'upcoming' : hasBuyNow ? 'buy-now' : 'timed';

  const price = currentPrice ?? startPrice ?? 0;
  const formattedPrice = Number(price).toLocaleString('vi-VN') + ' đ';

  return (
    <div className={`auction-card group relative ${className}`}>
      {/* Image Area */}
      <Link
        to={`/products/${id}`}
        id={`product-card-link-${id}`}
        aria-label={title}
        className="block relative bg-[#f4f4f4] overflow-hidden"
        style={{ paddingBottom: '75%' }}
      >
        {/* Primary image */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="img-hover-primary img-contain-abs"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Status Badge (top-left) */}
        <div className="absolute top-2 left-2 z-10">
          <Badge variant={badgeVariant} />
        </div>

        {/* Watchlist heart (top-right) */}
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <WatchlistButton productId={id} initialWatched={watched} />
        </div>
      </Link>

      {/* Card Body */}
      <div className="p-3 flex flex-col gap-1.5">
        {/* Category + Seller */}
        <div className="flex items-center justify-between">
          {categoryName && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[hsl(196,100%,36%)]">
              {categoryName}
            </span>
          )}
          {sellerName && (
            <span className="text-[10px] text-[var(--page-text-muted)] truncate ml-auto">
              {sellerName}
            </span>
          )}
        </div>

        {/* Title */}
        <Link
          to={`/products/${id}`}
          className="block font-display text-[13px] font-medium text-[var(--page-text)] leading-snug hover:text-[hsl(196,100%,36%)] transition-colors"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </Link>

        {/* Countdown */}
        {!isEnded && endTime && (
          <CountdownBadge endTime={endTime} compact />
        )}

        {/* Divider */}
        <div className="divider !my-1" />

        {/* Price Info */}
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--page-text-muted)] uppercase tracking-wider">
              {isEnded ? 'Sold for' : bidCount > 0 ? 'Current bid' : 'Starting bid'}
            </span>
            <span className="font-display text-[15px] font-bold text-[var(--page-text)] leading-tight">
              {formattedPrice}
            </span>
          </div>

          {bidCount != null && (
            <span className="text-[10px] text-[var(--page-text-muted)]">
              {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
            </span>
          )}
        </div>

        {/* Buy Now price if present */}
        {hasBuyNow && !isEnded && (
          <div className="text-[11px] text-[hsl(196,100%,36%)] font-semibold">
            Buy Now: {Number(buyNowPrice).toLocaleString('vi-VN')} đ
          </div>
        )}
      </div>
    </div>
  );
}

function isAuctionLive(startTime, endTime) {
  if (!endTime) return false;
  const now = Date.now();
  const start = startTime ? new Date(startTime).getTime() : 0;
  return start <= now && new Date(endTime).getTime() > now;
}
