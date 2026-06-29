import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import CountdownTimer from '../components/CountdownTimer';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const isEnded = product 
    ? (product.status === 'ENDED' || product.status === 'ended' || new Date(product.endTime).getTime() <= Date.now())
    : false;

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setProduct(data.data);
          // Pre-fill next bid with current price + 50,000 VND as a smart UX choice
          setBidAmount(String(data.data.currentPrice + 50000));
        } else {
          setError(data.error || 'Không thể tải thông tin sản phẩm.');
        }
      } catch (err) {
        setError('Đã xảy ra lỗi kết nối với máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    
    // Connect to SSE on backend
    const eventSource = new EventSource(`/api/products/${id}/live`, {
      withCredentials: true
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProduct((prev) => {
          if (!prev) return null;
          // Update current price and end time from SSE message
          return {
            ...prev,
            currentPrice: Number(data.currentPrice),
            endTime: data.endTime,
            ...(data.status ? { status: data.status } : {})
          };
        });
      } catch (err) {
        console.error('Lỗi phân tích dữ liệu SSE:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Lỗi kết nối SSE, đang thử kết nối lại...', err);
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!product) return;

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Vui lòng nhập số tiền hợp lệ.' });
      return;
    }

    if (amount <= product.currentPrice) {
      setMessage({
        type: 'error',
        text: `Giá đặt phải lớn hơn giá hiện tại (${product.currentPrice.toLocaleString('vi-VN')} đ).`,
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/bids/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          productId: id,
          bidAmount: amount,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Đặt giá thành công! Bạn đã đặt giá ${amount.toLocaleString('vi-VN')} đ`,
        });

        // Instantly update product price and end time from API response
        setProduct((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentPrice: Number(data.data.currentPrice),
            endTime: data.data.endTime,
          };
        });

        // Set next recommended bid
        setBidAmount(String(Number(data.data.currentPrice) + 50000));
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Đặt giá thất bại. Vui lòng thử lại.',
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng kiểm tra kết nối mạng.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium animate-pulse">
            Đang tải thông tin sản phẩm đấu giá...
          </p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Đã xảy ra lỗi</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error || 'Không tìm thấy sản phẩm yêu cầu.'}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-all shadow-md active:scale-95"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors duration-300">
      {/* Header / Navigation Breadcrumbs */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-sm font-medium transition-colors group"
          >
            <span className="transform group-hover:-translate-x-1 transition-transform inline-block">←</span>
            Quay lại danh sách
          </Link>
          <div className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
            ID: {product.id.slice(0, 8)}...
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
          
          {/* Left Column: Product Image Showcase */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden shadow-lg bg-gradient-to-br from-zinc-100 via-zinc-50 to-white dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 flex items-center justify-center p-8 border border-zinc-200/50 dark:border-zinc-800/80">
              {/* Artistic Grid Overlay Background */}
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="max-h-full max-w-full object-contain rounded-2xl drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-400 dark:text-zinc-600">
                  <svg className="w-16 h-16 stroke-current" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">Chưa có hình ảnh sản phẩm</span>
                </div>
              )}
            </div>

            {/* Product Meta Information */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-lg font-bold mb-3 text-zinc-900 dark:text-zinc-50">Mô tả sản phẩm</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                {product.description || 'Không có mô tả chi tiết cho sản phẩm này.'}
              </p>
            </div>
          </div>

          {/* Right Column: Information & Bidding Panel */}
          <div className="flex flex-col gap-6 md:gap-8">
            {/* Title & Status Header */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {isEnded ? (
                  <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
                    Đã kết thúc
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                    Đang diễn ra
                  </span>
                )}
                <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Giao dịch an toàn
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                {product.title}
              </h1>
            </div>

            {/* Countdown Timer Widget */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800/80">
              <CountdownTimer endTime={product.endTime} />
            </div>

            {/* Price Information Container */}
            <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/30 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  Giá hiện tại
                </span>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-500">
                  Phí tham gia: Miễn phí
                </span>
              </div>
              
              <div className="text-3xl md:text-4xl font-black text-amber-900 dark:text-amber-300 tracking-tight flex items-baseline gap-1.5">
                {product.currentPrice.toLocaleString('vi-VN')}
                <span className="text-lg md:text-xl font-bold">đ</span>
              </div>

              {/* Price Details Breakdown */}
              <div className="border-t border-amber-200/40 dark:border-amber-900/20 pt-4 grid grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-amber-800/70 dark:text-amber-400/60 font-medium">Giá khởi điểm</span>
                  <span className="font-bold text-amber-950 dark:text-amber-200">
                    {product.startPrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                {product.buyNowPrice && (
                  <div className="flex flex-col gap-1">
                    <span className="text-amber-800/70 dark:text-amber-400/60 font-medium">Giá mua ngay</span>
                    <span className="font-bold text-amber-950 dark:text-amber-200">
                      {product.buyNowPrice.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bidding Form */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-md border border-zinc-100 dark:border-zinc-800/80 flex flex-col gap-5">
              <h3 className="text-md font-bold text-zinc-800 dark:text-zinc-200">Đấu giá sản phẩm này</h3>
              
              {/* Message Banner (Success/Error) */}
              {message && (
                <div
                  className={`p-4 rounded-2xl text-sm font-semibold transition-all animate-fadeIn ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                      : 'bg-rose-50 text-rose-800 border border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                  }`}
                >
                  <div className="flex gap-2 items-center">
                    <span className="flex-shrink-0">
                      {message.type === 'success' ? '✓' : '✕'}
                    </span>
                    <p>{message.text}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handlePlaceBid} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bid-input" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Nhập số tiền đấu giá (VND)
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <input
                      type="number"
                      name="bidAmount"
                      id="bid-input"
                      required
                      min={product.currentPrice + 1}
                      disabled={isSubmitting || isEnded}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Ví dụ: 30000000"
                      className="w-full pl-5 pr-12 py-4 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-lg md:text-xl font-bold rounded-2xl border border-zinc-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-800 dark:focus:border-amber-500 outline-none transition-all"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-400 font-bold">
                      VND
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Bước giá đề xuất: +50.000đ (nhập tối thiểu {(product.currentPrice + 1).toLocaleString('vi-VN')}đ)
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isEnded}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-base md:text-lg text-white shadow-lg active:scale-95 transition-all duration-150 flex justify-center items-center gap-2 ${
                    isEnded
                      ? 'bg-zinc-400 dark:bg-zinc-800 text-zinc-200 dark:text-zinc-500 cursor-not-allowed shadow-none'
                      : isSubmitting
                        ? 'bg-amber-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/10'
                  }`}
                >
                  {isEnded ? (
                    'Đấu giá đã kết thúc'
                  ) : isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang xử lý đặt giá...
                    </>
                  ) : (
                    'Đặt giá ngay'
                  )}
                </button>
              </form>

              {/* Guarantees & Rules */}
              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4 flex flex-col gap-2.5 text-xs text-zinc-400 dark:text-zinc-500">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Chống cướp đấu giá: Đặt giá trong 30 giây cuối sẽ tự động cộng thêm 2 phút.</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Mỗi lượt đấu giá thành công sẽ cập nhật số dư ví ảo của bạn.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
