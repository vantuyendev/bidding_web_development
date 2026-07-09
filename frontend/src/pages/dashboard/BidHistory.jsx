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

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Lịch sử lượt đặt giá</h3>

      {!profileData.bids || profileData.bids.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-xs text-neutral-400 flex flex-col items-center justify-center gap-3">
          <span className="text-3xl">⚖️</span>
          <p>Bạn chưa tham gia đấu giá sản phẩm nào.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {profileData.bids.map((bid) => {
            const prod = bid.product;
            const isEnded = prod ? (prod.status === 'ENDED' || new Date(prod.endTime).getTime() <= Date.now()) : true;
            return (
              <div
                key={bid.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-neutral-200/50 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700/80 rounded-2xl transition-all duration-300"
              >
                <div className="space-y-1.5">
                  {prod ? (
                    <Link
                      to={`/products/${bid.productId}`}
                      className="font-bold text-xs text-neutral-900 dark:text-white hover:text-amber-500 transition-colors line-clamp-1 no-underline"
                    >
                      {prod.title}
                    </Link>
                  ) : (
                    <span className="font-bold text-xs text-neutral-400">Sản phẩm đã bị xóa</span>
                  )}
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

                  <div className="flex flex-col items-end gap-1.5 min-w-[100px]">
                    {isEnded ? (
                      <>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 select-none">
                          Đã kết thúc
                        </span>
                        {prod && Number(bid.bidAmount) === Number(prod.currentPrice) && (
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
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 select-none">
                        Đang đấu giá
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
