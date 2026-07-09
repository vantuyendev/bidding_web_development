import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../api';

/**
 * WatchlistButton — Heart toggle for saving auction items
 */
export default function WatchlistButton({
  productId,
  initialWatched = false,
  onToggle,
  className = '',
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watched, setWatched] = useState(initialWatched);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const method = watched ? 'DELETE' : 'POST';
      const endpoint = watched ? `/api/watchlist/${productId}` : '/api/watchlist';
      const body = watched ? undefined : JSON.stringify({ productId });
      const headers = watched ? undefined : { 'Content-Type': 'application/json' };
      const res = await fetch(getApiUrl(endpoint), {
        method,
        headers,
        body,
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setWatched(!watched);
        onToggle?.(!watched);
      }
    } catch (err) {
      console.error('Watchlist error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      id={`watchlist-btn-${productId}`}
      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      onClick={handleToggle}
      disabled={loading}
      className={`watchlist-btn ${watched ? 'active' : ''} ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={watched ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={watched ? '0' : '1.5'}
        className="w-4 h-4 transition-all"
        style={{ color: watched ? 'hsl(3, 83%, 60%)' : 'hsl(12, 8%, 40%)' }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
