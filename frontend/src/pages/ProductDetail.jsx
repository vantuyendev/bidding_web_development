import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import CountdownTimer from '../components/CountdownTimer';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, getSseUrl } from '../api';


export default function ProductDetail() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [isProxyBid, setIsProxyBid] = useState(false);

  const getStepPrice = (currentPrice) => {
    const price = Number(currentPrice);
    if (price < 1000000) return 10000;
    if (price < 5000000) return 50000;
    return 100000;
  };

  const isEnded = product 
    ? (product.status === 'ENDED' || product.status === 'ended' || product.status === 'RESOLVED' || new Date(product.endTime).getTime() <= Date.now())
    : false;

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(getApiUrl(`/api/products/${id}`), {
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setProduct(data.data);
          // Pre-fill next bid with current price + dynamic step price
          const nextBid = data.data.currentPrice + getStepPrice(data.data.currentPrice);
          setBidAmount(String(nextBid));
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
    const eventSource = new EventSource(getSseUrl(id), {
      withCredentials: true
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProduct((prev) => {
          if (!prev) return null;
          const newPrice = Number(data.currentPrice);
          const step = getStepPrice(newPrice);
          const nextBid = newPrice + step;
          setBidAmount((curr) => {
            const val = parseFloat(curr);
            if (isNaN(val) || val <= newPrice) {
              return String(nextBid);
            }
            return curr;
          });
          return {
            ...prev,
            currentPrice: newPrice,
            endTime: data.endTime,
            ...(data.status ? { status: data.status } : {})
          };
        });
        // Trigger balance and profile updates when bid events occur
        refreshUser();
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

    const minAmount = product.currentPrice + getStepPrice(product.currentPrice);
    if (amount < minAmount) {
      setMessage({
        type: 'error',
        text: `Giá đặt phải lớn hơn hoặc bằng mức giá tối thiểu (${minAmount.toLocaleString('vi-VN')} đ).`,
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(getApiUrl('/api/bids/place'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          productId: id,
          ...(isProxyBid ? { maxAutoBidAmount: amount } : { bidAmount: amount })
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: isProxyBid 
            ? `Thiết lập Đấu giá Tự động thành công! Mức giá tối đa sẵn sàng trả: ${amount.toLocaleString('vi-VN')} đ.`
            : `Đặt giá thành công! Bạn đã đặt giá ${amount.toLocaleString('vi-VN')} đ.`,
        });

        refreshUser();

        setProduct((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentPrice: Number(data.data.currentPrice),
            endTime: data.data.endTime,
          };
        });

        const nextBid = Number(data.data.currentPrice) + getStepPrice(data.data.currentPrice);
        setBidAmount(String(nextBid));
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

  const handleBuyNow = async () => {
    if (!product || !product.buyNowPrice) return;

    const confirmBuy = window.confirm(`Bạn có chắc chắn muốn mua đứt sản phẩm này với giá ${product.buyNowPrice.toLocaleString('vi-VN')} đ? Phiên đấu giá sẽ kết thúc lập tức.`);
    if (!confirmBuy) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(getApiUrl('/api/bids/buy-now'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ productId: id }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Chúc mừng bạn! Đã mua đứt thành công sản phẩm với giá ${Number(data.data.currentPrice).toLocaleString('vi-VN')} đ.`,
        });

        refreshUser();

        setProduct((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentPrice: Number(data.data.currentPrice),
            endTime: data.data.endTime,
            status: data.data.status
          };
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Mua đứt thất bại. Vui lòng thử lại.',
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
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-center items-center py-12 px-4 xl:px-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-neutral-900 border-t-transparent dark:border-white rounded-full animate-spin"></div>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium">
            Đang tải thông tin sản phẩm đấu giá...
          </p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-center items-center py-12 px-4 xl:px-8">
        <div className="max-w-md w-full text-center bg-white dark:bg-neutral-900 p-8 rounded-md border border-neutral-200 dark:border-neutral-800">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 rounded-md flex items-center justify-center mx-auto mb-4 border border-neutral-200 dark:border-neutral-800">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Đã xảy ra lỗi</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">{error || 'Không tìm thấy sản phẩm yêu cầu.'}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold transition-colors"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      {/* Header / Navigation Breadcrumbs */}
      <nav className="max-w-7xl mx-auto px-4 xl:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white text-sm font-medium transition-colors group"
          >
            <span className="transform transition-transform inline-block">←</span>
            Quay lại danh sách
          </Link>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
            ID: {product.id.slice(0, 8)}...
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 xl:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
          
          {/* Left Column: Product Image Showcase */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-video w-full rounded-md overflow-hidden bg-white dark:bg-neutral-900 flex items-center justify-center p-8 border border-neutral-200 dark:border-neutral-800">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="max-h-full max-w-full object-contain rounded-sm"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-neutral-400 dark:text-neutral-600">
                  <svg className="w-16 h-16 stroke-current" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">Chưa có hình ảnh sản phẩm</span>
                </div>
              )}
            </div>

            {/* Product Meta Information */}
            <div className="bg-white dark:bg-neutral-900 rounded-md p-6 border border-neutral-200 dark:border-neutral-800">
              <h3 className="text-lg font-bold mb-3 text-neutral-900 dark:text-white">Mô tả sản phẩm</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-line">
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
                  <span className="px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-600 text-xs font-bold uppercase tracking-wider border border-neutral-200">
                    Đã kết thúc
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider">
                    Đang diễn ra
                  </span>
                )}
                <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Giao dịch an toàn
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight">
                {product.title}
              </h1>
            </div>

            {/* Countdown Timer Widget */}
            <div className="bg-white dark:bg-neutral-900 rounded-md p-6 border border-neutral-200 dark:border-neutral-800">
              <CountdownTimer endTime={product.endTime} />
            </div>

            {/* Price Information Container */}
            <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-5 flex flex-col gap-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-300">
                  Giá hiện tại
                </span>
                <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                  Phí tham gia: Miễn phí
                </span>
              </div>
              
              <div className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tight flex items-baseline gap-1.5">
                {product.currentPrice.toLocaleString('vi-VN')}
                <span className="text-lg md:text-xl font-bold">đ</span>
              </div>

              {/* Price Details Breakdown */}
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 grid grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-500 dark:text-neutral-400 font-bold">Giá khởi điểm</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {product.startPrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                {product.buyNowPrice && (
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-500 dark:text-neutral-400 font-bold">Giá mua ngay</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {product.buyNowPrice.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bidding Form */}
            <div className="bg-white dark:bg-neutral-900 rounded-md p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 flex flex-col gap-5">
              <h3 className="text-md font-bold text-neutral-800 dark:text-neutral-200">Đấu giá sản phẩm này</h3>
              
              {/* Message Banner (Success/Error) */}
              {message && (
                <div
                  className={`p-4 rounded-md text-sm font-semibold transition-all animate-fadeIn ${
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

              {/* Wallet State Box */}
              {user && (
                <div className="bg-neutral-50 dark:bg-neutral-950 px-4 py-3 rounded-md border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold">
                  <span className="text-neutral-500 dark:text-neutral-400">💰 Số dư ví khả dụng:</span>
                  <span className="text-neutral-900 dark:text-white font-black">{Number(user.balance).toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              {/* Proxy Bid Toggle Widget */}
              {!isEnded && (
                <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-950/50 p-4 rounded-md border border-neutral-200 dark:border-neutral-800 select-none">
                  <input
                    type="checkbox"
                    id="proxy-bid-toggle"
                    checked={isProxyBid}
                    onChange={(e) => {
                      setIsProxyBid(e.target.checked);
                      const step = getStepPrice(product.currentPrice);
                      setBidAmount(String(product.currentPrice + step));
                    }}
                    className="h-4.5 w-4.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer accent-neutral-900"
                  />
                  <label htmlFor="proxy-bid-toggle" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer flex flex-col">
                    <span>🤖 Kích hoạt Robot Đấu giá Tự động (Proxy Bid)</span>
                    <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-500 mt-0.5">Tự động nâng giá trị đấu giá khi bị đối thủ vượt mặt.</span>
                  </label>
                </div>
              )}

              <form onSubmit={handlePlaceBid} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bid-input" className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                    {isProxyBid 
                      ? 'Nhập giá tối đa bạn sẵn sàng trả cho sản phẩm này (VND)' 
                      : 'Nhập số tiền đấu giá (VND)'}
                  </label>
                  
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="bidAmount"
                      id="bid-input"
                      required
                      min={product.currentPrice + getStepPrice(product.currentPrice)}
                      disabled={isSubmitting || isEnded}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={isProxyBid ? "Ví dụ: 35000000" : "Ví dụ: 30000000"}
                      className="w-full pl-5 pr-12 py-4 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-lg md:text-xl font-bold rounded-md border border-neutral-300 dark:border-neutral-700 focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-colors"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-neutral-400 font-bold">
                      VND
                    </div>
                  </div>

                  {/* Escrow warning message */}
                  {bidAmount && !isNaN(Number(bidAmount)) && Number(bidAmount) > 0 && (
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 italic mt-0.5">
                      ⚠️ Hệ thống sẽ tạm đóng băng 10% ({Math.floor(Number(bidAmount) * 0.1).toLocaleString('vi-VN')} đ) trong ví của bạn để làm tiền đặt cọc.
                    </span>
                  )}

                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    Bước giá tối thiểu: +{getStepPrice(product.currentPrice).toLocaleString('vi-VN')}đ (nhập tối thiểu {(product.currentPrice + getStepPrice(product.currentPrice)).toLocaleString('vi-VN')}đ)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || isEnded}
                    className={`flex-1 py-4 px-6 rounded-md font-bold text-xs text-white transition-colors flex justify-center items-center gap-2 cursor-pointer ${
                      isEnded
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                        : isSubmitting
                          ? 'bg-neutral-700 cursor-not-allowed'
                          : 'bg-neutral-900 hover:bg-neutral-800'
                    }`}
                  >
                    {isEnded ? (
                      'Đấu giá kết thúc'
                    ) : isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang xử lý đặt giá...
                      </>
                    ) : (
                      'Đặt giá ngay'
                    )}
                  </button>

                  {product.buyNowPrice && (
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={isSubmitting || isEnded}
                      className={`flex-1 py-4 px-6 rounded-md font-bold text-xs transition-colors flex justify-center items-center gap-2 cursor-pointer ${
                        isEnded
                          ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                        : isSubmitting
                          ? 'bg-neutral-200 cursor-not-allowed'
                          : 'bg-white border border-neutral-900 hover:bg-neutral-50 text-neutral-900 dark:bg-neutral-800 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-750'
                      }`}
                    >
                      ⚡ Mua đứt ngay: {Number(product.buyNowPrice).toLocaleString('vi-VN')} đ
                    </button>
                  )}
                </div>
              </form>

              {/* Guarantees & Rules */}
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 flex flex-col gap-2.5 text-xs text-neutral-400 dark:text-neutral-500">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Chống cướp đấu giá: Đặt giá trong 30 giây cuối sẽ tự động cộng thêm 2 phút.</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
