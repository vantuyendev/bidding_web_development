import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';

  const fetchWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/watchlist'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setWatchlist(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách yêu thích:', err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const removeFromWatchlist = async (productId) => {
    try {
      const res = await fetch(getApiUrl(`/api/watchlist/${productId}`), {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setWatchlist(prev => prev.filter(p => p.id !== productId));
      }
    } catch (err) {
      console.error('Lỗi khi xóa khỏi danh sách yêu thích:', err);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Sản phẩm yêu thích</h3>

      {watchlistLoading ? (
        <div className="text-center py-10 text-xs text-neutral-400">Đang tải danh sách yêu thích...</div>
      ) : watchlist.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400 text-xs">
          Danh sách yêu thích trống.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {watchlist.map((prod) => (
            <div key={prod.id} className="flex items-center justify-between gap-4 p-4 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl hover:border-neutral-300 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0 border border-neutral-200/40 dark:border-neutral-700/30">
                  {prod.imageUrl ? (
                    <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs">📦</span>
                  )}
                </div>
                <div>
                  <Link to={`/products/${prod.id}`} className="font-bold text-xs text-neutral-900 dark:text-white hover:text-amber-500 transition-colors line-clamp-1 no-underline">
                    {prod.title}
                  </Link>
                  <span className="text-[9px] text-neutral-400 block mt-0.5">Giá hiện tại: {formatMoney(prod.currentPrice)}</span>
                </div>
              </div>
              <Button
                onClick={() => removeFromWatchlist(prod.id)}
                variant="outline"
                size="sm"
                className="text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/30"
              >
                Bỏ thích
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
