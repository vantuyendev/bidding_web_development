import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';

export default function AdminWalletRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('PENDING'); // PENDING | APPROVED | REJECTED
  const [typeFilter, setTypeFilter] = useState(''); // '' (ALL) | DEPOSIT | WITHDRAW

  // Reject dialog state
  const [resolvingRequest, setResolvingRequest] = useState(null); // request object
  const [resolveAction, setResolveAction] = useState(null); // 'APPROVE' | 'REJECT'
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = `?status=${statusFilter}`;
      if (typeFilter) query += `&type=${typeFilter}`;
      const res = await fetch(getApiUrl(`/api/admin/wallet-requests${query}`), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      } else {
        setError(data.error || 'Lỗi khi tải danh sách yêu cầu ví.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, typeFilter]);

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolvingRequest || !resolveAction) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/wallet-requests/${resolvingRequest.id}/confirm`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: resolveAction, adminNote: adminNote.trim() }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setRequests(requests.filter(r => r.id !== resolvingRequest.id));
        setResolvingRequest(null);
        setResolveAction(null);
        setAdminNote('');
      } else {
        setError(data.error || 'Xử lý yêu cầu thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <div>
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">💰 Xác nhận yêu cầu nạp & rút tiền</h3>
        <p className="text-neutral-500 mt-1">Xác nhận chuyển khoản cho người dùng nạp tiền hoặc giải ngân tiền mặt cho các lệnh yêu cầu rút tiền.</p>
      </div>

      {error && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold">{success}</div>}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-neutral-50/50 dark:bg-neutral-900/30 p-4 rounded-2xl border border-neutral-200/40 dark:border-neutral-800/40">
        <div className="flex gap-1 bg-neutral-200/55 dark:bg-neutral-950/40 p-1 rounded-xl">
          <button 
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'PENDING' ? 'bg-white dark:bg-neutral-850 text-neutral-950 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-950 dark:hover:text-white'}`}
          >
            Chờ duyệt
          </button>
          <button 
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'APPROVED' ? 'bg-white dark:bg-neutral-850 text-neutral-950 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-950 dark:hover:text-white'}`}
          >
            Đã duyệt
          </button>
          <button 
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${statusFilter === 'REJECTED' ? 'bg-white dark:bg-neutral-850 text-neutral-950 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-950 dark:hover:text-white'}`}
          >
            Đã từ chối
          </button>
        </div>

        <select 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 font-semibold focus:outline-none focus:border-amber-500 text-neutral-800 dark:text-neutral-200 w-full sm:w-auto"
        >
          <option value="">Tất cả loại giao dịch</option>
          <option value="DEPOSIT">Nạp tiền (Deposit)</option>
          <option value="WITHDRAW">Rút tiền (Withdraw)</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-neutral-400">Đang tải danh sách yêu cầu...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400">
          Không tìm thấy yêu cầu giao dịch nào phù hợp.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((req) => (
            <div 
              key={req.id} 
              className="p-5 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:border-neutral-300 dark:hover:border-neutral-700 transition-all bg-white dark:bg-neutral-900"
            >
              {/* Info Detail */}
              <div className="space-y-2.5 flex-grow">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                    req.type === 'DEPOSIT' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                    {req.type === 'DEPOSIT' ? 'Nạp tiền 📥' : 'Rút tiền 📤'}
                  </span>
                  
                  <span className="text-neutral-400 font-mono text-[9px]">Yêu cầu: #{req.id.slice(0, 8)}...</span>
                  <span className="text-neutral-400 text-[10px]">•</span>
                  <span className="text-neutral-400 text-[10px]">{formatDate(req.createdAt)}</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <p className="text-base font-extrabold text-neutral-900 dark:text-white">
                    {formatCurrency(req.amount)}
                  </p>
                  <p className="text-neutral-400 text-[10px]">bởi {req.user?.name || req.user?.email}</p>
                </div>

                {req.type === 'DEPOSIT' ? (
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200/40 dark:border-neutral-850 space-y-1 max-w-lg">
                    <p className="text-neutral-500 font-medium">Nội dung chuyển khoản cần đối chiếu:</p>
                    <p className="font-mono text-sm font-extrabold text-amber-600 dark:text-amber-400 tracking-wider">
                      {req.transferNote}
                    </p>
                    <p className="text-[10px] text-neutral-400">Đối chiếu với tài khoản admin xem đã nhận được số tiền trên chưa trước khi duyệt.</p>
                  </div>
                ) : (
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200/40 dark:border-neutral-850 space-y-1.5 max-w-lg">
                    <p className="text-neutral-500 font-medium">Thông tin tài khoản nhận của User:</p>
                    <div className="grid grid-cols-2 gap-2 text-neutral-700 dark:text-neutral-300">
                      <p>Ngân hàng: <span className="font-bold">{req.bankName}</span></p>
                      <p>Chủ TK: <span className="font-bold">{req.bankOwner}</span></p>
                      <p className="col-span-2">Số TK: <span className="font-mono font-bold text-neutral-900 dark:text-white">{req.bankAccount}</span></p>
                    </div>
                  </div>
                )}

                {req.adminNote && (
                  <p className="text-neutral-500 italic mt-1 bg-neutral-50 dark:bg-neutral-950/60 p-2.5 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800">
                    Ghi chú Admin: "{req.adminNote}"
                  </p>
                )}
              </div>

              {/* Status or Action Buttons */}
              {req.status === 'PENDING' ? (
                <div className="flex gap-2 w-full md:w-auto md:flex-col justify-end mt-4 md:mt-0 flex-shrink-0">
                  <Button 
                    onClick={() => { setResolvingRequest(req); setResolveAction('APPROVE'); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full md:w-28 py-2 rounded-xl cursor-pointer"
                  >
                    Duyệt thành công
                  </Button>
                  <Button 
                    onClick={() => { setResolvingRequest(req); setResolveAction('REJECT'); }}
                    variant="danger"
                    className="w-full md:w-28 py-2 rounded-xl cursor-pointer"
                  >
                    Từ chối duyệt
                  </Button>
                </div>
              ) : (
                <div className="flex-shrink-0">
                  <span className={`px-3 py-1.5 rounded-xl font-bold text-[10px] border uppercase ${
                    req.status === 'APPROVED' 
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  }`}>
                    {req.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {resolvingRequest && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full animate-scaleIn text-left">
            <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white mb-2">
              {resolveAction === 'APPROVE' ? '✓ Xác nhận duyệt yêu cầu' : '✕ Từ chối duyệt yêu cầu'}
            </h4>
            <p className="text-neutral-500 mb-4 leading-normal">
              {resolveAction === 'APPROVE' 
                ? `Bạn có chắc chắn muốn DUYỆT yêu cầu giao dịch này? Tài khoản người dùng sẽ được cộng/trừ ${formatCurrency(resolvingRequest.amount)} ngay lập tức.`
                : 'Vui lòng cung cấp lý do từ chối giao dịch để thông báo cho người dùng.'}
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Ghi chú (Tùy chọn)</label>
                <textarea 
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={resolveAction === 'APPROVE' ? 'Ví dụ: Đã nhận được chuyển khoản / Đã chuyển khoản giải ngân.' : 'Ví dụ: Sai nội dung chuyển khoản / Sai thông tin tài khoản ngân hàng...'}
                  rows={3}
                  required={resolveAction === 'REJECT'}
                  className="w-full p-3.5 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => { setResolvingRequest(null); setResolveAction(null); setAdminNote(''); }}
                  disabled={submitting}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  disabled={submitting || (resolveAction === 'REJECT' && !adminNote.trim())}
                  className={`px-4 py-2.5 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 ${resolveAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  {submitting ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
