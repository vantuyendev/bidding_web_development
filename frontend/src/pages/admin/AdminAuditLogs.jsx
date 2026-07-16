import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trạng thái Phân trang & Tìm kiếm
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `?page=${page}&search=${encodeURIComponent(search)}`;
      const res = await fetch(getApiUrl(`/api/admin/audit-logs${query}`), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setTotalPages(data.pagination.totalPages || 1);
      } else {
        setError(data.error || 'Lỗi khi tải nhật ký hệ thống.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Hiển thị các huy hiệu hành động động
  const getActionBadge = (action) => {
    let classes = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
    if (action.includes('BAN')) {
      classes = 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    } else if (action.includes('UNBAN')) {
      classes = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    } else if (action.includes('APPROVE')) {
      classes = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    } else if (action.includes('REJECT') || action.includes('CANCEL')) {
      classes = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    }

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${classes}`}>
        {action}
      </span>
    );
  };

  const parseDetails = (detailsStr) => {
    if (!detailsStr) return 'N/A';
    try {
      const parsed = JSON.parse(detailsStr);
      return Object.entries(parsed).map(([key, val]) => (
        <span key={key} className="block text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
          <strong>{key}:</strong> {String(val)}
        </span>
      ));
    } catch {
      return detailsStr;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <div>
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">📜 Nhật ký hoạt động hệ thống (Audit Logs)</h3>
        <p className="text-neutral-500 mt-1">Giám sát toàn bộ các hành động mang tính quản trị, thay đổi số dư và thay đổi trạng thái trong hệ thống.</p>
      </div>

      {error && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{error}</div>}

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-neutral-50/50 dark:bg-neutral-900/30 p-4 rounded-2xl border border-neutral-200/40 dark:border-neutral-800/40">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-grow max-w-md">
          <input 
            type="text" 
            placeholder="Tìm theo email, hành động, chi tiết..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-grow p-2.5 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 font-semibold focus:outline-none focus:border-amber-500 text-neutral-850 dark:text-neutral-200"
          />
          <button 
            type="submit"
            className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-850 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-bold rounded-xl transition-all cursor-pointer"
          >
            Tìm kiếm
          </button>
        </form>
        <button 
          onClick={fetchLogs}
          className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all cursor-pointer"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Table view */}
      {loading ? (
        <div className="text-center py-10 text-neutral-400">Đang tải nhật ký...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400">
          Không tìm thấy hoạt động nào phù hợp.
        </div>
      ) : (
        <div className="overflow-x-auto border border-neutral-200/60 dark:border-neutral-800/80 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-500 uppercase font-bold select-none">
                <th className="p-4">Thời gian</th>
                <th className="p-4">Người thực hiện</th>
                <th className="p-4">Hành động</th>
                <th className="p-4">Đối tượng (Target)</th>
                <th className="p-4">Chi tiết (Details)</th>
                <th className="p-4">Địa chỉ IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/10 transition-colors">
                  <td className="p-4 font-semibold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="p-4">
                    {log.user ? (
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-white leading-none">{log.user.name || 'Admin User'}</p>
                        <p className="text-[10px] text-neutral-400 mt-1 font-mono">{log.user.email}</p>
                      </div>
                    ) : (
                      <span className="text-neutral-400 italic">Hệ thống (Tự động)</span>
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="p-4 font-mono text-[10px] text-neutral-600 dark:text-neutral-400 break-all">
                    {log.target || 'N/A'}
                  </td>
                  <td className="p-4 font-mono text-[10px] leading-relaxed max-w-xs md:max-w-sm">
                    {parseDetails(log.details)}
                  </td>
                  <td className="p-4 font-mono text-neutral-500 whitespace-nowrap">
                    {log.ipAddress || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4 select-none">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 rounded-xl font-bold cursor-pointer disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            Trước
          </button>
          <span className="text-neutral-500 font-bold">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 rounded-xl font-bold cursor-pointer disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
