import React from 'react';

/**
 * SkeletonCard — Placeholder while auction cards are loading
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`auction-card pointer-events-none ${className}`}>
      {/* Image area */}
      <div className="relative bg-gray-100" style={{ paddingBottom: '75%' }}>
        <div className="skeleton absolute inset-0" />
      </div>
      {/* Info */}
      <div className="p-3 flex flex-col gap-2">
        <div className="skeleton h-3 w-4/5 rounded" />
        <div className="skeleton h-3 w-3/5 rounded" />
        <div className="skeleton h-3 w-2/5 rounded" />
      </div>
      {/* Price */}
      <div className="px-3 pb-3 flex flex-col gap-1">
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

/**
 * SkeletonGrid — Row of skeleton cards
 */
export function SkeletonGrid({ count = 4, className = '' }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default SkeletonCard;
