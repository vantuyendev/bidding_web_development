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

  // Pre-bid Shipping Estimator States (Tabs)
  const [preBidProvince, setPreBidProvince] = useState('Hà Nội');
  const [preBidDistrict, setPreBidDistrict] = useState('');
  const [preBidFee, setPreBidFee] = useState(null);
  const [preBidCustomDistrict, setPreBidCustomDistrict] = useState(false);

  // Tabs for detailed specs
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'payment' | 'shipping' | 'history'

  // Related products from the same category
  const [relatedProducts, setRelatedProducts] = useState([]);

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

  // Pre-bid Shipping Estimator API trigger
  useEffect(() => {
    const getPreBidShippingFee = async () => {
      if (!preBidProvince || !preBidDistrict) return;
      try {
        const res = await fetch(getApiUrl(`/api/shipping/estimate?productId=${id}&toProvinceId=${preBidProvince}&toDistrictId=${preBidDistrict}`), {
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setPreBidFee(data.shippingFee);
        }
      } catch (err) {
        console.error('Lỗi tính phí ship dự kiến:', err);
      }
    };

    if (preBidProvince && preBidDistrict) {
      getPreBidShippingFee();
    }
  }, [preBidProvince, preBidDistrict, id]);

  // Winner Checkout Shipping API trigger
  useEffect(() => {
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

    if (checkoutModalOpen && toProvince && toDistrict) {
      getShippingFeeEstimate();
    }
  }, [toProvince, toDistrict, checkoutModalOpen, id]);

  useEffect(() => {
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

    if (id && user) {
      checkWatchlistStatus();
    }
  }, [id, user]);

  // Fetch product data & related products
  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(getApiUrl(`/api/products/${id}`), {
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          setProduct(data.data);
          const nextBid = data.data.currentPrice + getStepPrice(data.data.currentPrice);
          setBidAmount(String(nextBid));

          // Fetch related products dynamically inside this category
          const categorySlug = data.data.category?.slug;
          if (categorySlug) {
            const relRes = await fetch(getApiUrl(`/api/products/search?limit=6&categorySlug=${categorySlug}`));
            const relData = await relRes.json();
            if (relData.success) {
              const filtered = relData.data.filter(p => p.id !== id).slice(0, 4);
              setRelatedProducts(filtered);
            }
          }

        } else {
          setError(data.error || 'Không thể tải thông tin sản phẩm.');
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin sản phẩm:", err);
        setError('Đã xảy ra lỗi kết nối với máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Realtime SSE bids listener
  useEffect(() => {
    if (!id) return;

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
  }, [id, refreshUser]);

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
      console.error("Lỗi thanh toán thầu:", err);
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
      console.error("Lỗi đặt giá thầu:", err);
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
          text: data.error || 'Mua thầu thất bại. Vui lòng thử lại.',
        });
      }
    } catch (err) {
      console.error("Lỗi mua đứt thầu:", err);
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
      <div className="min-h-screen bg-[#FDFBF7] dark:bg-zinc-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-600 dark:text-zinc-400 font-semibold animate-pulse text-xs tracking-wider">
            Đang tải thông tin sản phẩm đấu giá...
          </p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] dark:bg-zinc-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-200/50 dark:border-zinc-800">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Đã xảy ra lỗi</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error || 'Không tìm thấy sản phẩm yêu cầu.'}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-zinc-950 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const stepVal = getStepPrice(product.currentPrice);
  const goodBid = product.currentPrice + stepVal;
  const strongBid = product.currentPrice + stepVal * 3;
  const compBid = product.currentPrice + stepVal * 5;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors duration-500 font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.015] z-50 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]"></div>

      {/* Breadcrumbs Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between border-b border-zinc-200/40 dark:border-zinc-800/40 pb-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white text-xs font-bold transition-colors group"
          >
            <span className="transform group-hover:-translate-x-0.5 transition-transform inline-block">←</span>
            QUAY LẠI TRANG CHỦ
          </Link>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-wider font-semibold">
            LOT #{product.id.slice(0, 8).toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Main Container Split columns */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Product visual stage & specs tabs (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Image Container with concentric border layout */}
            <div className="rounded-[2.5rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/50 dark:border-zinc-800 p-2 shadow-sm relative">
              <div className="relative aspect-[4/3] w-full rounded-[calc(2rem-0.5rem)] overflow-hidden bg-white dark:bg-zinc-900 flex items-center justify-center p-8 border border-zinc-100 dark:border-zinc-800">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="max-h-full max-w-full object-contain rounded-2xl drop-shadow-xl transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-400 dark:text-zinc-650">
                    <span className="text-4xl">🖼️</span>
                    <span className="text-xs font-semibold">Chưa có hình ảnh sản phẩm</span>
                  </div>
                )}

                {/* Quick Save toggle inside image stage */}
                {user && (
                  <button
                    type="button"
                    onClick={toggleWatchlist}
                    disabled={watchlistLoading}
                    className="absolute top-4 right-4 p-3 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md rounded-full shadow-md border border-white/20 dark:border-zinc-800 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    title={inWatchlist ? "Xóa khỏi danh sách theo dõi" : "Lưu vào danh sách theo dõi"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill={inWatchlist ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className={`w-5 h-5 ${inWatchlist ? "text-rose-500" : "text-zinc-500 dark:text-zinc-400"}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Spec Details Tabs widget */}
            <div className="rounded-[2.5rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/50 dark:border-zinc-800 p-2 shadow-sm">
              <div className="bg-white dark:bg-zinc-900 rounded-[calc(2rem-0.5rem)] p-6 md:p-8 space-y-8">
                
                {/* Tabs selection buttons bar */}
                <div className="flex flex-wrap border-b border-zinc-200/40 dark:border-zinc-800/40 pb-2 gap-1">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'details'
                        ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-450 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    Chi tiết sản phẩm
                  </button>
                  <button
                    onClick={() => setActiveTab('payment')}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'payment'
                        ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-450 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    Thanh toán & Ký quỹ Escrow
                  </button>
                  <button
                    onClick={() => setActiveTab('shipping')}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'shipping'
                        ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-450 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    Ước tính vận chuyển
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'history'
                        ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-450 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    Lịch sử thầu ({product.bids?.length || 0})
                  </button>
                </div>

                {/* Tab content displays */}
                <div className="min-h-[220px]">
                  
                  {/* Tab Details */}
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Mô tả chi tiết</h4>
                        <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                          {product.description || 'Không có mô tả chi tiết cho sản phẩm.'}
                        </p>
                      </div>

                      {product.attributes?.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Thông số thuộc tính</h4>
                          <div className="overflow-hidden border border-zinc-200/40 dark:border-zinc-800/80 rounded-2xl">
                            <table className="w-full text-left text-xs border-collapse">
                              <tbody>
                                {product.attributes.map((attr, idx) => (
                                  <tr key={idx} className="border-b border-zinc-200/20 dark:border-zinc-800/40 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/10">
                                    <td className="py-3 px-4 font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-50/40 dark:bg-zinc-950/20 w-1/3">{attr.attributeKey?.name || attr.keyName}</td>
                                    <td className="py-3 px-4 text-zinc-850 dark:text-zinc-300 font-semibold">{attr.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab Payment Escrow */}
                  {activeTab === 'payment' && (
                    <div className="space-y-5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-2xl font-bold flex gap-3">
                        <span className="text-base">🤝</span>
                        <p>Aura Bid Escrow - Bảo vệ quyền lợi người mua & người bán tối đa.</p>
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-white mt-4">Điều khoản thầu cọc</h4>
                      <ul className="list-disc pl-4 space-y-2">
                        <li>Khi bạn đặt giá thầu, hệ thống sẽ <strong>tạm khóa 10% giá trị thầu</strong> trong ví ảo của bạn làm tiền đặt cọc.</li>
                        <li>Nếu bạn bị outbid (đối thủ trả giá cao hơn), số tiền cọc này sẽ lập tức được <strong>mở khóa trả lại 100%</strong> vào tài khoản khả dụng.</li>
                        <li>Nếu bạn thắng cuộc đấu giá, bạn có 72 giờ để thanh toán 90% số tiền còn lại cùng phí ship. Aura Bid giữ toàn bộ tiền thầu ký quỹ.</li>
                        <li>Tiền ký quỹ chỉ được giải ngân cho người bán sau khi người mua nhận được hàng đúng chất lượng mô tả và bấm nút xác nhận.</li>
                      </ul>
                    </div>
                  )}

                  {/* Tab Shipping estimation */}
                  {activeTab === 'shipping' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-white">Ước tính chi phí giao nhận</h4>
                        <p className="text-[10px] text-zinc-400">Chọn tỉnh/quận để tính toán trước phí ship dự tính cho kích thước lot này ({product.weight || 0.5} kg).</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-xs">
                          <label className="font-bold text-zinc-400">Tỉnh / Thành phố</label>
                          <select
                            value={preBidProvince}
                            onChange={(e) => {
                              setPreBidProvince(e.target.value);
                              setPreBidDistrict('');
                              setPreBidCustomDistrict(false);
                              setPreBidFee(null);
                            }}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs text-zinc-800 dark:text-white focus:outline-none"
                          >
                            {provinces.map((p) => (
                              <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <label className="font-bold text-zinc-400">Quận / Huyện</label>
                          {!preBidCustomDistrict && districtSuggestions[preBidProvince] ? (
                            <select
                              value={preBidDistrict}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setPreBidCustomDistrict(true);
                                  setPreBidDistrict('');
                                  setPreBidFee(null);
                                } else {
                                  setPreBidDistrict(e.target.value);
                                }
                              }}
                              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs text-zinc-800 dark:text-white focus:outline-none"
                            >
                              <option value="">-- Chọn quận/huyện --</option>
                              {districtSuggestions[preBidProvince].map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                              <option value="custom">Nhập tay</option>
                            </select>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Nhập quận/huyện"
                                value={preBidDistrict}
                                onChange={(e) => setPreBidDistrict(e.target.value)}
                                className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs text-zinc-800 dark:text-white focus:outline-none"
                              />
                              {districtSuggestions[preBidProvince] && (
                                <button
                                  type="button"
                                  onClick={() => { setPreBidCustomDistrict(false); setPreBidDistrict(''); }}
                                  className="px-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[9px] font-bold"
                                >
                                  Chọn lại
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {preBidFee !== null && (
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/40 rounded-xl flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-500">Phí giao hàng ước tính:</span>
                          <span className="font-black text-amber-700 dark:text-amber-400">{preBidFee.toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab Bids history */}
                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      {(!product.bids || product.bids.length === 0) ? (
                        <div className="text-center py-6 text-xs text-zinc-400">Chưa có nhà thầu nào trả giá cho lot này.</div>
                      ) : (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {product.bids.map((bid, idx) => (
                            <div key={bid.id} className="flex justify-between items-center text-xs p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-250/20 dark:border-zinc-800/40">
                              <div>
                                <p className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                  <span>User {bid.user?.email ? bid.user.email.split('@')[0] : 'Danh tính ẩn'}</span>
                                  {idx === 0 && <span className="px-2 py-0.5 rounded-full text-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">Cao nhất</span>}
                                </p>
                                <p className="text-[9px] text-zinc-400 mt-0.5">{new Date(bid.bidTime).toLocaleString('vi-VN')}</p>
                              </div>
                              <span className="font-bold text-amber-700 dark:text-amber-400">{Number(bid.bidAmount).toLocaleString('vi-VN')} đ</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Bidding slip panel (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            
            {/* Bidding Card double bezel nested style */}
            <div className="rounded-[2.5rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/50 dark:border-zinc-800 p-2 shadow-md">
              <div className="bg-white dark:bg-zinc-900 rounded-[calc(2rem-0.5rem)] p-6 md:p-8 space-y-6">
                
                {/* Lot info */}
                <div>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Lot #{product.id.slice(0, 6).toUpperCase()}</p>
                  <h2 className="text-xl md:text-2xl font-serif font-bold text-zinc-950 dark:text-white leading-snug mb-2">{product.title}</h2>
                  
                  {/* Valuation estimate range */}
                  <div className="flex gap-1.5 items-baseline text-xs text-zinc-400 font-semibold mb-4">
                    <span>Mức định giá ước tính:</span>
                    <span className="text-zinc-850 dark:text-zinc-200 font-bold">
                      {product.startPrice.toLocaleString('vi-VN')}đ - {(Number(product.startPrice) + getStepPrice(product.currentPrice) * 10).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                {/* Countdown display */}
                <div className="border-y border-zinc-200/40 dark:border-zinc-850 py-5">
                  <CountdownTimer endTime={product.endTime} />
                </div>

                {/* Status indicators */}
                <div className="flex justify-between items-center text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="text-zinc-500">2 nhà thầu đang theo dõi lot này</span>
                  </div>
                </div>

                {/* Action forms for bids */}
                <div className="space-y-4">
                  {message && (
                    <div className={`p-4 rounded-xl text-xs font-bold border ${
                      message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                        : 'bg-rose-50 text-rose-800 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  {/* Active wallet state */}
                  {user && !isEnded && (
                    <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/40 dark:border-zinc-800/80 px-4 py-3 rounded-xl text-xs font-semibold">
                      <span className="text-zinc-400">Ví khả dụng:</span>
                      <span className="text-zinc-850 dark:text-white font-black">{Number(user.balance).toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}

                  {isEnded ? (
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl text-xs space-y-4">
                      <p className="font-bold text-zinc-900 dark:text-white border-b border-zinc-200/50 dark:border-zinc-800 pb-2">
                        🏁 Trạng thái giao dịch Ký quỹ (Escrow)
                      </p>

                      {product.status === 'PENDING_PAYMENT' && (
                        <div className="space-y-3">
                          <p className="text-zinc-500 leading-relaxed font-medium">
                            {user?.id === product.winnerId
                              ? '🎉 Chúc mừng bạn đã thắng lot này! Vui lòng thanh toán 90% số tiền còn lại và điền địa chỉ giao nhận.'
                              : '⏳ Đang chờ người thắng cuộc hoàn tất thủ tục thanh toán ký quỹ còn lại.'}
                          </p>
                          {user?.id === product.winnerId && (
                            <button
                              onClick={() => {
                                setWinnerName(user.fullName || '');
                                setWinnerPhone(user.phoneNumber || '');
                                setWinnerAddress(user.address || '');
                                setCheckoutModalOpen(true);
                              }}
                              className="w-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 py-3 rounded-xl font-bold text-xs hover:bg-amber-600 dark:hover:bg-amber-400 hover:text-white transition-all cursor-pointer"
                            >
                              Thanh Toán 90% Còn Lại
                            </button>
                          )}
                        </div>
                      )}

                      {product.status === 'PAID' && (
                        <div className="space-y-3">
                          <p className="text-zinc-500 leading-relaxed font-medium">
                            {user?.id === product.sellerId
                              ? '📦 Người thắng cuộc đã thanh toán 100%. Vui lòng chuyển hàng cho đơn vị vận chuyển và xác nhận.'
                              : '🚚 Đã thanh toán thành công. Người bán đang chuẩn bị giao hàng cho hãng vận chuyển.'}
                          </p>
                          {user?.id === product.sellerId && (
                            <button
                              onClick={handleShipProduct}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs transition-all cursor-pointer"
                            >
                              Xác Nhận Đã Giao Hàng Cho Ship
                            </button>
                          )}
                        </div>
                      )}

                      {product.status === 'SHIPPED' && (
                        <div className="space-y-3">
                          <p className="text-zinc-500 leading-relaxed font-medium">
                            {user?.id === product.winnerId
                              ? '🚚 Đơn hàng đang được giao tới bạn. Xác nhận sau khi nhận sản phẩm đúng chất lượng mô tả.'
                              : '⏳ Hàng đang trên đường giao nhận. Giải ngân ký quỹ khi người mua bấm xác nhận hàng.'}
                          </p>
                          {user?.id === product.winnerId && (
                            <button
                              onClick={handleReceiveProduct}
                              className="w-full bg-amber-500 hover:bg-amber-650 text-white py-3 rounded-xl font-bold text-xs transition-all cursor-pointer"
                            >
                              Xác Nhận Đã Nhận Hàng Thành Công
                            </button>
                          )}
                        </div>
                      )}

                      {product.status === 'COMPLETED' && (
                        <div className="space-y-2">
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-center">
                            ✓ Giao dịch hoàn tất thành công!
                          </div>
                          <p className="text-zinc-400 leading-relaxed text-[10px]">
                            Tiền ký quỹ thầu đã giải ngân đầy đủ vào ví của người bán. Cảm ơn bạn đã tin dùng Aura Bid!
                          </p>
                        </div>
                      )}

                      {product.status === 'UNSOLD' && (
                        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-xl leading-relaxed text-center font-bold">
                          ⚠️ Phiên đấu giá kết thúc không thành công.
                        </div>
                      )}

                    </div>
                  ) : (
                    <>
                      {/* Bidding Slip Details pricing */}
                      <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl flex justify-between items-center">
                        <div>
                          <p className="text-[9px] font-bold text-zinc-450 uppercase tracking-widest">Giá hiện tại</p>
                          <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                            {product.currentPrice.toLocaleString('vi-VN')} đ
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-zinc-450 uppercase tracking-widest">Bước giá thầu</p>
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-1">
                            +{stepVal.toLocaleString('vi-VN')} đ
                          </p>
                        </div>
                      </div>

                      {/* Quick bid calculations buttons list (LiveAuctioneers style) */}
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Đặt giá thầu nhanh đề xuất</p>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setBidAmount(String(goodBid))}
                            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-400 bg-zinc-50/50 hover:bg-amber-500/5 dark:bg-zinc-950/20 text-center transition-all cursor-pointer"
                          >
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Khớp thầu</span>
                            <span className="block text-[10px] font-black text-zinc-900 dark:text-white mt-0.5">{goodBid.toLocaleString('vi-VN')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setBidAmount(String(strongBid))}
                            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-400 bg-zinc-50/50 hover:bg-amber-500/5 dark:bg-zinc-950/20 text-center transition-all cursor-pointer"
                          >
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Áp đảo</span>
                            <span className="block text-[10px] font-black text-zinc-900 dark:text-white mt-0.5">{strongBid.toLocaleString('vi-VN')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setBidAmount(String(compBid))}
                            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-400 bg-zinc-50/50 hover:bg-amber-500/5 dark:bg-zinc-950/20 text-center transition-all cursor-pointer"
                          >
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Quyết định</span>
                            <span className="block text-[10px] font-black text-zinc-900 dark:text-white mt-0.5">{compBid.toLocaleString('vi-VN')}</span>
                          </button>
                        </div>
                      </div>

                      {/* Auto Proxy Bid toggle switch pill */}
                      <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950/50 p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800 select-none">
                        <input
                          type="checkbox"
                          id="proxy-bid-toggle-detail"
                          checked={isProxyBid}
                          onChange={(e) => {
                            setIsProxyBid(e.target.checked);
                            setBidAmount(String(product.currentPrice + stepVal));
                          }}
                          className="h-4.5 w-4.5 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                        />
                        <label htmlFor="proxy-bid-toggle-detail" className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer flex flex-col">
                          <span>🤖 Kích hoạt Robot Đấu giá Tự động (Proxy Bid)</span>
                          <span className="text-[8px] font-medium text-zinc-400 mt-0.5">Tự động nâng giá thầu khi có người khác vượt giá.</span>
                        </label>
                      </div>

                      {/* Bidding Place bid form */}
                      <form onSubmit={handlePlaceBid} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider block">Nhập giá trị thầu (VND)</label>
                          <div className="relative rounded-xl shadow-sm">
                            <input
                              type="number"
                              required
                              min={product.currentPrice + stepVal}
                              disabled={isSubmitting || isEnded}
                              value={bidAmount}
                              onChange={(e) => setBidAmount(e.target.value)}
                              placeholder={isProxyBid ? "Mức giá tối đa sẵn sàng trả" : "Mức thầu trả cho lot này"}
                              className="w-full pl-4 pr-12 py-3 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-sm font-black rounded-xl border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 outline-none"
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[10px] text-zinc-400 font-bold">
                              VND
                            </div>
                          </div>

                          {bidAmount && !isNaN(Number(bidAmount)) && Number(bidAmount) > 0 && (
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 italic block mt-1">
                              ⚠️ Tạm khóa 10% ({Math.floor(Number(bidAmount) * 0.1).toLocaleString('vi-VN')} đ) trong ví làm cọc.
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button
                            type="submit"
                            disabled={isSubmitting || isEnded}
                            className="flex-1 py-3.5 px-6 rounded-xl font-bold text-xs text-white bg-zinc-950 dark:bg-white dark:text-zinc-950 shadow-md hover:bg-amber-600 dark:hover:bg-amber-400 dark:hover:text-zinc-950 transition-all cursor-pointer flex justify-center items-center gap-2"
                          >
                            {isSubmitting ? 'Đang gửi thầu...' : 'Đặt giá ngay'}
                          </button>

                          {product.buyNowPrice && (
                            <button
                              type="button"
                              onClick={handleBuyNow}
                              disabled={isSubmitting || isEnded}
                              className="flex-1 py-3.5 px-6 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600 shadow-md transition-all cursor-pointer"
                            >
                              ⚡ Mua đứt: {Number(product.buyNowPrice).toLocaleString('vi-VN')} đ
                            </button>
                          )}
                        </div>
                      </form>
                    </>
                  )}

                  {/* Guaranteed rules */}
                  <div className="border-t border-zinc-150 dark:border-zinc-800/80 pt-4 flex flex-col gap-2.5 text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>Chống cướp: Đấu thầu trong 30 giây cuối tự cộng thêm 2 phút.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>Bảo vệ: Cọc Escrow đóng băng tạm thời bảo đảm an toàn.</span>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Meet the Auction House seller card */}
            {product.seller && (
              <div className="rounded-[2.5rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/50 dark:border-zinc-800 p-2 shadow-md">
                <div className="bg-white dark:bg-zinc-900 rounded-[calc(2rem-0.5rem)] p-6 flex flex-col space-y-4 justify-between">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">ĐƠN VỊ ĐĂNG LOT NÀY</p>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-150 dark:border-zinc-700 flex items-center justify-center font-bold text-sm text-zinc-500 select-none">
                      {product.seller.email[0].toUpperCase()}
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        {product.seller.email.split('@')[0]}
                        {product.seller.isVerifiedSeller && (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">✓ Xác thực</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                        <span>★ Tỷ lệ uy tín: {Number(product.seller.reputationScore || 5.0).toFixed(1)}/5.0</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl">
                      <p className="text-sm font-black text-zinc-900 dark:text-white">5.0</p>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Xếp hạng</p>
                    </div>
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl">
                      <p className="text-sm font-black text-zinc-900 dark:text-white">{product.seller.soldCount || 1}</p>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Đã bán</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* More from this Catalog (Related products) */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 pt-16 border-t border-zinc-200/40 dark:border-zinc-800/40">
            <div className="flex justify-between items-end mb-10">
              <div>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-[0.2em] block mb-1">MỤC LIÊN QUAN</span>
                <h3 className="text-2xl font-serif font-bold text-zinc-950 dark:text-white">
                  Sản Phẩm Cùng Catalog
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relProd) => {
                const endsTime = new Date(relProd.endTime).getTime();
                const isUrgent = (endsTime - currentTime < 15 * 60 * 1000);

                return (
                  <div 
                    key={relProd.id} 
                    className="group rounded-[2rem] bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/50 dark:border-zinc-850 p-2 flex flex-col h-full bg-white dark:bg-zinc-900 shadow-sm transition-all duration-700 hover:scale-[1.02] hover:shadow-md"
                  >
                    <div className="relative aspect-square rounded-[calc(2rem-0.5rem)] bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 overflow-hidden mb-3 border border-zinc-100 dark:border-zinc-800">
                      {relProd.imageUrl ? (
                        <img 
                          src={relProd.imageUrl} 
                          alt={relProd.title} 
                          className="max-h-full max-w-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                        />
                      ) : (
                        <span className="text-2xl text-zinc-400">🖼️</span>
                      )}
                      
                      <div className={`absolute bottom-3 right-3 px-2 py-1 rounded-xl text-[8px] font-mono font-bold shadow-sm transition-colors ${
                        isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-zinc-950/80 text-white'
                      }`}>
                        ⏰ {getRemainingTimeText(relProd.endTime, relProd.status)}
                      </div>
                    </div>

                    <div className="px-3 pb-3 flex-grow flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-amber-700 transition-colors line-clamp-1 mb-1">
                          {relProd.title}
                        </h4>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mb-3">{relProd.category?.name || 'Sản phẩm cao cấp'}</p>
                      </div>

                      <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5">
                        <div>
                          <p className="text-[7px] font-bold text-zinc-400 uppercase tracking-wider">Giá thầu</p>
                          <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 mt-0.5">
                            {relProd.currentPrice.toLocaleString('vi-VN')} đ
                          </p>
                        </div>
                        <Link 
                          to={`/products/${relProd.id}`}
                          className="py-1.5 px-3.5 rounded-lg bg-zinc-950 hover:bg-amber-600 dark:bg-white dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-[9px] font-bold transition-all duration-300 cursor-pointer"
                        >
                          Xem Lot
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Winner Escrow Checkout Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/80 rounded-3xl p-6 shadow-2xl relative space-y-6 max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-lg font-bold cursor-pointer bg-transparent border-none"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">💳 Xác nhận đơn hàng & Ký quỹ an toàn</h3>
              <p className="text-[10px] text-neutral-450 leading-relaxed">
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
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none text-xs"
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
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none text-xs"
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

              {/* Final Escrow calculations details */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                <div className="flex justify-between font-medium">
                  <span className="text-neutral-500">Giá thầu thắng lot:</span>
                  <span className="text-neutral-850 dark:text-neutral-200 font-bold">{Number(product.currentPrice).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between font-medium text-[10px] text-zinc-400">
                  <span>Tiền cọc thầu đã đặt (10%):</span>
                  <span>- {Math.floor(Number(product.currentPrice) * 0.1).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between font-medium text-[10px] text-zinc-400 border-b border-neutral-200/50 pb-2">
                  <span>Phí ship vận chuyển ước tính:</span>
                  <span>{estShippingFee !== null ? `${estShippingFee.toLocaleString('vi-VN')} đ` : 'Đang tính toán...'}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1">
                  <span className="text-amber-850 dark:text-amber-400">Tổng thanh toán còn lại (90% + ship):</span>
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
                className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold py-3.5 rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 cursor-pointer text-center text-xs"
              >
                {checkoutSubmitting ? 'Đang xử lý thanh toán...' : 'Xác nhận thanh toán đơn hàng'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
