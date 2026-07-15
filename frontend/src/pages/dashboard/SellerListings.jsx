import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

const KycCountdown = ({ rejectedAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const limit = new Date(rejectedAt).getTime() + 6 * 60 * 60 * 1000;
      const diff = limit - Date.now();

      if (diff <= 0) {
        setTimeLeft('Đã hết hạn chỉnh sửa');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`Còn lại: ${hours}g ${minutes}p ${seconds}s`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [rejectedAt]);

  return (
    <span className="font-mono bg-rose-500/20 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md font-extrabold text-[10px] ml-1.5">
      {timeLeft}
    </span>
  );
};

export default function SellerListings(props) {
  const context = useOutletContext() || {};
  const profileData = props.profileData || context.profileData;

  const [sellerProducts, setSellerProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editBuyNowPrice, setEditBuyNowPrice] = useState('');
  const [editHasBuyNow, setEditHasBuyNow] = useState(false);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editLength, setEditLength] = useState('');
  const [editWidth, setEditWidth] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchSellerListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/products/seller?includeHistory=true'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSellerProducts(data.data);
      } else {
        setError(data.error || 'Lỗi khi tải danh sách sản phẩm đăng bán.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileData) {
      fetchSellerListings();
    }
  }, [profileData]);

  // Listen to new listings posted to refresh
  useEffect(() => {
    const handleProductCreated = () => {
      fetchSellerListings();
    };
    window.addEventListener('product-created', handleProductCreated);
    return () => window.removeEventListener('product-created', handleProductCreated);
  }, []);

  const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';
  
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getApprovalBadgeClass = (status) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'APPROVED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  const getApprovalText = (status) => {
    if (status === 'PENDING_REVIEW') return 'Chờ duyệt';
    if (status === 'APPROVED') return 'Đã duyệt';
    return 'Bị từ chối';
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setEditTitle(prod.title || '');
    setEditDescription(prod.description || '');
    setEditImageUrl(prod.imageUrl || '');
    setEditBuyNowPrice(prod.buyNowPrice ? String(prod.buyNowPrice) : '');
    setEditHasBuyNow(!!prod.buyNowPrice);
    
    // Format dates to datetime-local values (YYYY-MM-DDTHH:MM)
    if (prod.startTime) {
      const startD = new Date(prod.startTime);
      const startFormatted = new Date(startD.getTime() - startD.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditStartTime(startFormatted);
    } else {
      setEditStartTime('');
    }
    
    if (prod.endTime) {
      const endD = new Date(prod.endTime);
      const endFormatted = new Date(endD.getTime() - endD.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditEndTime(endFormatted);
    } else {
      setEditEndTime('');
    }

    setEditWeight(prod.weight ? String(prod.weight) : '');
    setEditLength(prod.length ? String(prod.length) : '');
    setEditWidth(prod.width ? String(prod.width) : '');
    setEditHeight(prod.height ? String(prod.height) : '');
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSubmitting(true);

    const buyNowPrice = (editHasBuyNow && editBuyNowPrice) ? parseFloat(editBuyNowPrice) : null;

    if (editHasBuyNow && (!buyNowPrice || buyNowPrice <= 0)) {
      setEditError('Vui lòng nhập giá mua đứt hợp lệ.');
      setEditSubmitting(false);
      return;
    }

    // Validate startTime và endTime
    const chosenStart = editStartTime ? new Date(editStartTime) : new Date(editingProduct.startTime);
    const chosenEnd = new Date(editEndTime);
    const maxEndTime = new Date(chosenStart.getTime() + 48 * 60 * 60 * 1000);
    if (chosenEnd <= chosenStart) {
      setEditError('Thời gian kết thúc phải sau thời điểm bắt đầu.');
      setEditSubmitting(false);
      return;
    }
    if (chosenEnd > maxEndTime) {
      setEditError('Thời gian kết thúc đấu giá không được vượt quá 48 giờ kể từ thời điểm bắt đầu.');
      setEditSubmitting(false);
      return;
    }

    const payload = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      imageUrl: editImageUrl.trim(),
      buyNowPrice,
      startTime: editStartTime ? new Date(editStartTime).toISOString() : null,
      endTime: new Date(editEndTime).toISOString(),
      weight: editWeight ? parseFloat(editWeight) : null,
      length: editLength ? parseFloat(editLength) : null,
      width: editWidth ? parseFloat(editWidth) : null,
      height: editHeight ? parseFloat(editHeight) : null,
    };

    try {
      const res = await fetch(getApiUrl(`/api/products/${editingProduct.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setEditingProduct(null);
        alert(data.message);
        fetchSellerListings();
      } else {
        setEditError(data.error || 'Cập nhật thất bại.');
      }
    } catch (err) {
      setEditError('Lỗi kết nối máy chủ.');
    } finally {
      setEditSubmitting(false);
    }
  };

  if (!profileData) return null;

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Sản phẩm đăng đấu giá</h3>
        <Button
          onClick={() => window.dispatchEvent(new Event('open-post-modal'))}
          size="sm"
          className="rounded-full cursor-pointer"
        >
          + Tạo bài Đấu giá mới
        </Button>
      </div>

      {error && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{error}</div>}

      {loading ? (
        <div className="text-center py-10 text-neutral-400">
          Đang tải danh mục đăng bán...
        </div>
      ) : sellerProducts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center border border-neutral-200/50 dark:border-neutral-800 text-neutral-300 dark:text-neutral-700">
            📦
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-neutral-900 dark:text-white">Bạn chưa đăng bán đấu giá sản phẩm nào</p>
            <p className="text-[10px] text-neutral-400">Đăng bài đấu giá các mặt hàng của bạn ngay hôm nay để tăng thu nhập.</p>
          </div>
          <Button
            onClick={() => window.dispatchEvent(new Event('open-post-modal'))}
            className="mt-2 rounded-full px-5 py-2.5 shadow-sm cursor-pointer"
          >
            + Tạo bài Đấu giá mới
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sellerProducts.map((prod) => {
            const isEnded = prod.status === 'ENDED' || prod.status === 'PENDING_PAYMENT' || prod.status === 'PAID' || prod.status === 'SHIPPED' || prod.status === 'COMPLETED' || new Date(prod.endTime).getTime() <= Date.now();
            const canEdit = ['PENDING_REVIEW', 'REJECTED'].includes(prod.approvalStatus) && prod.editCount < 2;

            return (
              <div
                key={prod.id}
                className="p-5 border border-neutral-200/50 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 rounded-2xl transition-all bg-white dark:bg-neutral-900 space-y-3"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-850 overflow-hidden flex items-center justify-center flex-shrink-0 border border-neutral-200/40 dark:border-neutral-700/30">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-neutral-300 text-xs select-none">📦</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Link
                        to={`/products/${prod.id}`}
                        className="font-bold text-xs text-neutral-900 dark:text-white hover:text-amber-500 transition-colors line-clamp-1 no-underline"
                      >
                        {prod.title}
                      </Link>
                      <span className="block text-[9px] text-neutral-400">
                        Bắt đầu: {formatDate(prod.startTime)} • Kết thúc: {formatDate(prod.endTime)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[9px] text-neutral-400">Giá hiện tại</span>
                      <span className="text-xs font-black text-neutral-900 dark:text-white mt-0.5">
                        {formatMoney(prod.currentPrice)}
                      </span>
                    </div>

                    <div className="text-center flex flex-col gap-1 items-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getApprovalBadgeClass(prod.approvalStatus)}`}>
                        {getApprovalText(prod.approvalStatus)}
                      </span>
                      {prod.editCount > 0 && (
                        <span className="text-[8px] text-neutral-400">Đã sửa: {prod.editCount}/2</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Show rejection reason warning */}
                {prod.approvalStatus === 'REJECTED' && prod.rejectionReason && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 rounded-xl leading-normal">
                    <p className="font-bold text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span>⚠️ Lý do bị Admin từ chối duyệt:</span>
                      {prod.rejectedAt && <KycCountdown rejectedAt={prod.rejectedAt} />}
                    </p>
                    <p className="italic">"{prod.rejectionReason}"</p>
                    <p className="text-[9px] text-neutral-400 mt-1.5 font-semibold">Vui lòng chỉnh sửa lại trong thời gian quy định để tránh bị xóa vĩnh viễn.</p>
                  </div>
                )}

                {/* Edit options for Pending/Rejected */}
                {canEdit && (
                  <div className="flex justify-end pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
                    <button 
                      onClick={() => handleOpenEdit(prod)}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all cursor-pointer text-[10px]"
                    >
                      ✏️ Chỉnh sửa thông tin ({2 - prod.editCount} lần còn lại)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingProduct && (
        <Modal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          title="Chỉnh sửa thông tin bài đấu giá"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 text-left">
            {editError && <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{editError}</div>}

            <Input 
              id="edit-title"
              type="text"
              label="Tiêu đề sản phẩm"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Mô tả sản phẩm</label>
              <textarea 
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                required
                className="w-full p-3.5 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-amber-500"
              ></textarea>
            </div>

            <Input 
              id="edit-image"
              type="text"
              label="Đường dẫn ảnh sản phẩm (URL)"
              value={editImageUrl}
              onChange={(e) => setEditImageUrl(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              {/* Start price is locked */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Giá khởi điểm (Khóa)</label>
                <div className="w-full p-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-100 dark:bg-neutral-850 text-neutral-400 font-bold">
                  {formatMoney(editingProduct.startPrice)}
                </div>
              </div>

              {/* Edit Buy Now Toggle & Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <input
                    id="edit-toggle-buynow"
                    type="checkbox"
                    checked={editHasBuyNow}
                    onChange={(e) => {
                      setEditHasBuyNow(e.target.checked);
                      if (!e.target.checked) setEditBuyNowPrice('');
                    }}
                    className="rounded border-neutral-300 dark:border-neutral-700 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="edit-toggle-buynow" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                    Kích hoạt giá mua đứt (Gõ búa 🔨)
                  </label>
                </div>
                {editHasBuyNow && (
                  <Input 
                    id="edit-buynow"
                    type="number"
                    label="Giá mua đứt (đ)"
                    value={editBuyNowPrice}
                    onChange={(e) => setEditBuyNowPrice(e.target.value)}
                    required={editHasBuyNow}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input 
                id="edit-starttime"
                type="datetime-local"
                label="Thời gian bắt đầu"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                required
              />
              <Input 
                id="edit-endtime"
                type="datetime-local"
                label="Thời gian kết thúc (max 48h)"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <Input id="edit-w" type="number" label="Cân nặng (g)" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
              <Input id="edit-l" type="number" label="Dài (cm)" value={editLength} onChange={(e) => setEditLength(e.target.value)} />
              <Input id="edit-wi" type="number" label="Rộng (cm)" value={editWidth} onChange={(e) => setEditWidth(e.target.value)} />
              <Input id="edit-h" type="number" label="Cao (cm)" value={editHeight} onChange={(e) => setEditHeight(e.target.value)} />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button 
                type="button"
                onClick={() => setEditingProduct(null)}
                disabled={editSubmitting}
                className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit"
                disabled={editSubmitting}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {editSubmitting ? 'Đang gửi duyệt...' : 'Gửi duyệt lại'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
