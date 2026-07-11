import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import ReviewModal from '../../components/ReviewModal';
import Button from '../../components/ui/Button';

export default function BidHistory(props) {
  const context = useOutletContext() || {};
  const profileData = props.profileData || context.profileData;
  const fetchFullProfile = props.fetchFullProfile || context.fetchFullProfile;
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState('');
  const [reviewProductName, setReviewProductName] = useState('');

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'won' | 'lost'

  const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';
  
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleOpenReviewModal = (productId, productName) => {
    setReviewProductId(productId);
    setReviewProductName(productName);
    setReviewModalOpen(true);
  };

  if (!profileData) return null;

  const filteredBids = (profileData.bids || []).filter((bid) => {
    const prod = bid.product;
    if (!prod) return false;
    const isProductActive = prod.status === 'ACTIVE';
    const isWon = !isProductActive && prod.winnerId === profileData.id;

    if (activeFilter === 'active') return isProductActive;
    if (activeFilter === 'won') return isWon;
    if (activeFilter === 'lost') return !isProductActive && !isWon;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Lịch sử lượt đặt giá</h3>
        
        {/* Filter Tabs */}
        <div className="flex border border-neutral-200 dark:border-neutral-800 rounded-xl p-1 gap-1 select-none w-fit">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'active', label: 'Đang đấu' },
            { id: 'won', label: 'Đã thắng' },
            { id: 'lost', label: 'Không thắng' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-neutral-900 text-white dark:bg-neutral-800'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredBids.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-xs text-neutral-400 flex flex-col items-center justify-center gap-3">
          <span className="text-3xl">⚖️</span>
          <p>Không tìm thấy lượt đặt giá nào phù hợp với bộ lọc.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredBids.map((bid) => {
            const prod = bid.product;
            if (!prod) return null;
            const isProductActive = prod.status === 'ACTIVE';
            const isWon = !isProductActive && prod.winnerId === profileData.id;
            const isEnded = prod.status === 'ENDED' || prod.status === 'PENDING_PAYMENT' || prod.status === 'PAID' || prod.status === 'SHIPPED' || prod.status === 'COMPLETED' || new Date(prod.endTime).getTime() <= Date.now();
            
            return (
              <div
                key={bid.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-2xl transition-all duration-300 ${
                  isWon 
                    ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/5 hover:border-emerald-500' 
                    : 'border-neutral-200/50 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="space-y-1.5">
                  <Link
                    to={`/products/${bid.productId}`}
                    className="font-bold text-xs text-neutral-900 dark:text-white hover:text-amber-500 transition-colors line-clamp-1 no-underline"
                  >
                    {prod.title}
                  </Link>
                  <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                    <span>Thời gian: {formatDate(bid.bidTime)}</span>
                    {bid.isAutoBid && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20">
                        🤖 Robot tự động
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6">
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] text-neutral-400">Bạn đã đặt</span>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5">
                      {formatMoney(bid.bidAmount)}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 min-w-[110px]">
                    {isProductActive ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 select-none">
                        Đang diễn ra
                      </span>
                    ) : isWon ? (
                      <>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 select-none">
                          🎉 Đã chiến thắng
                        </span>
                        {prod.status === 'PENDING_PAYMENT' && (
                          <Link to={`/products/${prod.id}`}>
                            <Button
                              size="sm"
                              className="px-2.5 py-1 rounded-full text-[9px] font-bold cursor-pointer text-center select-none shadow-sm bg-amber-500 text-white"
                            >
                              Thanh toán ngay 💳
                            </Button>
                          </Link>
                        )}
                        {prod.status !== 'PENDING_PAYMENT' && (
                          prod.review ? (
                            <span className="inline-flex items-center justify-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 select-none">
                              ★ Đã đánh giá
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleOpenReviewModal(prod.id, prod.title)}
                              size="sm"
                              className="px-2.5 py-1 rounded-full text-[9px] font-bold cursor-pointer text-center select-none shadow-sm"
                            >
                              Đánh giá đối tác
                            </Button>
                          )
                        )}
                      </>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 select-none">
                        Không chiến thắng
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        productId={reviewProductId}
        productName={reviewProductName}
        onSuccess={fetchFullProfile}
      />
    </div>
  );
}
