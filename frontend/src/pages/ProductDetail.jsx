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

  // Watchlist states
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Order checkout modal states
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [winnerName, setWinnerName] = useState('');
  const [winnerPhone, setWinnerPhone] = useState('');
  const [winnerAddress, setWinnerAddress] = useState('');
  const [toProvince, setToProvince] = useState('Hà Nội');
  const [toDistrict, setToDistrict] = useState('');
  const [estShippingFee, setEstShippingFee] = useState(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isCustomDistrict, setIsCustomDistrict] = useState(false);

  const getStepPrice = (currentPrice) => {
    const price = Number(currentPrice);
    if (price < 1000000) return 10000;
    if (price < 5000000) return 50000;
    return 100000;
  };

  const provinces = [
    { id: 'HN', name: 'Hà Nội' },
    { id: 'HCM', name: 'TP. Hồ Chí Minh' },
    { id: 'DN', name: 'Đà Nẵng' },
    { id: 'HP', name: 'Hải Phòng' },
    { id: 'CT', name: 'Cần Thơ' },
    { id: 'BD', name: 'Bình Dương' },
    { id: 'DNai', name: 'Đồng Nai' },
    { id: 'KH', name: 'Khánh Hòa' },
    { id: 'QN', name: 'Quảng Ninh' },
  ];

  const districtSuggestions = {
    'Hà Nội': ['Quận Ba Đình', 'Quận Hoàn Kiếm', 'Quận Tây Hồ', 'Quận Cầu Giấy', 'Quận Đống Đa', 'Quận Hai Bà Trưng', 'Quận Hoàng Mai', 'Quận Thanh Xuân', 'Quận Long Biên', 'Quận Hà Đông', 'Quận Nam Từ Liêm', 'Quận Bắc Từ Liêm'],
    'TP. Hồ Chí Minh': ['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12', 'Quận Bình Thạnh', 'Quận Gò Vấp', 'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Tân Phú', 'Thành phố Thủ Đức'],
    'Đà Nẵng': ['Quận Hải Châu', 'Quận Thanh Khê', 'Quận Sơn Trà', 'Quận Ngũ Hành Sơn', 'Quận Liên Chiểu', 'Quận Cẩm Lệ']
  };

  const checkWatchlistStatus = async () => {
    if (!user) return;
    try {
      const res = await fetch(getApiUrl('/api/watchlist'), { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setInWatchlist(data.data.some(p => p.id === id));
      }
    } catch (err) {
      console.error('Lỗi kiểm tra trạng thái yêu thích:', err);
    }
  };

  const toggleWatchlist = async () => {
    if (!user) return;
    setWatchlistLoading(true);
    try {
      const method = inWatchlist ? 'DELETE' : 'POST';
      const endpoint = inWatchlist ? `/api/watchlist/${id}` : '/api/watchlist';
      const body = inWatchlist ? undefined : JSON.stringify({ productId: id });

      const res = await fetch(getApiUrl(endpoint), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setInWatchlist(!inWatchlist);
      }
    } catch (err) {
      console.error('Lỗi cập nhật yêu thích:', err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const getShippingFeeEstimate = async () => {
    if (!toProvince || !toDistrict) return;
    try {
      const res = await fetch(getApiUrl(`/api/shipping/estimate?productId=${id}&toProvinceId=${toProvince}&toDistrictId=${toDistrict}`), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setEstShippingFee(data.shippingFee);
      }
    } catch (err) {
      console.error('Lỗi tính phí giao hàng dự kiến:', err);
    }
  };

  useEffect(() => {
    if (checkoutModalOpen && toProvince && toDistrict) {
      getShippingFeeEstimate();
    }
  }, [toProvince, toDistrict, checkoutModalOpen]);

  useEffect(() => {
    if (id && user) {
      checkWatchlistStatus();
    }
  }, [id, user]);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setCheckoutError('');
    setCheckoutSubmitting(true);

    if (!winnerName || !winnerPhone || !winnerAddress || !toProvince || !toDistrict) {
      setCheckoutError('Vui lòng điền đầy đủ thông tin giao hàng.');
      setCheckoutSubmitting(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/api/orders/${id}/checkout`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerName,
          winnerPhone,
          winnerAddress,
          toProvinceId: toProvince,
          toDistrictId: toDistrict
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setCheckoutModalOpen(false);
        setProduct(prev => prev ? { ...prev, status: 'PAID' } : null);
        refreshUser();
        alert('Thanh toán 90% còn lại thành công. Aura Bid ký quỹ toàn bộ số tiền hàng!');
      } else {
        setCheckoutError(data.error || 'Thanh toán đơn hàng thất bại.');
      }
    } catch (err) {
      setCheckoutError('Lỗi kết nối máy chủ.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleShipProduct = async () => {
    const confirmShip = window.confirm('Bạn có chắc chắn xác nhận đã giao hàng cho hãng vận chuyển?');
    if (!confirmShip) return;

    try {
      const res = await fetch(getApiUrl(`/api/orders/${id}/ship`), {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setProduct(prev => prev ? { ...prev, status: 'SHIPPED' } : null);
        alert('Xác nhận giao hàng thành công!');
      } else {
        alert(data.error || 'Xác nhận giao hàng thất bại.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReceiveProduct = async () => {
    const confirmRec = window.confirm('Xác nhận bạn đã nhận được hàng đúng chất lượng mô tả? Aura Bid sẽ giải ngân 100% tiền ký quỹ cho người bán.');
    if (!confirmRec) return;

    try {
      const res = await fetch(getApiUrl(`/api/orders/${id}/receive`), {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setProduct(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
        refreshUser();
        alert('Giao dịch hoàn tất! Cảm ơn bạn đã mua hàng tại Aura Bid.');
      } else {
        alert(data.error || 'Xác nhận nhận hàng thất bại.');
      }
    } catch (err) {
      console.error(err);
    }
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

            {/* Product Description */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-sm font-bold mb-3 text-zinc-900 dark:text-zinc-50">Mô tả sản phẩm</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                {product.description || 'Không có mô tả chi tiết cho sản phẩm này.'}
              </p>
            </div>

            {/* EAV Specifications Table */}
            {product.attributes?.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800/80">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-450 mb-3">Thông số kỹ thuật</h3>
                <div className="overflow-hidden border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody>
                      {product.attributes.map((attr, idx) => (
                        <tr key={idx} className="border-b border-neutral-200/40 dark:border-neutral-800/40 last:border-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20">
                          <td className="py-2.5 px-4 font-bold text-neutral-500 bg-neutral-50/30 dark:bg-neutral-950/10 w-1/3">{attr.attributeKey?.name || attr.keyName}</td>
                          <td className="py-2.5 px-4 text-neutral-700 dark:text-neutral-300 font-semibold">{attr.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bids Timeline */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-450 mb-3">Lịch sử đặt giá ({product.bids?.length || 0})</h3>
              {(!product.bids || product.bids.length === 0) ? (
                <div className="text-center py-6 text-xs text-neutral-400">Chưa có lượt đặt giá nào.</div>
              ) : (
                <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                  {product.bids.map((bid, idx) => (
                    <div key={bid.id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-neutral-50/50 dark:bg-neutral-950/20 border border-neutral-200/40 dark:border-neutral-800/40">
                      <div className="space-y-0.5">
                        <p className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                          <span>User {bid.user?.email ? bid.user.email.split('@')[0] : 'Ẩn danh'}</span>
                          {idx === 0 && <span className="inline-block px-1.5 py-0.5 rounded-full text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">Dẫn đầu</span>}
                        </p>
                        <p className="text-[9px] text-neutral-400">{new Date(bid.bidTime).toLocaleString('vi-VN')}</p>
                      </div>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{Number(bid.bidAmount).toLocaleString('vi-VN')} đ</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seller Reputation Profile */}
            {product.seller && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800/80">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-455 mb-3">Thông tin người bán</h3>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-sm text-neutral-500 select-none">
                    {product.seller.email[0].toUpperCase()}
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      {product.seller.email.split('@')[0]}
                      {product.seller.isVerifiedSeller && <span className="text-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">✓ Xác thực</span>}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                      <span>★ Uy tín: {Number(product.seller.reputationScore || 5.0).toFixed(1)}/5.0</span>
                      <span>• Đã bán: {product.seller.soldCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              <div className="flex justify-between items-start gap-4">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                  {product.title}
                </h1>
                {user && (
                  <button
                    type="button"
                    onClick={toggleWatchlist}
                    disabled={watchlistLoading}
                    className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full hover:scale-105 transition-all cursor-pointer shadow-sm flex items-center justify-center flex-shrink-0"
                    title={inWatchlist ? "Bỏ yêu thích" : "Yêu thích"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2050/svg"
                      viewBox="0 0 24 24"
                      fill={inWatchlist ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className={`w-6 h-6 ${inWatchlist ? "text-rose-500" : "text-zinc-400 dark:text-zinc-500"}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  </button>
                )}
              </div>
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

              {/* Wallet State Box */}
              {user && !isEnded && (
                <div className="bg-zinc-100/70 dark:bg-zinc-950/70 px-4 py-3 rounded-2xl border border-zinc-200/55 dark:border-zinc-800/80 flex items-center justify-between text-xs font-semibold">
                  <span className="text-zinc-500 dark:text-zinc-400">💰 Số dư ví khả dụng:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">{Number(user.balance).toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              {isEnded ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl space-y-3">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 border-b border-zinc-200/50 dark:border-zinc-800 pb-2">
                      <span>🏁</span> Trạng thái giao dịch Ký quỹ (Escrow)
                    </p>

                    {product.status === 'PENDING_PAYMENT' && (
                      <div className="space-y-3.5 pt-1">
                        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                          {user?.id === product.winnerId
                            ? '🎉 Chúc mừng bạn đã thắng cuộc đấu giá! Vui lòng tiến hành thanh toán 90% số tiền còn lại cùng phí vận chuyển để người bán chuẩn bị hàng.'
                            : '⏳ Đang chờ người thắng cuộc hoàn tất thủ tục thanh toán ký quỹ 90% còn lại.'}
                        </p>
                        {user?.id === product.winnerId && (
                          <button
                            type="button"
                            onClick={() => {
                              setWinnerName(user.fullName || '');
                              setWinnerPhone(user.phoneNumber || '');
                              setWinnerAddress(user.address || '');
                              setCheckoutModalOpen(true);
                            }}
                            className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold py-3.5 rounded-xl hover:scale-[1.02] transition-all cursor-pointer text-center"
                          >
                            💳 Thanh toán & Xác nhận địa chỉ giao hàng
                          </button>
                        )}
                      </div>
                    )}

                    {product.status === 'PAID' && (
                      <div className="space-y-3.5 pt-1">
                        <p className="text-zinc-650 dark:text-zinc-400 leading-relaxed">
                          {user?.id === product.sellerId
                            ? '📦 Người thắng cuộc đã thanh toán 100% tiền hàng. Aura Bid đang giữ tiền hàng ký quỹ. Vui lòng đóng gói sản phẩm và giao cho hãng vận chuyển.'
                            : '🚚 Đơn hàng đã thanh toán & ký quỹ thành công. Người bán đang chuẩn bị giao hàng cho đối tác vận chuyển.'}
                        </p>
                        {user?.id === product.sellerId && (
                          <button
                            type="button"
                            onClick={handleShipProduct}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl hover:scale-[1.02] transition-all cursor-pointer text-center"
                          >
                            🚚 Xác nhận đã giao cho đơn vị vận chuyển
                          </button>
                        )}
                      </div>
                    )}

                    {product.status === 'SHIPPED' && (
                      <div className="space-y-3.5 pt-1">
                        <p className="text-zinc-655 dark:text-zinc-400 leading-relaxed">
                          {user?.id === product.winnerId
                            ? '📦 Đơn hàng đang được giao đến bạn. Vui lòng xác nhận sau khi nhận sản phẩm và kiểm định đúng chất lượng mô tả.'
                            : '⏳ Hàng đang trên đường vận chuyển. Tiền thanh toán sẽ được giải ngân khi người mua bấm xác nhận đã nhận hàng.'}
                        </p>
                        {user?.id === product.winnerId && (
                          <button
                            type="button"
                            onClick={handleReceiveProduct}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl hover:scale-[1.02] transition-all cursor-pointer text-center"
                          >
                            🤝 Xác nhận đã nhận hàng đúng mô tả
                          </button>
                        )}
                      </div>
                    )}

                    {product.status === 'COMPLETED' && (
                      <div className="space-y-2.5 pt-1">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl flex items-center gap-2">
                          <span>✓</span> Giao dịch hoàn tất thành công!
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-450 leading-relaxed">
                          Tiền ký quỹ an toàn đã được Aura Bid giải ngân vào số dư ví của người bán. Cảm ơn bạn đã tin dùng dịch vụ của chúng tôi!
                        </p>
                      </div>
                    )}

                    {product.status === 'UNSOLD' && (
                      <div className="p-3.5 bg-neutral-500/10 text-neutral-500 rounded-xl leading-relaxed font-semibold">
                        ⚠️ Phiên đấu giá kết thúc không thành công (Giá đấu cao nhất không đạt mức giá bảo lưu tối thiểu của người bán hoặc không có ai tham gia đấu giá).
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Proxy Bid Toggle Widget */}
                  <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950/50 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 select-none">
                    <input
                      type="checkbox"
                      id="proxy-bid-toggle"
                      checked={isProxyBid}
                      onChange={(e) => {
                        setIsProxyBid(e.target.checked);
                        const step = getStepPrice(product.currentPrice);
                        setBidAmount(String(product.currentPrice + step));
                      }}
                      className="h-4.5 w-4.5 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-400"
                    />
                    <label htmlFor="proxy-bid-toggle" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer flex flex-col">
                      <span>🤖 Kích hoạt Robot Đấu giá Tự động (Proxy Bid)</span>
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500 mt-0.5">Tự động nâng giá trị đấu giá khi bị đối thủ vượt mặt.</span>
                    </label>
                  </div>

                  <form onSubmit={handlePlaceBid} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="bid-input" className="text-xs font-bold text-zinc-650 dark:text-zinc-400">
                        {isProxyBid 
                          ? 'Nhập giá tối đa bạn sẵn sàng trả cho sản phẩm này (VND)' 
                          : 'Nhập số tiền đấu giá (VND)'}
                      </label>
                      
                      <div className="relative rounded-2xl shadow-sm">
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
                          className="w-full pl-5 pr-12 py-4 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-lg md:text-xl font-bold rounded-2xl border border-zinc-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-800 dark:focus:border-amber-500 outline-none transition-all"
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-400 font-bold">
                          VND
                        </div>
                      </div>

                      {/* Escrow warning message */}
                      {bidAmount && !isNaN(Number(bidAmount)) && Number(bidAmount) > 0 && (
                        <span className="text-[10px] text-zinc-405 dark:text-zinc-500 italic mt-0.5">
                          ⚠️ Hệ thống sẽ tạm đóng băng 10% ({Math.floor(Number(bidAmount) * 0.1).toLocaleString('vi-VN')} đ) trong ví của bạn để làm tiền đặt cọc.
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        Bước giá tối thiểu: +{getStepPrice(product.currentPrice).toLocaleString('vi-VN')}đ (nhập tối thiểu {(product.currentPrice + getStepPrice(product.currentPrice)).toLocaleString('vi-VN')}đ)
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="submit"
                        disabled={isSubmitting || isEnded}
                        className={`flex-1 py-4 px-6 rounded-2xl font-bold text-xs text-white shadow-md transition-all active:scale-98 flex justify-center items-center gap-2 cursor-pointer ${
                          isEnded
                            ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed shadow-none'
                            : isSubmitting
                              ? 'bg-amber-405 cursor-not-allowed'
                              : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang xử lý...
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
                          className={`flex-1 py-4 px-6 rounded-2xl font-bold text-xs text-white shadow-md transition-all active:scale-98 flex justify-center items-center gap-2 cursor-pointer ${
                            isEnded
                              ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed shadow-none'
                            : isSubmitting
                              ? 'bg-rose-405 cursor-not-allowed'
                              : 'bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600 shadow-rose-500/10'
                          }`}
                        >
                          ⚡ Mua đứt: {Number(product.buyNowPrice).toLocaleString('vi-VN')} đ
                        </button>
                      )}
                    </div>
                  </form>
                </>
              )}

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

      {/* Winner Escrow Checkout Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-250/50 dark:border-neutral-800/80 rounded-3xl p-6 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-lg font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">💳 Xác nhận đơn hàng & Ký quỹ an toàn</h3>
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                Vui lòng điền thông tin địa chỉ giao nhận hàng. Aura Bid sẽ tạm giữ 100% tiền hàng + phí giao hàng cho đến khi bạn xác nhận đã nhận hàng thành công.
              </p>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
              {checkoutError && <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{checkoutError}</div>}

              <div className="space-y-1.5">
                <label className="block text-neutral-400 font-bold">Tên người nhận</label>
                <input
                  type="text"
                  placeholder="Nhập tên người nhận"
                  value={winnerName}
                  onChange={(e) => setWinnerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-neutral-400 font-bold">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="Nhập số điện thoại liên hệ"
                  value={winnerPhone}
                  onChange={(e) => setWinnerPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-neutral-400 font-bold">Tỉnh / Thành phố</label>
                  <select
                    value={toProvince}
                    onChange={(e) => {
                      setToProvince(e.target.value);
                      setToDistrict('');
                      setIsCustomDistrict(false);
                      setEstShippingFee(null);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400"
                    required
                  >
                    {provinces.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-neutral-400 font-bold">Quận / Huyện</label>
                  {!isCustomDistrict && districtSuggestions[toProvince] ? (
                    <select
                      value={toDistrict}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomDistrict(true);
                          setToDistrict('');
                          setEstShippingFee(null);
                        } else {
                          setToDistrict(e.target.value);
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none"
                      required
                    >
                      <option value="">-- Chọn quận/huyện --</option>
                      {districtSuggestions[toProvince].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      <option value="custom">Khác (Nhập tay)</option>
                    </select>
                  ) : (
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        placeholder="Nhập quận/huyện"
                        value={toDistrict}
                        onChange={(e) => setToDistrict(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none"
                        required
                      />
                      {districtSuggestions[toProvince] && (
                        <button
                          type="button"
                          onClick={() => { setIsCustomDistrict(false); setToDistrict(''); }}
                          className="px-2 py-3 border border-neutral-200 dark:border-neutral-850 rounded-xl text-[9px] hover:bg-neutral-50 font-bold"
                        >
                          Chọn lại
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-neutral-400 font-bold">Địa chỉ chi tiết</label>
                <input
                  type="text"
                  placeholder="Số nhà, tên đường, phường/xã"
                  value={winnerAddress}
                  onChange={(e) => setWinnerAddress(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 font-semibold"
                  required
                />
              </div>

              {/* Real-time Logistics Breakdown */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                <div className="flex justify-between font-medium">
                  <span className="text-neutral-500">Giá trị sản phẩm thắng cược:</span>
                  <span className="text-neutral-850 dark:text-neutral-200 font-bold">{Number(product.currentPrice).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between font-medium text-[10px] text-zinc-400">
                  <span>Tiền cọc đã thanh toán (10%):</span>
                  <span>- {Math.floor(Number(product.currentPrice) * 0.1).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between font-medium text-[10px] text-zinc-400 border-b border-neutral-200/50 pb-2">
                  <span>Phí giao hàng ước tính ({product.weight || 0.5} kg):</span>
                  <span>{estShippingFee !== null ? `${estShippingFee.toLocaleString('vi-VN')} đ` : 'Đang tính toán...'}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1">
                  <span className="text-amber-850 dark:text-amber-400">Tổng thanh toán còn lại:</span>
                  <span className="text-amber-600 dark:text-amber-450">
                    {estShippingFee !== null 
                      ? `${Math.max(0, Math.floor(Number(product.currentPrice) * 0.9) + estShippingFee).toLocaleString('vi-VN')} đ`
                      : 'Đang tính toán...'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={checkoutSubmitting || estShippingFee === null}
                className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold py-3.5 rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 cursor-pointer text-center"
              >
                {checkoutSubmitting ? 'Đang thực hiện thanh toán...' : 'Xác nhận thanh toán đơn hàng'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
