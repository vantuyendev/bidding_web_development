import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Button from '../../components/ui/Button';

export default function SellerListings(props) {
  const context = useOutletContext() || {};
  const products = props.products || context.products || [];
  const profileData = props.profileData || context.profileData;
  const productsLoading = props.productsLoading !== undefined ? props.productsLoading : context.productsLoading;
  const sellerListings = products.filter(p => p.sellerId === profileData.id);

  const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';
  
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  if (!profileData) return null;

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Sản phẩm đăng đấu giá</h3>
        {sellerListings.length > 0 && (
          <Button
            onClick={() => window.dispatchEvent(new Event('open-post-modal'))}
            size="sm"
            className="rounded-full"
          >
            + Tạo bài Đấu giá mới
          </Button>
        )}
      </div>

      {productsLoading ? (
        <div className="text-center py-10 text-xs text-neutral-400">
          Đang tải danh mục đăng bán...
        </div>
      ) : sellerListings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center border border-neutral-200/50 dark:border-neutral-800 text-neutral-300 dark:text-neutral-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-neutral-900 dark:text-white">Bạn chưa đăng bán đấu giá sản phẩm nào</p>
            <p className="text-[10px] text-neutral-400">Trở thành người bán và đăng bài đấu giá các mặt hàng của bạn ngay hôm nay.</p>
          </div>
          <Button
            onClick={() => window.dispatchEvent(new Event('open-post-modal'))}
            className="mt-2 rounded-full px-5 py-2.5 shadow-sm"
          >
            + Tạo bài Đấu giá mới
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sellerListings.map((prod) => {
            const isEnded = prod.status === 'ENDED' || new Date(prod.endTime).getTime() <= Date.now();
            return (
              <div
                key={prod.id}
                className="flex items-center justify-between gap-4 p-4 border border-neutral-200/50 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700/80 rounded-2xl transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center flex-shrink-0 border border-neutral-200/40 dark:border-neutral-700/30">
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
                      Kết thúc: {formatDate(prod.endTime)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] text-neutral-400">Giá hiện tại</span>
                    <span className="text-xs font-black text-neutral-900 dark:text-white mt-0.5">
                      {formatMoney(prod.currentPrice)}
                    </span>
                  </div>

                  <div className="w-24 text-right">
                    {isEnded ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        Đã chốt
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Đang diễn ra
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
