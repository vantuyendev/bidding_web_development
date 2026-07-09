import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../api';

export default function DisputeManagement() {
  const { user, loading: authLoading } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputesError, setDisputesError] = useState(null);

  const fetchDisputes = async () => {
    setDisputesLoading(true);
    setDisputesError(null);
    try {
      const res = await fetch(getApiUrl('/api/disputes'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setDisputes(data.data);
      } else {
        setDisputesError(data.error || 'Lỗi tải danh sách khiếu nại.');
      }
    } catch (err) {
      setDisputesError('Lỗi kết nối máy chủ.');
    } finally {
      setDisputesLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.email?.toLowerCase().includes('admin')) {
      fetchDisputes();
    }
  }, [user]);

  if (authLoading) {
    return <div className="text-center py-10 text-xs text-neutral-400 animate-pulse">Đang kiểm tra quyền truy cập...</div>;
  }

  if (!user || !user.email?.toLowerCase().includes('admin')) {
    return <Navigate to="/" replace />;
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">⚖️ Quản lý Khiếu nại tranh chấp</h3>

      {disputesError && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold text-xs">{disputesError}</div>}

      {disputesLoading ? (
        <div className="text-center py-10 text-xs text-neutral-400">Đang tải danh sách khiếu nại...</div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400 text-xs">
          Hiện tại không có hồ sơ khiếu nại nào.
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-xs">
          {disputes.map((ticket) => (
            <div key={ticket.id} className="p-5 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:border-neutral-300 transition-all">
              <div className="space-y-2 flex-grow">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    ticket.status === 'PENDING'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {ticket.status === 'PENDING' ? 'Chưa giải quyết' : 'Đã phán quyết'}
                  </span>
                  <span className="text-neutral-400 font-mono text-[9px]">Mã đơn: {ticket.id.slice(0, 8)}...</span>
                </div>
                
                <p className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">
                  Sản phẩm: {ticket.product?.title || 'N/A'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-neutral-500">
                  <p>Người khiếu nại (Mua): <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{ticket.openedBy?.email}</span></p>
                  <p>Ngày tạo: <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{formatDate(ticket.createdAt)}</span></p>
                  <p className="sm:col-span-2">Lý do khiếu nại: <span className="text-neutral-800 dark:text-neutral-200 font-semibold italic">"{ticket.reason}"</span></p>
                </div>
              </div>

              <div className="flex-shrink-0 w-full md:w-auto">
                <Link
                  to={`/disputes/${ticket.id}`}
                  className="block text-center bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold px-4 py-2.5 rounded-xl cursor-pointer hover:scale-[1.02] transition-all no-underline shadow-sm"
                >
                  ⚖️ Vào phòng xử lý
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
