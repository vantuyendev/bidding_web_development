import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';

export default function AdminAuctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Cancellation modal state
  const [cancellingAuction, setCancellingAuction] = useState(null); // Auction object
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const fetchActiveAuctions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/admin/auctions'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setAuctions(data.data);
      } else {
        setError(data.error || 'Lỗi khi tải danh sách phiên đấu giá.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveAuctions();
  }, []);

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingAuction || !cancelReason.trim()) return;

    setError(null);
    setSuccess(null);
    setSubmittingCancel(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/auctions/${cancellingAuction.id}/cancel`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setAuctions(auctions.filter(a => a.id !== cancellingAuction.id));
        setCancellingAuction(null);
        setCancelReason('');
      } else {
        setError(data.error || 'Hủy phiên đấu giá thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const formatCurrency = (val) => {
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  const getRemainingTime = (endTimeStr) => {
    const total = Date.parse(endTimeStr) - Date.parse(new Date());
    if (total <= 0) return 'Đã kết thúc';
    
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} ngày ${hours} giờ`;
    if (hours > 0) return `${hours} giờ ${minutes} phút`;
    return `${minutes} phút ${seconds} giây`;
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <div>
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">⚡ Quản trị & Hủy phiên đấu giá đang diễn ra</h3>
        <p className="text-neutral-500 mt-1">
          Hủy bỏ các phiên đấu giá có hành vi bất thường, phát hiện gian lận hoặc tranh chấp. 
          Hệ thống sẽ tự động hoàn trả 100% tiền cọc đóng băng cho tất cả thành viên đã tham gia đặt giá.
        </p>
      </div>

      {error && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold">{success}</div>}

      {loading ? (
        <div className="text-center py-10 text-neutral-400">Đang tải danh sách đấu giá hoạt động...</div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400">
          Hiện tại không có phiên đấu giá nào đang diễn ra công khai.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {auctions.map((auction) => (
            <div 
              key={auction.id} 
              className="p-5 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start hover:border-neutral-300 dark:hover:border-neutral-700 transition-all bg-white dark:bg-neutral-900"
            >
              {/* Left Column: Product overview */}
              <div className="flex flex-col sm:flex-row gap-4 flex-grow">
                {auction.imageUrl && (
                  <div className="w-full sm:w-28 h-28 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-850 flex-shrink-0 bg-neutral-100">
                    <img 
                      src={auction.imageUrl} 
                      alt={auction.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded text-[9px] font-bold">
                      ID: {auction.id.slice(0, 8)}...
                    </span>
                    <span className="text-neutral-400 text-[10px]">•</span>
                    <p className="text-neutral-400 text-[10px]">Người bán: <span className="text-neutral-850 dark:text-neutral-300 font-semibold">{auction.seller?.email}</span></p>
                  </div>
                  
                  <h4 className="font-extrabold text-neutral-900 dark:text-white text-sm leading-snug">{auction.title}</h4>
                  
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/60 text-[10px] text-neutral-500">
                    <p>Giá khởi điểm: <span className="text-neutral-800 dark:text-neutral-200 font-bold">{formatCurrency(auction.startPrice)}</span></p>
                    <p>Giá hiện tại: <span className="text-amber-600 dark:text-amber-400 font-extrabold">{formatCurrency(auction.currentPrice)}</span></p>
                    <p>Tổng lượt đặt: <span className="text-neutral-800 dark:text-neutral-200 font-bold">{auction.bidCount}</span></p>
                    <p>Thời gian còn lại: <span className="text-rose-600 dark:text-rose-400 font-bold">{getRemainingTime(auction.endTime)}</span></p>
                  </div>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0 flex-shrink-0 justify-end items-center">
                <Button 
                  onClick={() => setCancellingAuction(auction)}
                  variant="danger"
                  className="w-full md:w-32 py-2.5 rounded-xl cursor-pointer font-bold"
                >
                  ✕ Hủy phiên cọc
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancellingAuction && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full animate-scaleIn text-left">
            <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white mb-2">⚡ Xác nhận hủy phiên đấu giá</h4>
            <p className="text-neutral-500 mb-4 leading-normal">
              Bạn đang thực hiện hủy phiên đấu giá <span className="font-extrabold text-neutral-850 dark:text-neutral-200">"{cancellingAuction.title}"</span>. 
              Mọi lượt đặt giá sẽ bị hủy bỏ, hệ thống sẽ tự động giải tỏa (unfreeze) và hoàn lại 10% tiền đặt cọc cho các người tham gia.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Lý do hủy phiên đấu giá</label>
                <textarea 
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ví dụ: Phát hiện tự nâng giá (shill bidding), nghi ngờ sản phẩm giả mạo, seller vi phạm điều khoản..."
                  rows={3}
                  required
                  className="w-full p-3.5 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => { setCancellingAuction(null); setCancelReason(''); }}
                  disabled={submittingCancel}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  disabled={submittingCancel || !cancelReason.trim()}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingCancel ? 'Đang hoàn tiền...' : 'Hủy & Hoàn tiền cọc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
