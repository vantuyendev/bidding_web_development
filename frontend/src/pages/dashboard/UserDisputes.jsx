import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';

export default function UserDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/disputes'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setDisputes(data.data);
      } else {
        setError(data.error || 'Không thể tải danh sách khiếu nại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDisputes();
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Đang xử lý
          </span>
        );
      case 'RESOLVED_REFUND':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Hoàn tiền người mua
          </span>
        );
      case 'RESOLVED_PAY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Thanh toán người bán
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Khiếu nại của tôi</h3>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchUserDisputes} className="underline cursor-pointer">Thử lại</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-neutral-400">Đang tải danh sách khiếu nại...</div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-850 rounded-3xl text-neutral-400 flex flex-col items-center justify-center gap-3">
          <span className="text-3xl">⚖️</span>
          <p>Bạn không có khiếu nại nào đang diễn ra hoặc đã xử lý.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {disputes.map((ticket) => (
            <div
              key={ticket.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl hover:border-neutral-350 dark:hover:border-neutral-700/80 transition-all duration-300 bg-neutral-50/20 dark:bg-neutral-950/10"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[9px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                    ID: #{ticket.id.slice(0, 8)}
                  </span>
                  {getStatusBadge(ticket.status)}
                </div>
                <h4 className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                  {ticket.product?.title || 'Sản phẩm đã bị xóa'}
                </h4>
                <p className="text-[10px] text-neutral-400">
                  Lý do: <span className="font-medium text-neutral-600 dark:text-neutral-300">{ticket.reason}</span>
                </p>
                <div className="flex items-center gap-3 text-[9px] text-neutral-400">
                  <span>Khởi tạo: {formatDate(ticket.createdAt)}</span>
                  <span>Người mở: {ticket.openedBy?.email}</span>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center justify-end sm:justify-start gap-4">
                <Link to={`/disputes/${ticket.id}`} className="no-underline">
                  <Button size="sm" className="px-4.5 py-2 rounded-xl text-[10px] font-bold">
                    Vào phòng chat →
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
