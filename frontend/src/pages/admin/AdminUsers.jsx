import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' (ALL) | banned | seller | kyc_pending
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Ban action states
  const [banningUser, setBanningUser] = useState(null); // User object
  const [banReason, setBanReason] = useState('');
  const [submittingBan, setSubmittingBan] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `?page=${page}&search=${encodeURIComponent(search)}&status=${statusFilter}`;
      const res = await fetch(getApiUrl(`/api/admin/users${query}`), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setTotalPages(data.pagination.totalPages || 1);
      } else {
        setError(data.error || 'Lỗi khi tải danh sách người dùng.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleBanToggle = async (userObj) => {
    if (!userObj.isBanned) {
      setBanningUser(userObj);
      return;
    }

    // Unban immediately
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(getApiUrl(`/api/admin/users/${userObj.id}/ban`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban' }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setUsers(users.map(u => u.id === userObj.id ? { ...u, isBanned: false, banReason: null } : u));
      } else {
        setError(data.error || 'Mở khóa tài khoản thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    }
  };

  const handleBanSubmit = async (e) => {
    e.preventDefault();
    if (!banningUser || !banReason.trim()) return;

    setError(null);
    setSuccess(null);
    setSubmittingBan(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/users/${banningUser.id}/ban`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ban', reason: banReason.trim() }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setUsers(users.map(u => u.id === banningUser.id ? { ...u, isBanned: true, banReason: banReason.trim() } : u));
        setBanningUser(null);
        setBanReason('');
      } else {
        setError(data.error || 'Khóa tài khoản thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setSubmittingBan(false);
    }
  };

  const formatCurrency = (val) => {
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <div>
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">👥 Quản lý người dùng & Khóa tài khoản</h3>
        <p className="text-neutral-500 mt-1">Tìm kiếm, lọc danh sách thành viên và khóa (ban) các tài khoản phát hiện gian lận, lừa đảo.</p>
      </div>

      {error && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold">{success}</div>}

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-neutral-50/50 dark:bg-neutral-900/30 p-4 rounded-2xl border border-neutral-200/40 dark:border-neutral-800/40">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-grow max-w-md">
          <input 
            type="text" 
            placeholder="Tìm theo email, tên..."
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

        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="p-2.5 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 font-semibold focus:outline-none focus:border-amber-500 text-neutral-850 dark:text-neutral-200"
        >
          <option value="">Tất cả vai trò / trạng thái</option>
          <option value="banned">Tài khoản bị khóa (Banned)</option>
          <option value="seller">Người bán đã xác thực (Verified Seller)</option>
          <option value="kyc_pending">Đang chờ duyệt KYC (KYC Pending)</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-neutral-400">Đang tải danh sách người dùng...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400">
          Không tìm thấy tài khoản người dùng nào.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {users.map((targetUser) => (
            <div 
              key={targetUser.id} 
              className={`p-5 border rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:border-neutral-300 dark:hover:border-neutral-700 transition-all bg-white dark:bg-neutral-900 ${
                targetUser.isBanned ? 'border-rose-500/30 bg-rose-500/[0.01]' : 'border-neutral-200/50 dark:border-neutral-800/80'
              }`}
            >
              {/* User Metadata */}
              <div className="space-y-2 flex-grow">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <p className="font-extrabold text-neutral-900 dark:text-white text-sm">
                    {targetUser.name || 'Thành viên mới'}
                  </p>
                  <p className="text-neutral-400 font-mono text-[9px]">{targetUser.email}</p>
                  
                  {targetUser.isBanned && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-bold">
                      Đã khóa
                    </span>
                  )}
                  {targetUser.isVerifiedSeller && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                      Seller Verified
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] text-neutral-500 pt-1">
                  <div>
                    <p className="text-neutral-400">Số dư ví:</p>
                    <p className="font-bold text-neutral-800 dark:text-neutral-200">{formatCurrency(targetUser.walletBalance)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Số dư đóng băng (cọc):</p>
                    <p className="font-bold text-neutral-800 dark:text-neutral-200">{formatCurrency(targetUser.frozenBalance)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Số sản phẩm đã bán:</p>
                    <p className="font-bold text-neutral-800 dark:text-neutral-200">{targetUser._count?.soldProducts || 0}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Số lượt đặt cược:</p>
                    <p className="font-bold text-neutral-800 dark:text-neutral-200">{targetUser._count?.bids || 0}</p>
                  </div>
                </div>

                {targetUser.isBanned && targetUser.banReason && (
                  <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 text-rose-700 dark:text-rose-400 mt-2">
                    Lý do khóa: "{targetUser.banReason}"
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 w-full md:w-auto mt-4 md:mt-0 flex justify-end">
                <Button 
                  onClick={() => handleBanToggle(targetUser)}
                  variant={targetUser.isBanned ? 'success' : 'danger'}
                  className="w-full md:w-32 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  {targetUser.isBanned ? '✓ Mở khóa' : '✕ Khóa tài khoản'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center pt-4 select-none">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 text-neutral-800 dark:text-neutral-200 font-bold"
          >
            Trước
          </button>
          <span className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500 font-bold">
            Trang {page} / {totalPages}
          </span>
          <button 
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 text-neutral-800 dark:text-neutral-200 font-bold"
          >
            Sau
          </button>
        </div>
      )}

      {/* Ban Confirm Modal */}
      {banningUser && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full animate-scaleIn text-left">
            <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white mb-2">✕ Xác nhận khóa tài khoản</h4>
            <p className="text-neutral-500 mb-4 leading-normal">
              Bạn đang thực hiện khóa vĩnh viễn tài khoản của <span className="font-extrabold text-neutral-850 dark:text-neutral-200">{banningUser.email}</span>. Người dùng này sẽ không thể đăng nhập hoặc thực hiện bất kỳ giao dịch nào trên hệ thống.
            </p>

            <form onSubmit={handleBanSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Lý do khóa tài khoản</label>
                <textarea 
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Ví dụ: Gian lận đấu giá / Đăng tải sản phẩm ảo / Lừa đảo tiền cọc..."
                  rows={3}
                  required
                  className="w-full p-3.5 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => { setBanningUser(null); setBanReason(''); }}
                  disabled={submittingBan}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  disabled={submittingBan || !banReason.trim()}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingBan ? 'Đang xử lý...' : 'Xác nhận khóa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
