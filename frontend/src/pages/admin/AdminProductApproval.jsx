import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';

export default function AdminProductApproval() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Rejection modal state
  const [rejectingProduct, setRejectingProduct] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const fetchPendingProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/admin/products?approvalStatus=PENDING_REVIEW'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      } else {
        setError(data.error || 'Lỗi khi tải danh sách sản phẩm chờ duyệt.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  const handleApprove = async (productId) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(getApiUrl(`/api/admin/products/${productId}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setProducts(products.filter(p => p.id !== productId));
      } else {
        setError(data.error || 'Duyệt sản phẩm thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;

    setError(null);
    setSuccess(null);
    setSubmittingReject(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/products/${rejectingProduct.id}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', rejectionReason: rejectionReason.trim() }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setProducts(products.filter(p => p.id !== rejectingProduct.id));
        setRejectingProduct(null);
        setRejectionReason('');
      } else {
        setError(data.error || 'Từ chối sản phẩm thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setSubmittingReject(false);
    }
  };

  const formatCurrency = (val) => {
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <div>
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">📦 Phê duyệt sản phẩm đấu giá mới</h3>
        <p className="text-neutral-500 mt-1">Xem xét chất lượng và kiểm duyệt các sản phẩm được người bán đăng tải trước khi hiển thị công khai.</p>
      </div>

      {error && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold">{success}</div>}

      {loading ? (
        <div className="text-center py-10 text-neutral-400">Đang tải sản phẩm chờ duyệt...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400">
          Không có sản phẩm nào đang chờ phê duyệt.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {products.map((product) => (
            <div 
              key={product.id} 
              className="p-5 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start hover:border-neutral-300 dark:hover:border-neutral-700 transition-all bg-white dark:bg-neutral-900"
            >
              {/* Product Info */}
              <div className="flex flex-col sm:flex-row gap-4 flex-grow">
                {product.imageUrl && (
                  <div className="w-full sm:w-32 h-32 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-850 flex-shrink-0 bg-neutral-100">
                    <img 
                      src={product.imageUrl} 
                      alt={product.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded text-[10px] font-bold">
                    {product.category?.name || 'Chưa phân loại'}
                  </span>
                  <h4 className="font-extrabold text-neutral-900 dark:text-white text-sm leading-snug">{product.title}</h4>
                  <p className="text-neutral-500 line-clamp-2 max-w-xl">{product.description}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
                    <p className="text-neutral-400">Giá khởi điểm: <span className="text-neutral-800 dark:text-neutral-200 font-bold">{formatCurrency(product.startPrice)}</span></p>
                    <p className="text-neutral-400">Giá mua đứt: <span className="text-neutral-800 dark:text-neutral-200 font-bold">{product.buyNowPrice ? formatCurrency(product.buyNowPrice) : 'Không có'}</span></p>
                    <p className="text-neutral-400">Người bán: <span className="text-neutral-800 dark:text-neutral-200 font-bold">{product.seller?.email}</span></p>
                    <p className="text-neutral-400">Thời gian bắt đầu: <span className="text-neutral-850 dark:text-neutral-300 font-semibold">{new Date(product.startTime).toLocaleString('vi-VN')}</span></p>
                    <p className="text-neutral-400">Thời gian kết thúc: <span className="text-neutral-850 dark:text-neutral-300 font-semibold">{new Date(product.endTime).toLocaleString('vi-VN')}</span></p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 md:flex-col justify-end w-full md:w-auto mt-4 md:mt-0 flex-shrink-0">
                <Button 
                  onClick={() => handleApprove(product.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full md:w-28 py-2.5 rounded-xl cursor-pointer"
                >
                  ✓ Duyệt đăng
                </Button>
                <Button 
                  onClick={() => setRejectingProduct(product)}
                  variant="danger"
                  className="w-full md:w-28 py-2.5 rounded-xl cursor-pointer"
                >
                  ✕ Từ chối
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingProduct && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full animate-scaleIn text-left">
            <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white mb-2">✕ Từ chối duyệt sản phẩm</h4>
            <p className="text-neutral-500 mb-4 leading-normal">
              Vui lòng cung cấp lý do từ chối cụ thể. Người bán sẽ nhận được thông báo để chỉnh sửa lại sản phẩm trong vòng 6 tiếng.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Lý do từ chối vi phạm</label>
                <textarea 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ví dụ: Hình ảnh mờ, sản phẩm thuộc danh mục cấm đấu giá, mô tả thiếu thông tin bảo hành..."
                  rows={4}
                  required
                  className="w-full p-3.5 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => { setRejectingProduct(null); setRejectionReason(''); }}
                  disabled={submittingReject}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  disabled={submittingReject || !rejectionReason.trim()}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingReject ? 'Đang gửi...' : 'Gửi cảnh báo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
