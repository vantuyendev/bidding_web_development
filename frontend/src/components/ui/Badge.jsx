import React from 'react';

/**
 * Badge — Auction status indicator
 * variant: 'live' | 'timed' | 'buy-now' | 'ended' | 'won' | 'verified' | 'outbid'
 */
export default function Badge({ variant = 'timed', className = '', children }) {
  const variantClass = {
    live:      'badge badge-live',
    timed:     'badge badge-timed',
    'buy-now': 'badge badge-buy-now',
    ended:     'badge badge-ended',
    won:       'badge badge-won',
    verified:  'badge badge-verified',
    outbid:    'badge badge-ended',
    upcoming:  'badge badge-upcoming',
  }[variant] || 'badge badge-timed';

  const labels = {
    live:      'Live',
    timed:     'Timed',
    'buy-now': 'Buy Now',
    ended:     'Ended',
    won:       '✓ Won',
    verified:  '✓ Verified',
    outbid:    'Outbid',
    upcoming:  'Upcoming',
  };

  return (
    <span className={`${variantClass} ${className}`}>
      {children ?? labels[variant]}
    </span>
  );
}
