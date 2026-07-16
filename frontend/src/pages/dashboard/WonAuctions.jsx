import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';

export default function WonAuctions(props) {
  const context = useOutletContext() || {};
  const profileData = props.profileData || context.profileData;

  const [wonAuctions, setWonAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWonAuctions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/users/won-auctions'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setWonAuctions(data.data);
      } else {
        setError(data.error || 'Lỗi khi tải danh sách sản phẩm trúng đấu giá.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileData) {
      fetchWonAuctions();
    }
  }, [profileData]);

  const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'PAID':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'SHIPPED':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'DISPUTED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT': return 'Chờ thanh toán';
      case 'PAID': return 'Đã thanh toán (Chờ giao hàng)';
      case 'SHIPPED': return 'Đang giao hàng';
      case 'COMPLETED': return 'Hoàn thành';
      case 'DISPUTED': return 'Đang tranh chấp';
      default: return status;
    }
  };

  if (!profileData) return null;

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">🏆 Đấu giá đã thắng</h3>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchWonAuctions} className="underline cursor-pointer">Thử lại</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-neutral-400">Đang tải danh sách đấu giá đã thắng...</div>
      ) : wonAuctions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-850 rounded-3xl text-neutral-400 flex flex-col items-center justify-center gap-3">
          <span className="text-3xl">🏆</span>
          <p>Bạn chưa thắng phiên đấu giá nào hoặc sản phẩm đã hết hạn thanh toán.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {wonAuctions.map((prod) => (
            <div
              key={prod.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl hover:border-neutral-355 dark:hover:border-neutral-700 bg-neutral-50/20 dark:bg-neutral-950/10"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-850 overflow-hidden flex items-center justify-center flex-shrink-0 border border-neutral-200/40 dark:border-neutral-700/30">
                  {prod.imageUrl ? (
                    <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-neutral-300 text-xs select-none">📦</span>
                  )}
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <Link
                    to={`/products/${prod.id}`}
                    className="font-bold text-xs text-neutral-900 dark:text-white hover:text-amber-500 transition-colors line-clamp-1 no-underline"
                  >
                    {prod.title}
                  </Link>
                  <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                    <span>Kết thúc: {formatDate(prod.endTime)}</span>
                    <span>Người bán: {prod.seller?.name || prod.seller?.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0">
                <div className="text-right flex flex-col items-end">
                  <span className="text-[9px] text-neutral-400">Giá trúng thầu</span>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5">
                    {formatMoney(prod.currentPrice)}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-2 min-w-[120px]">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadge(prod.status)}`}>
                    {getStatusText(prod.status)}
                  </span>
                  
                  {prod.status === 'PENDING_PAYMENT' && (
                    <Link to={`/products/${prod.id}`}>
                      <Button size="sm" className="px-3.5 py-1.5 rounded-xl text-[9px] font-bold shadow-sm bg-amber-500 hover:bg-amber-600 text-white cursor-pointer w-full text-center">
                        Thanh toán ngay 💳
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
