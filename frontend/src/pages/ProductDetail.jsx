import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getApiUrl, getSseUrl } from '../api';
import Badge from '../components/ui/Badge';
import CountdownBadge from '../components/ui/CountdownBadge';
import ProductCard from '../components/ProductCard';
import Modal from '../components/ui/Modal';
import ReviewModal from '../components/ReviewModal';

/* ── Helpers ─────────────────────────────────────────────── */
function getStepPrice(currentPrice) {
  const p = Number(currentPrice);
  if (p < 1_000_000) return 10_000;
  if (p < 5_000_000) return 50_000;
  return 100_000;
}

function fmtVND(v) {
  return Number(v ?? 0).toLocaleString('vi-VN') + ' đ';
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function mapProduct(p) {
  return {
    id: p.id,
    title: p.title,
    imageUrl: p.imageUrl || p.image_url,
    currentPrice: parseFloat(p.currentPrice ?? p.current_price ?? p.startPrice ?? 0),
    startPrice: parseFloat(p.startPrice ?? p.start_price ?? 0),
    buyNowPrice: p.buyNowPrice ?? p.buy_now_price ?? null,
    endTime: p.endTime ?? p.end_time,
    startTime: p.startTime ?? p.start_time,
    status: p.status,
    bidCount: p.bidCount ?? p.bid_count ?? p._count?.bids ?? 0,
    sellerName: p.seller?.name || p.seller?.email || null,
    categoryName: p.category?.name || null,
  };
}

/* ══════════════════════════════════════════════════════════ */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();

  const [product, setProduct]           = useState(null);
  const [bids, setBids]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [sseConnected, setSseConnected] = useState(true);

  // Trạng thái đấu giá
  const [bidAmount, setBidAmount]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage]           = useState(null);
  const [isAutoBid, setIsAutoBid]       = useState(false);

  // Danh sách theo dõi
  const [inWatchlist, setInWatchlist]       = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Thanh toán
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutForm, setCheckoutForm]   = useState({ name: '', phone: '', address: '', province: '', district: '', ward: '', carrier: 'GHN' });
  const [estShipping, setEstShipping]     = useState(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Danh sách địa giới hành chính động & báo giá vận chuyển
  const [provincesList, setProvincesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [wardsList, setWardsList] = useState([]);
  const [shippingEstimates, setShippingEstimates] = useState([]);

  // Modal khiếu nại
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeForm, setDisputeForm] = useState({ reason: 'Sản phẩm không đúng mô tả', description: '', videoUrl: '' });
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState('');

  // Trạng thái modal xác nhận hai lần
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '',
    amount: 0,
    deposit: 0,
    action: null
  });

  // Các trạng thái hồ sơ người bán
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerData, setSellerData] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Các tab giao diện (UI tabs)
  const [activeTab, setActiveTab]         = useState('details');
  const [lightboxOpen, setLightboxOpen]   = useState(false);

  // Các trạng thái chat đơn hàng
  const [chatMessages, setChatMessages]   = useState([]);
  const [chatInput, setChatInput]         = useState('');
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [chatError, setChatError]         = useState('');

  // Trạng thái hỏi đáp (Q&A)
  const [qnaMessages, setQnaMessages]     = useState([]);
  const [qnaInput, setqnaInput]           = useState('');
  const [qnaSubmitting, setqnaSubmitting] = useState(false);
  const [qnaError, setqnaError]           = useState('');

  const bidPanelRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Các hàm tiện ích hỗ trợ thay đổi địa giới hành chính động
  const handleProvinceChange = async (provName) => {
    setCheckoutForm(prev => ({ ...prev, province: provName, district: '', ward: '' }));
    setDistrictsList([]);
    setWardsList([]);
    setShippingEstimates([]);
    setEstShipping(null);
    if (!provName) return;

    const provObj = provincesList.find(p => p.name === provName);
    if (provObj) {
      try {
        const res = await fetch(getApiUrl(`/api/shipping/districts?provinceId=${provObj.id}`));
        const data = await res.json();
        if (data.success && data.data) {
          setDistrictsList(data.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải quận huyện:', err);
      }
    }
  };

  const handleDistrictChange = async (distName) => {
    setCheckoutForm(prev => ({ ...prev, district: distName, ward: '' }));
    setWardsList([]);
    setShippingEstimates([]);
    setEstShipping(null);
    if (!distName) return;

    const provObj = provincesList.find(p => p.name === checkoutForm.province);
    if (provObj) {
      const districts = districtsList.length > 0 ? districtsList : await (async () => {
        const res = await fetch(getApiUrl(`/api/shipping/districts?provinceId=${provObj.id}`));
        const data = await res.json();
        return data.success ? data.data : [];
      })();
      
      const distObj = districts.find(d => d.name === distName);
      if (distObj) {
        try {
          const res = await fetch(getApiUrl(`/api/shipping/wards?districtId=${distObj.id}`));
          const data = await res.json();
          if (data.success && data.data) {
            setWardsList(data.data);
          }
        } catch (err) {
          console.error('Lỗi khi tải phường xã:', err);
        }
      }
    }
  };

  // Nạp danh sách tỉnh thành khi mở checkout
  useEffect(() => {
    if (checkoutModalOpen) {
      const fetchProvinces = async () => {
        try {
          const res = await fetch(getApiUrl('/api/shipping/provinces'));
          const data = await res.json();
          if (data.success && data.data) {
            setProvincesList(data.data);
          }
        } catch (err) {
          console.error('Lỗi khi tải tỉnh thành:', err);
        }
      };
      fetchProvinces();
    }
  }, [checkoutModalOpen]);

  /* ── Fetch product + bids ── */
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    async function loadAll() {
      try {
        const [prodRes, bidsRes] = await Promise.all([
          fetch(getApiUrl(`/api/products/${id}`), { credentials: 'include' }),
          fetch(getApiUrl(`/api/products/${id}/bids`), { credentials: 'include' }).catch(() => null),
        ]);

        const prodData = await prodRes.json();
        if (!prodData.success) { setError(prodData.error || 'Product not found.'); return; }

        const p = prodData.data;
        setProduct(p);
        setBidAmount(String(Number(p.currentPrice) + getStepPrice(p.currentPrice)));

        // Các lượt đấu giá
        if (bidsRes) {
          const bd = await bidsRes.json().catch(() => ({}));
          if (bd.success) setBids(bd.data || []);
        }

        // Sản phẩm liên quan
        if (p.category?.slug) {
          const relRes = await fetch(getApiUrl(`/api/products/search?limit=5&categorySlug=${p.category.slug}`));
          const relData = await relRes.json().catch(() => ({}));
          if (relData.success)
            setRelatedProducts(relData.data.filter(rp => rp.id !== id).slice(0, 4).map(mapProduct));
        }
      } catch {
        setError('Unable to connect to server.');
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [id]);

  /* ── Watchlist status ── */
  useEffect(() => {
    if (!user || !id) return;
    fetch(getApiUrl('/api/watchlist'), { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setInWatchlist(d.data.some(p => p.id === id)); })
      .catch(() => {});
  }, [id, user]);

  /* ── SSE realtime ── */
  useEffect(() => {
    if (!id) return;
    let es;
    let timer;
    let active = true;

    function connect() {
      if (!active) return;
      es = new EventSource(getSseUrl(id), { withCredentials: true });

      es.onopen = () => {
        if (active) setSseConnected(true);
      };

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.chatMessage) {
            setChatMessages(prev => {
              if (prev.some(m => m.id === data.chatMessage.id)) return prev;
              return [...prev, data.chatMessage];
            });
            return;
          }
          if (data.qnaMessage) {
            setQnaMessages(prev => {
              if (prev.some(m => m.id === data.qnaMessage.id)) return prev;
              return [...prev, data.qnaMessage];
            });
            return;
          }
          setProduct(prev => {
            if (!prev) return null;
            const newPrice = Number(data.currentPrice);
            const nextBid = newPrice + getStepPrice(newPrice);
            setBidAmount(curr => {
              const val = parseFloat(curr);
              if (isNaN(val) || val <= newPrice) return String(nextBid);
              return curr;
            });
            return { ...prev, currentPrice: newPrice, endTime: data.endTime, ...(data.status ? { status: data.status } : {}) };
          });
          if (data.bid) setBids(prev => [data.bid, ...prev.slice(0, 19)]);
          refreshUser();
        } catch {}
      };

      es.onerror = () => {
        if (active) {
          setSseConnected(false);
          es.close();
          timer = setTimeout(connect, 4000);
        }
      };
    }

    connect();

    return () => {
      active = false;
      if (es) es.close();
      clearTimeout(timer);
    };
  }, [id, refreshUser]);

  // Lấy lịch sử chat cho đơn hàng đã thắng/đã bán
  useEffect(() => {
    if (!id || !user || !product) return;
    const isWinner = user.id === product.winnerId;
    const isSeller = user.id === product.sellerId;
    const isOrderState = ['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'COMPLETED', 'DISPUTED'].includes(product.status);

    if (!isWinner && !isSeller || !isOrderState) return;

    async function loadChat() {
      try {
        const res = await fetch(getApiUrl(`/api/orders/${id}/messages`), { credentials: 'include' });
        const d = await res.json();
        if (d.success) {
          setChatMessages(d.data || []);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    }
    loadChat();
  }, [id, user, product?.status, product?.winnerId, product?.sellerId]);

  // Lấy lịch sử Q&A
  useEffect(() => {
    if (!id) return;
    async function loadQna() {
      try {
        const res = await fetch(getApiUrl(`/api/products/${id}/qna`), { credentials: 'include' });
        const d = await res.json();
        if (d.success) {
          setQnaMessages(d.data || []);
        }
      } catch (err) {
        console.error('Failed to load Q&A history:', err);
      }
    }
    loadQna();
  }, [id]);

  // Cuộn xuống dưới cùng khi có tin nhắn mới hoặc tab chuyển sang chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab]);

  /* ── Checkout shipping estimate ── */
  useEffect(() => {
    if (!checkoutModalOpen || !checkoutForm.province || !checkoutForm.district) return;
    const wardParam = checkoutForm.ward ? `&toWardId=${checkoutForm.ward}` : '';
    const carrierParam = checkoutForm.carrier ? `&carrier=${checkoutForm.carrier}` : '';
    fetch(getApiUrl(`/api/shipping/estimate?productId=${id}&toProvinceId=${checkoutForm.province}&toDistrictId=${checkoutForm.district}${wardParam}${carrierParam}`), { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.estimates) {
          setShippingEstimates(d.estimates);
          const match = d.estimates.find(e => e.carrier === checkoutForm.carrier);
          if (match) {
            setEstShipping(match.fee);
          } else if (d.estimates.length > 0) {
            setCheckoutForm(prev => ({ ...prev, carrier: d.estimates[0].carrier }));
            setEstShipping(d.estimates[0].fee);
          }
        }
      })
      .catch(() => {});
  }, [checkoutForm.province, checkoutForm.district, checkoutForm.ward, checkoutForm.carrier, checkoutModalOpen, id]);

  /* ── Handlers ── */
  const openSellerProfile = async () => {
    if (!product || !product.sellerId) return;
    setSellerModalOpen(true);
    setSellerLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/users/${product.sellerId}`));
      const data = await res.json();
      if (data.success) {
        setSellerData(data.data);
      } else {
        setSellerData(null);
      }
    } catch {
      setSellerData(null);
    } finally {
      setSellerLoading(false);
    }
  };

  const handleReviewSuccess = () => {
    openSellerProfile();
    fetch(getApiUrl(`/api/products/${id}`), { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) setProduct(d.data);
      });
  };

  const toggleWatchlist = async () => {
    if (!user) { navigate('/login'); return; }
    setWatchlistLoading(true);
    try {
      const method = inWatchlist ? 'DELETE' : 'POST';
      const endpoint = inWatchlist ? `/api/watchlist/${id}` : '/api/watchlist';
      const body = inWatchlist ? undefined : JSON.stringify({ productId: id });
      const res = await fetch(getApiUrl(endpoint), {
        method, headers: { 'Content-Type': 'application/json' }, body, credentials: 'include',
      });
      const d = await res.json();
      if (d.success) setInWatchlist(!inWatchlist);
    } finally { setWatchlistLoading(false); }
  };

  const executePlaceBid = async (amount) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(getApiUrl('/api/bids/place'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: id, ...(isAutoBid ? { maxAutoBidAmount: amount } : { bidAmount: amount }) }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: isAutoBid ? `Auto-bid set to ${fmtVND(amount)}` : `Bid placed: ${fmtVND(amount)}` });
        setProduct(prev => prev ? { ...prev, currentPrice: Number(data.data.currentPrice), endTime: data.data.endTime } : null);
        setBidAmount(String(Number(data.data.currentPrice) + getStepPrice(data.data.currentPrice)));
        refreshUser();
      } else {
        setMessage({ type: 'error', text: data.error || 'Bid failed. Please try again.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Server connection error.' });
    } finally {
      setIsSubmitting(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handlePlaceBid = (e) => {
    e.preventDefault();
    if (!product) return;
    const amount = parseFloat(bidAmount);
    const minAmount = Number(product.currentPrice) + getStepPrice(product.currentPrice);
    if (isNaN(amount) || amount < minAmount) {
      setMessage({ type: 'error', text: `Minimum bid is ${fmtVND(minAmount)}` });
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'bid',
      amount: amount,
      deposit: amount * 0.1,
      action: () => executePlaceBid(amount)
    });
  };

  const executeBuyNow = async (amount) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(getApiUrl('/api/bids/buy-now'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Chúc mừng! Bạn đã mua đứt sản phẩm với giá ${fmtVND(amount)}.` });
        setProduct(prev => prev ? {
          ...prev,
          currentPrice: Number(data.data.currentPrice),
          status: data.data.status,
          endTime: data.data.endTime,
          winnerId: user.id
        } : null);
        refreshUser();
      } else {
        setMessage({ type: 'error', text: data.error || 'Mua đứt thất bại. Vui lòng thử lại.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setIsSubmitting(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleBuyNowClick = () => {
    if (!user) { navigate('/login'); return; }
    if (!product || !product.buyNowPrice) return;
    const amount = Number(product.buyNowPrice);
    setConfirmModal({
      isOpen: true,
      type: 'buyNow',
      amount: amount,
      deposit: amount * 0.1,
      action: () => executeBuyNow(amount)
    });
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setCheckoutError('');
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address || !checkoutForm.province || !checkoutForm.district || !checkoutForm.ward) {
      setCheckoutError('Vui lòng điền đầy đủ thông tin giao hàng bao gồm cả Phường/Xã.');
      return;
    }
    setCheckoutSubmitting(true);
    try {
      const res = await fetch(getApiUrl(`/api/orders/${id}/checkout`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerName: checkoutForm.name, winnerPhone: checkoutForm.phone,
          winnerAddress: checkoutForm.address, toProvinceId: checkoutForm.province, toDistrictId: checkoutForm.district,
          toWardId: checkoutForm.ward, shippingCarrier: checkoutForm.carrier
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setCheckoutModalOpen(false);
        setProduct(prev => prev ? { ...prev, status: 'PAID' } : null);
        refreshUser();
      } else { setCheckoutError(data.error || 'Checkout failed.'); }
    } catch { setCheckoutError('Server error.'); }
    finally { setCheckoutSubmitting(false); }
  };

  const handleDisputeSubmit = async (e) => {
    e.preventDefault();
    setDisputeError('');
    if (!disputeForm.description) {
      setDisputeError('Vui lòng nhập mô tả chi tiết khiếu nại.');
      return;
    }
    setDisputeSubmitting(true);
    try {
      const res = await fetch(getApiUrl('/api/disputes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: id,
          reason: disputeForm.reason,
          description: disputeForm.description,
          unboxingVideoUrl: disputeForm.videoUrl || null
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDisputeModalOpen(false);
        setProduct(prev => prev ? { ...prev, status: 'DISPUTED' } : null);
        refreshUser();
        navigate(`/disputes/${data.data.id}`);
      } else {
        setDisputeError(data.error || 'Tạo khiếu nại thất bại.');
      }
    } catch (err) {
      setDisputeError('Lỗi kết nối máy chủ.');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const handleShip = async () => {
    if (!window.confirm('Confirm you have handed item to the carrier?')) return;
    const res = await fetch(getApiUrl(`/api/orders/${id}/ship`), { method: 'POST', credentials: 'include' });
    const d = await res.json();
    if (d.success) setProduct(prev => prev ? { ...prev, status: 'SHIPPED' } : null);
    else alert(d.error || 'Failed to confirm shipment.');
  };

  const handleReceive = async () => {
    if (!window.confirm('Confirm you received the item as described? Funds will be released to seller.')) return;
    const res = await fetch(getApiUrl(`/api/orders/${id}/receive`), { method: 'POST', credentials: 'include' });
    const d = await res.json();
    if (d.success) { setProduct(prev => prev ? { ...prev, status: 'COMPLETED' } : null); refreshUser(); }
    else alert(d.error || 'Failed to confirm receipt.');
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatSubmitting) return;

    setChatSubmitting(true);
    setChatError('');
    try {
      const res = await fetch(getApiUrl(`/api/orders/${id}/messages`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput.trim() }),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success && d.data) {
        setChatInput('');
        setChatMessages(prev => {
          if (prev.some(m => m.id === d.data.id)) return prev;
          return [...prev, d.data];
        });
      } else {
        setChatError(d.error || 'Gửi tin nhắn thất bại.');
      }
    } catch {
      setChatError('Lỗi kết nối máy chủ.');
    } finally {
      setChatSubmitting(false);
    }
  };

  const handleSendQnaMessage = async (e) => {
    e.preventDefault();
    if (!qnaInput.trim() || qnaSubmitting) return;

    setqnaSubmitting(true);
    setqnaError('');
    try {
      const res = await fetch(getApiUrl(`/api/products/${id}/qna`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: qnaInput.trim() }),
        credentials: 'include'
      });
      const d = await res.json();
      if (d.success && d.data) {
        setqnaInput('');
        setQnaMessages(prev => {
          if (prev.some(m => m.id === d.data.id)) return prev;
          return [...prev, d.data];
        });
      } else {
        setqnaError(d.error || 'Gửi câu hỏi thất bại.');
      }
    } catch {
      setqnaError('Lỗi kết nối máy chủ.');
    } finally {
      setqnaSubmitting(false);
    }
  };

  /* ── Derived state ── */
  if (loading) return <DetailSkeleton />;
  if (error || !product) return <DetailError error={error} />;

  const isEnded = ['ENDED', 'COMPLETED', 'PAID', 'SHIPPED', 'CANCELLED', 'UNSOLD', 'PENDING_PAYMENT', 'DISPUTED'].includes(product.status)
    || new Date(product.endTime).getTime() <= Date.now();
  const isActive = !isEnded && product.status === 'ACTIVE' && (!product.startTime || new Date(product.startTime).getTime() <= Date.now());
  const isUpcoming = !isEnded && !isActive && new Date(product.startTime).getTime() > Date.now();
  const isSeller = user?.id === product.sellerId;
  const isWinner = user?.id === product.winnerId;
  const minNextBid = Number(product.currentPrice) + getStepPrice(product.currentPrice);

  const badgeVariant = isEnded ? 'ended' : isActive ? 'live' : isUpcoming ? 'upcoming' : 'ended';
  const attributes = product.attributes || product.productAttributes || [];

  return (
    <div style={{ background: 'var(--page-bg)', minHeight: '100vh' }}>

      {/* ── Breadcrumb ── */}
      <div style={{ background: 'var(--page-card-bg)', borderBottom: '1px solid var(--page-border)', padding: '8px 0' }}>
        <div className="page-container">
          <nav style={{ fontSize: 12, color: 'var(--page-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link to="/" style={{ color: 'hsl(196,100%,36%)', textDecoration: 'none' }}>Home</Link>
            <span>›</span>
            {product.category && (
              <>
                <Link to={`/?category=${product.category.slug}`} style={{ color: 'hsl(196,100%,36%)', textDecoration: 'none' }}>
                  {product.category.name}
                </Link>
                <span>›</span>
              </>
            )}
            <span style={{ color: 'var(--page-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
              {product.title}
            </span>
          </nav>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="page-container py-6">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── LEFT: Image + Details ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">

            {/* Image Gallery */}
            <div style={{ background: 'var(--page-card-bg)', border: '1px solid var(--page-border)', borderRadius: 4, overflow: 'hidden' }}>
              {/* Main image */}
              <div
                style={{ position: 'relative', background: 'var(--page-bg)', cursor: product.imageUrl ? 'zoom-in' : 'default', paddingBottom: '75%' }}
                onClick={() => product.imageUrl && setLightboxOpen(true)}
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    style={{ position: 'absolute', inset: 0, margin: 'auto', maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(0,0%,75%)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48" stroke="currentColor" className="w-16 h-16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 32l10-12 8 9 6-7 10 10" />
                    </svg>
                  </div>
                )}
                {/* Badge overlay */}
                <div style={{ position: 'absolute', top: 12, left: 12 }}>
                  <Badge variant={badgeVariant} />
                </div>
                {/* Zoom hint */}
                {product.imageUrl && (
                  <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'hsla(0,0%,0%,0.4)', color: 'white', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                    Click to zoom
                  </div>
                )}
              </div>
            </div>

            {/* ── Details Tabs ── */}
            <div style={{ background: 'var(--page-card-bg)', border: '1px solid var(--page-border)', borderRadius: 4 }}>
              {/* Tab header */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--page-border)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {(() => {
                  const tabsList = [
                     { key: 'details', label: 'Description' },
                     { key: 'attributes', label: 'Details' },
                     { key: 'shipping', label: 'Shipping' },
                     { key: 'history', label: `Bids (${bids.length})` },
                  ];
                  if (['ACTIVE', 'DRAFT'].includes(product.status)) {
                    tabsList.push({ key: 'qna', label: `❓ Hỏi đáp (${qnaMessages.length})` });
                  }
                  const isOrderState = ['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'COMPLETED', 'DISPUTED'].includes(product.status);
                  if ((isWinner || isSeller) && isOrderState) {
                    tabsList.push({ key: 'chat', label: `💬 Trò chuyện (${chatMessages.length})` });
                  }
                  return tabsList.map(t => (
                    <button
                      key={t.key}
                      id={`detail-tab-${t.key}`}
                      onClick={() => setActiveTab(t.key)}
                      style={{
                        padding: '12px 16px', fontSize: 13, fontWeight: 600,
                        fontFamily: 'var(--font-display)', cursor: 'pointer',
                        background: 'none', border: 'none',
                        borderBottom: activeTab === t.key ? '2px solid hsl(196,100%,36%)' : '2px solid transparent',
                        color: activeTab === t.key ? 'hsl(196,100%,36%)' : 'var(--page-text-muted)',
                        marginBottom: -1, transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                    >
                      {t.label}
                    </button>
                  ));
                })()}
              </div>

              <div style={{ padding: '16px 20px' }}>
                {/* Description */}
                {activeTab === 'details' && (
                  <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--page-text)', marginBottom: 12 }}>
                      {product.title}
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--page-text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                      {product.description || 'No description provided.'}
                    </p>
                  </div>
                )}

                {/* Attributes */}
                {activeTab === 'attributes' && (
                  <div>
                    {attributes.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--page-text-muted)' }}>No additional attributes listed.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <tbody>
                          {attributes.map((attr, i) => (
                            <tr key={attr.id ?? i} style={{ borderBottom: '1px solid var(--page-border)' }}>
                              <td style={{ padding: '8px 0', color: 'var(--page-text-muted)', fontWeight: 600, width: '40%' }}>
                                {attr.attributeKey?.name || attr.key || '—'}
                              </td>
                              <td style={{ padding: '8px 0', color: 'var(--page-text)' }}>{attr.value || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {/* Item dimensions */}
                    <div style={{ marginTop: 16, fontSize: 12, color: 'var(--page-text-muted)' }}>
                      <strong>Dimensions:</strong> {product.length} × {product.width} × {product.height} cm &nbsp;|&nbsp;
                      <strong>Weight:</strong> {product.weight} kg
                    </div>
                  </div>
                )}

                {/* Shipping info */}
                {activeTab === 'shipping' && (
                  <div style={{ fontSize: 13, color: 'var(--page-text-muted)', lineHeight: 1.8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--page-text)', marginBottom: 4 }}>Seller Location</div>
                        <div>{product.seller?.shopAddress || product.seller?.name || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--page-text)', marginBottom: 4 }}>Package</div>
                        <div>{product.weight}kg · {product.length}×{product.width}×{product.height}cm</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, padding: 12, background: theme === 'dark' ? 'rgba(0,151,186,0.1)' : 'hsl(196,100%,97%)', border: '1px solid var(--page-border)', borderRadius: 4, fontSize: 12 }}>
                      🛡️ All shipments are covered by AuraBid Escrow. Payment is only released to the seller after you confirm receipt.
                    </div>
                  </div>
                )}

                {/* Bid history */}
                {activeTab === 'history' && (
                  <div>
                    {bids.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--page-text-muted)', textAlign: 'center', padding: '24px 0' }}>
                        No bids placed yet. Be the first to bid!
                      </p>
                    ) : (
                      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid var(--page-border)' }}>
                              <th style={{ textAlign: 'left', padding: '6px 0', color: 'var(--page-text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Bidder</th>
                              <th style={{ textAlign: 'right', padding: '6px 0', color: 'var(--page-text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Amount</th>
                              <th style={{ textAlign: 'right', padding: '6px 0', color: 'var(--page-text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bids.map((bid, i) => (
                              <tr key={bid.id ?? i} style={{ borderBottom: '1px solid var(--page-border)' }}>
                                <td style={{ padding: '8px 0', color: 'var(--page-text)' }}>
                                  {bid.user?.email ? `${bid.user.email.slice(0, 3)}****` : 'Anonymous'}
                                  {i === 0 && <span style={{ marginLeft: 6, background: 'hsl(196,100%,36%)', color: 'white', fontSize: 9, padding: '1px 5px', borderRadius: 2, fontWeight: 700 }}>HIGH</span>}
                                </td>
                                <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 700, fontFamily: 'var(--font-display)', color: i === 0 ? 'hsl(196,100%,36%)' : 'var(--page-text)' }}>
                                  {fmtVND(bid.bidAmount ?? bid.bid_amount)}
                                </td>
                                <td style={{ textAlign: 'right', padding: '8px 0', color: 'var(--page-text-muted)' }}>
                                  {fmtDate(bid.bidTime ?? bid.bid_time)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat Room */}
                {activeTab === 'chat' && (
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--page-text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>💬</span> Trò chuyện trao đổi đơn hàng
                    </h3>
                    <p style={{ fontSize: 11, color: 'var(--page-text-muted)', marginBottom: 16 }}>
                      Kênh trao đổi trực tiếp giữa Người bán và Người mua về việc nhận hàng và thanh toán.
                    </p>

                    {/* Messages Container */}
                    <div 
                      ref={chatContainerRef}
                      style={{ 
                        border: '1px solid var(--page-border)', 
                        borderRadius: 8, 
                        background: 'var(--page-bg)', 
                        height: 350, 
                        overflowY: 'auto', 
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        marginBottom: 14
                      }}
                    >
                      {chatMessages.length === 0 ? (
                        <div style={{ margin: 'auto', fontSize: 12, color: 'var(--page-text-muted)', textAlign: 'center' }}>
                          Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
                        </div>
                      ) : (
                        chatMessages.map(msg => {
                          const isMe = msg.senderId === user?.id;
                          return (
                            <div 
                              key={msg.id} 
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '75%'
                              }}
                            >
                              <div style={{ 
                                fontSize: 10, 
                                color: 'var(--page-text-muted)', 
                                marginBottom: 2, 
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                fontWeight: 650
                              }}>
                                {isMe ? 'Bạn' : (msg.sender?.name || msg.sender?.email || 'Đối tác')}
                              </div>
                              <div style={{ 
                                padding: '10px 14px', 
                                borderRadius: 12, 
                                borderTopRightRadius: isMe ? 2 : 12,
                                borderTopLeftRadius: isMe ? 12 : 2,
                                background: isMe ? 'hsl(196,100%,36%)' : 'var(--page-card-bg)', 
                                color: isMe ? 'white' : 'var(--page-text)',
                                border: isMe ? 'none' : '1px solid var(--page-border)',
                                fontSize: 12.5,
                                lineHeight: 1.5,
                                wordBreak: 'break-word',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}>
                                {msg.message}
                              </div>
                              <div style={{ 
                                fontSize: 9, 
                                color: 'var(--page-text-muted)', 
                                marginTop: 2, 
                                alignSelf: isMe ? 'flex-end' : 'flex-start' 
                              }}>
                                {fmtDate(msg.createdAt)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Chat Input / Locked warning */}
                    {['COMPLETED', 'CANCELLED', 'UNSOLD'].includes(product.status) ? (
                      <div style={{ 
                        padding: '12px 16px', 
                        background: 'var(--page-bg)', 
                        color: 'var(--page-text-muted)', 
                        borderRadius: 8, 
                        border: '1px solid var(--page-border)',
                        fontSize: 12, 
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        🔒 Giao dịch đã hoàn tất hoặc bị hủy. Khung chat đã khóa (chế độ chỉ đọc).
                      </div>
                    ) : (
                      <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Nhập tin nhắn trao đổi..."
                            style={{ 
                              width: '100%', 
                              padding: '10px 12px', 
                              border: '2px solid var(--page-border)', 
                              borderRadius: 6, 
                              fontSize: 12.5,
                              outline: 'none',
                              background: 'var(--page-card-bg)',
                              color: 'var(--page-text)'
                            }}
                            disabled={chatSubmitting}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={chatSubmitting || !chatInput.trim()}
                          style={{
                            background: 'hsl(196,100%,36%)',
                            color: 'white',
                            border: 'none',
                            padding: '0 20px',
                            borderRadius: 6,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            opacity: (chatSubmitting || !chatInput.trim()) ? 0.6 : 1,
                            transition: 'all 0.15s'
                          }}
                        >
                          {chatSubmitting ? 'Đang gửi...' : 'Gửi'}
                        </button>
                      </form>
                    )}
                    {chatError && (
                      <div style={{ fontSize: 11, color: theme === 'dark' ? 'hsl(3,83%,75%)' : 'hsl(3,83%,40%)', marginTop: 6, fontWeight: 650 }}>
                        ⚠️ {chatError}
                      </div>
                    )}
                  </div>
                )}

                {/* Q&A / Hỏi đáp */}
                {activeTab === 'qna' && (
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--page-text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>❓</span> Hỏi đáp về sản phẩm
                    </h3>
                    <p style={{ fontSize: 11, color: 'var(--page-text-muted)', marginBottom: 16 }}>
                      Người mua có thể đặt câu hỏi trực tiếp cho Người bán về tình trạng và thông tin sản phẩm.
                    </p>

                    {/* Messages Container */}
                    <div 
                      style={{ 
                        border: '1px solid var(--page-border)', 
                        borderRadius: 8, 
                        background: 'var(--page-bg)', 
                        height: 350, 
                        overflowY: 'auto', 
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        marginBottom: 14
                      }}
                    >
                      {qnaMessages.length === 0 ? (
                        <div style={{ margin: 'auto', fontSize: 12, color: 'var(--page-text-muted)', textAlign: 'center' }}>
                          Chưa có câu hỏi nào. Hãy đặt câu hỏi đầu tiên!
                        </div>
                      ) : (
                        qnaMessages.map(msg => {
                          const isMsgSeller = msg.senderId === product.sellerId;
                          const isMe = msg.senderId === user?.id;
                          return (
                            <div 
                              key={msg.id} 
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '75%'
                              }}
                            >
                              <div style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 10, 
                                color: 'var(--page-text-muted)', 
                                marginBottom: 2, 
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                fontWeight: 650
                              }}>
                                <span>{isMe ? 'Bạn' : (msg.sender?.name || msg.sender?.email || 'Người dùng')}</span>
                                {isMsgSeller && (
                                  <span style={{ 
                                    background: 'hsl(35, 95%, 45%)', 
                                    color: 'white', 
                                    fontSize: 8, 
                                    padding: '1px 5px', 
                                    borderRadius: 4, 
                                    fontWeight: 700 
                                  }}>
                                    Người bán
                                  </span>
                                )}
                              </div>
                              <div style={{ 
                                padding: '10px 14px', 
                                borderRadius: 12, 
                                borderTopRightRadius: isMe ? 2 : 12,
                                borderTopLeftRadius: isMe ? 12 : 2,
                                background: isMe ? 'hsl(196,100%,36%)' : isMsgSeller ? (theme === 'dark' ? 'rgba(217,119,6,0.15)' : 'hsl(35, 90%, 95%)') : 'var(--page-card-bg)', 
                                color: isMe ? 'white' : 'var(--page-text)',
                                border: isMe ? 'none' : isMsgSeller ? (theme === 'dark' ? '1px solid rgba(217,119,6,0.3)' : '1px solid hsl(35, 90%, 85%)') : '1px solid var(--page-border)',
                                fontSize: 12.5,
                                lineHeight: 1.5,
                                wordBreak: 'break-word',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}>
                                {msg.message}
                              </div>
                              <div style={{ 
                                fontSize: 9, 
                                color: 'var(--page-text-muted)', 
                                marginTop: 2, 
                                alignSelf: isMe ? 'flex-end' : 'flex-start' 
                              }}>
                                {fmtDate(msg.createdAt)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Q&A Input or Login prompt */}
                    {!user ? (
                      <div style={{ 
                        padding: '16px', 
                        background: theme === 'dark' ? 'rgba(0,151,186,0.15)' : 'hsl(196,100%,97%)', 
                        borderRadius: 8, 
                        border: theme === 'dark' ? '1px solid rgba(0,151,186,0.3)' : '1px solid hsl(196,100%,90%)',
                        textAlign: 'center'
                      }}>
                        <p style={{ fontSize: 12, color: theme === 'dark' ? 'hsl(196,100%,75%)' : 'hsl(196,100%,25%)', marginBottom: 10, fontWeight: 600 }}>
                          Bạn cần đăng nhập để đặt câu hỏi hoặc trả lời.
                        </p>
                        <Link
                          to="/login"
                          style={{
                            display: 'inline-block',
                            background: 'hsl(196,100%,36%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Đăng nhập ngay
                        </Link>
                      </div>
                    ) : (
                      <form onSubmit={handleSendQnaMessage} style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input
                            type="text"
                            value={qnaInput}
                            onChange={e => setqnaInput(e.target.value)}
                            placeholder="Nhập câu hỏi của bạn hoặc trả lời..."
                            style={{ 
                              width: '100%', 
                              padding: '10px 12px', 
                              border: '2px solid var(--page-border)', 
                              borderRadius: 6, 
                              fontSize: 12.5,
                              outline: 'none',
                              background: 'var(--page-card-bg)',
                              color: 'var(--page-text)'
                            }}
                            disabled={qnaSubmitting}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={qnaSubmitting || !qnaInput.trim()}
                          style={{
                            background: 'hsl(196,100%,36%)',
                            color: 'white',
                            border: 'none',
                            padding: '0 20px',
                            borderRadius: 6,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            opacity: (qnaSubmitting || !qnaInput.trim()) ? 0.6 : 1,
                            transition: 'all 0.15s'
                          }}
                        >
                          {qnaSubmitting ? 'Đang gửi...' : 'Gửi'}
                        </button>
                      </form>
                    )}
                    {qnaError && (
                      <div style={{ fontSize: 11, color: theme === 'dark' ? 'hsl(3,83%,75%)' : 'hsl(3,83%,40%)', marginTop: 6, fontWeight: 650 }}>
                        ⚠️ {qnaError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Related Items ── */}
            {relatedProducts.length > 0 && (
              <div>
                <h2 className="section-title">You May Also Like</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Sticky Bid Panel ── */}
          <div
            ref={bidPanelRef}
            style={{ width: '100%', maxWidth: 360, flexShrink: 0 }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <div style={{ background: 'var(--page-card-bg)', border: '1px solid var(--page-border)', borderRadius: 4, overflow: 'hidden' }}>

              {/* Product Title */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--page-border)' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--page-text)', lineHeight: 1.4, marginBottom: 8 }}>
                  {product.title}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge variant={badgeVariant} />
                  {product.category && (
                    <span style={{ fontSize: 11, color: 'hsl(196,100%,36%)', fontWeight: 600 }}>{product.category.name}</span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--page-border)' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--page-text-muted)', fontWeight: 700, marginBottom: 4 }}>
                  {isEnded ? 'Final Price' : bids.length > 0 ? 'Current Bid' : 'Starting Bid'}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--page-text)', letterSpacing: '-0.02em' }}>
                  {fmtVND(product.currentPrice)}
                </div>
                {!isEnded && (
                  <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', marginTop: 8 }}>
                    <CountdownBadge endTime={product.endTime} />
                    <span style={{ fontSize: 11, color: 'var(--page-text-muted)' }}>
                      {bids.length} {bids.length === 1 ? 'bid' : 'bids'}
                    </span>
                  </div>
                )}
                {!isEnded && !sseConnected && (
                  <div style={{ marginTop: 8, padding: '6px 10px', background: theme === 'dark' ? 'rgba(239,68,68,0.15)' : 'hsl(3,83%,95%)', border: theme === 'dark' ? '1px solid rgba(239,68,68,0.3)' : '1px solid hsl(3,83%,85%)', borderRadius: 4, color: theme === 'dark' ? 'hsl(3,83%,75%)' : 'hsl(3,83%,40%)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }} className="animate-pulse">
                    <span>🔴</span> Mất kết nối live. Đang thử kết nối lại...
                  </div>
                )}
                {isEnded && product.endTime && (
                  <div style={{ fontSize: 11, color: 'var(--page-text-muted)', marginTop: 4 }}>Ended {fmtDate(product.endTime)}</div>
                )}
              </div>

              {/* Watchlist + Seller */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--page-border)', display: 'flex', alignItems: 'center', justifycontent: 'space-between', gap: 10 }}>
                <button
                  id={`watchlist-btn-detail-${id}`}
                  onClick={toggleWatchlist}
                  disabled={watchlistLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                    cursor: watchlistLoading ? 'not-allowed' : 'pointer',
                    border: `1px solid ${inWatchlist ? 'hsl(3,83%,60%)' : 'var(--page-border)'}`,
                    borderRadius: 4, padding: '6px 12px', background: 'var(--page-card-bg)',
                    color: inWatchlist ? 'hsl(3,83%,60%)' : 'var(--page-text)',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill={inWatchlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={inWatchlist ? 0 : 1.5} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                  {inWatchlist ? 'Saved' : 'Watch'}
                </button>

                {product.seller && (
                  <button
                    onClick={openSellerProfile}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'hsl(196,100%,36%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                    title="Click to view seller profile and reviews"
                  >
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: theme === 'dark' ? 'rgba(0,151,186,0.15)' : 'hsl(196,100%,90%)', display: 'flex', alignItems: 'center', justifycontent: 'center', fontSize: 11, fontWeight: 700, color: 'hsl(196,100%,36%)' }}>
                      {(product.seller.name || product.seller.email || '?')[0].toUpperCase()}
                    </div>
                    <span style={{ textDecoration: 'underline', fontWeight: 650 }}>{product.seller.name || product.seller.email}</span>
                    {product.seller.isVerifiedSeller && <span style={{ fontSize: 10, color: 'hsl(152,72%,40%)', fontWeight: 700 }}>✓</span>}
                  </button>
                )}
              </div>

              {/* Upcoming message */}
              {isUpcoming && (
                <div style={{ padding: '20px', textAlign: 'center', background: theme === 'dark' ? 'rgba(0,151,186,0.15)' : 'hsl(196,100%,97%)', borderTop: '1px solid var(--page-border)' }}>
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>📅</div>
                  <div style={{ fontSize: '13px', fontWeight: 750, color: theme === 'dark' ? 'hsl(196,100%,75%)' : 'hsl(196,100%,25%)' }}>
                    Phiên đấu giá chưa bắt đầu
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--page-text-muted)', marginTop: '4px' }}>
                    Bắt đầu vào: {fmtDate(product.startTime)}
                  </div>
                </div>
              )}

              {/* Bid Form */}
              {isActive && !isSeller && (
                <div style={{ padding: '16px 20px' }}>
                  <form onSubmit={handlePlaceBid} id="bid-form">

                    {/* Auto-bid toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <button
                        type="button"
                        id="auto-bid-toggle"
                        onClick={() => setIsAutoBid(v => !v)}
                        style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: isAutoBid ? 'hsl(196,100%,36%)' : 'var(--page-border)',
                          border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                          flexShrink: 0,
                        }}
                        aria-label="Toggle auto-bid"
                      >
                        <div style={{
                          position: 'absolute', top: 2, left: isAutoBid ? 18 : 2,
                          width: 16, height: 16, borderRadius: '50%', background: 'white',
                          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </button>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--page-text)' }}>
                          {isAutoBid ? 'Auto-Bid (Proxy)' : 'Manual Bid'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--page-text-muted)' }}>
                          {isAutoBid ? 'System bids for you up to your max' : 'You control each bid manually'}
                        </div>
                      </div>
                    </div>

                    {/* Bid amount */}
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--page-text-muted)', display: 'block', marginBottom: 6 }}>
                        {isAutoBid ? 'Maximum bid amount' : 'Your bid'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          id="bid-amount-input"
                          type="number"
                          value={bidAmount}
                          onChange={e => setBidAmount(e.target.value)}
                          min={minNextBid}
                          step={getStepPrice(product.currentPrice)}
                          className="bid-input"
                          style={{ paddingRight: 32 }}
                          placeholder={`Min: ${fmtVND(minNextBid)}`}
                        />
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: 'var(--page-text-muted)' }}>đ</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--page-text-muted)', marginTop: 4 }}>
                        Minimum: {fmtVND(minNextBid)} (step: {fmtVND(getStepPrice(product.currentPrice))})
                      </div>
                    </div>

                    {/* Message */}
                    {message && (
                      <div style={{
                        padding: '10px 12px', borderRadius: 4, marginBottom: 10, fontSize: 12, fontWeight: 600,
                        background: message.type === 'success' ? (theme === 'dark' ? 'rgba(16,185,129,0.15)' : 'hsl(152,72%,95%)') : (theme === 'dark' ? 'rgba(239,68,68,0.15)' : 'hsl(3,83%,95%)'),
                        color: message.type === 'success' ? (theme === 'dark' ? 'hsl(152,72%,75%)' : 'hsl(152,72%,32%)') : (theme === 'dark' ? 'hsl(3,83%,75%)' : 'hsl(3,83%,40%)'),
                        border: `1px solid ${message.type === 'success' ? (theme === 'dark' ? 'rgba(16,185,129,0.3)' : 'hsl(152,72%,75%)') : (theme === 'dark' ? 'rgba(239,68,68,0.3)' : 'hsl(3,83%,75%)')}`,
                      }}>
                        {message.text}
                      </div>
                    )}

                    {/* Submit */}
                    {!user ? (
                      <Link
                        to="/login"
                        id="login-to-bid-btn"
                        style={{ display: 'block', textAlign: 'center', padding: '12px', background: 'hsl(196,100%,36%)', color: 'white', borderRadius: 4, fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                      >
                        Log In to Bid
                      </Link>
                    ) : (
                      <button
                        id="place-bid-btn"
                        type="submit"
                        disabled={isSubmitting}
                        className="bid-btn-primary"
                      >
                        {isSubmitting ? 'Placing bid…' : isAutoBid ? 'Set Auto-Bid' : 'Place Bid'}
                      </button>
                    )}
                  </form>

                  {/* Buy Now */}
                  {product.buyNowPrice && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--page-border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--page-text-muted)', marginBottom: 6 }}>Or buy immediately:</div>
                      <button
                        id="buy-now-btn"
                        onClick={handleBuyNowClick}
                        style={{
                          width: '100%', padding: '10px', border: '2px solid hsl(196,100%,36%)',
                          borderRadius: 4, background: theme === 'dark' ? 'transparent' : 'white', color: 'hsl(196,100%,36%)',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)',
                          letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'all 0.15s',
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = 'hsl(196,100%,36%)'; e.currentTarget.style.color = 'white'; }}
                        onMouseOut={e => { e.currentTarget.style.background = theme === 'dark' ? 'transparent' : 'white'; e.currentTarget.style.color = 'hsl(196,100%,36%)'; }}
                      >
                        Buy Now — {fmtVND(product.buyNowPrice)}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Winner / Seller actions */}
              {isEnded && (
                <div style={{ padding: '16px 20px' }}>
                  {isWinner && ['PENDING_PAYMENT', 'ENDED'].includes(product.status) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button id="checkout-btn" onClick={() => setCheckoutModalOpen(true)} className="bid-btn-primary">
                        Thanh toán ngay (90% + Phí ship) 💳
                      </button>
                      <button
                        id="open-dispute-btn"
                        onClick={() => setDisputeModalOpen(true)}
                        style={{
                          width: '100%', padding: '10px', border: '1px solid hsl(3,83%,60%)',
                          borderRadius: 4, background: theme === 'dark' ? 'transparent' : 'white', color: 'hsl(3,83%,60%)',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)',
                          letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'all 0.15s',
                        }}
                      >
                        ⚖️ Khiếu nại sản phẩm
                      </button>
                    </div>
                  )}
                  {isWinner && product.status === 'PAID' && (
                    <div style={{ fontSize: 13, color: 'hsl(152,72%,40%)', fontWeight: 700, textAlign: 'center', padding: 8 }}>
                      ✓ Đã thanh toán (90% + Phí ship) — Chờ người bán giao hàng
                    </div>
                  )}
                  {isWinner && product.status === 'SHIPPED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button id="confirm-receive-btn" onClick={handleReceive} className="bid-btn-primary">
                        Xác nhận đã nhận hàng
                      </button>
                      <button
                        id="open-dispute-btn"
                        onClick={() => setDisputeModalOpen(true)}
                        style={{
                          width: '100%', padding: '10px', border: '1px solid hsl(3,83%,60%)',
                          borderRadius: 4, background: theme === 'dark' ? 'transparent' : 'white', color: 'hsl(3,83%,60%)',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)',
                          letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'all 0.15s',
                        }}
                      >
                        ⚖️ Khiếu nại sản phẩm
                      </button>
                    </div>
                  )}
                  {isWinner && product.status === 'COMPLETED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                      <div style={{ fontSize: 13, color: 'hsl(152,72%,40%)', fontWeight: 700, textAlign: 'center', padding: 8 }}>
                        ✓ Giao dịch hoàn tất
                      </div>
                      {!product.review ? (
                        <button
                          id="review-seller-btn-direct"
                          onClick={() => setReviewModalOpen(true)}
                          className="bid-btn-primary"
                          style={{
                            background: 'hsl(35, 95%, 45%)',
                            borderColor: 'hsl(35, 95%, 45%)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                          }}
                        >
                          ⭐ Đánh giá người bán
                        </button>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--page-text-muted)', textAlign: 'center', background: 'var(--page-bg)', padding: '6px 8px', borderRadius: 4 }}>
                          Bạn đã gửi đánh giá cho giao dịch này.
                        </div>
                      )}
                    </div>
                  )}
                  {isSeller && product.status === 'PENDING_PAYMENT' && (
                    <div style={{ fontSize: 13, color: 'hsl(35, 95%, 45%)', fontWeight: 700, textAlign: 'center', padding: 8 }}>
                      Chờ người mua thanh toán (90% còn lại + Phí ship)
                    </div>
                  )}
                  {isSeller && product.status === 'PAID' && (
                    <button id="confirm-ship-btn" onClick={handleShip} className="bid-btn-primary">
                      Xác nhận gửi hàng cho đơn vị vận chuyển
                    </button>
                  )}
                  {isSeller && product.status === 'SHIPPED' && (
                    <div style={{ fontSize: 13, color: 'hsl(196,100%,36%)', fontWeight: 700, textAlign: 'center', padding: 8 }}>
                      Đang vận chuyển — Chờ người mua xác nhận đã nhận hàng
                    </div>
                  )}
                  {isSeller && product.status === 'COMPLETED' && (
                    <div style={{ fontSize: 13, color: 'hsl(152,72%,40%)', fontWeight: 700, textAlign: 'center', padding: 8 }}>
                      ✓ Đơn hàng hoàn tất. Tiền ký quỹ đã được giải ngân vào ví của bạn.
                    </div>
                  )}
                  {product.status === 'DISPUTED' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                      <div style={{ fontSize: 13, color: 'hsl(3,83%,40%)', fontWeight: 750, textAlign: 'center', padding: 4 }}>
                        ⚖️ Đơn hàng đang có tranh chấp / khiếu nại
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--page-text-muted)', textAlign: 'center' }}>
                        Ban quản trị đang xem xét bằng chứng và xử lý. Vui lòng thảo luận trong phòng giải quyết tranh chấp.
                      </div>
                      {product.disputeTicket?.id && (
                        <Link to={`/disputes/${product.disputeTicket.id}`} style={{ width: '100%', textDecoration: 'none' }}>
                          <button
                            className="bid-btn-primary"
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: 'hsl(3,83%,60%)',
                              borderColor: 'hsl(3,83%,60%)',
                              color: 'white',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              borderRadius: 4,
                              fontFamily: 'var(--font-display)',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)',
                              transition: 'all 0.2s'
                            }}
                          >
                            ⚖️ Vào phòng giải quyết tranh chấp
                          </button>
                        </Link>
                      )}
                    </div>
                  )}
                  {!isWinner && !isSeller && product.status !== 'DISPUTED' && (
                    <div style={{ fontSize: 13, color: 'var(--page-text-muted)', textAlign: 'center', padding: 8 }}>
                      This auction has ended.
                    </div>
                  )}
                </div>
              )}

              {/* Seller-only: Manage auction */}
              {isSeller && isActive && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--page-border)', background: 'var(--page-bg)' }}>
                  <div style={{ fontSize: 11, color: 'var(--page-text-muted)', fontWeight: 600 }}>You are the seller of this item</div>
                </div>
              )}

              {/* Escrow badge */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--page-border)', background: 'var(--page-bg)', fontSize: 11, color: 'var(--page-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                🛡️ AuraBid Escrow Protection &nbsp;·&nbsp; Secure payment
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxOpen && product.imageUrl && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'hsla(0,0%,0%,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={product.imageUrl}
            alt={product.title}
            style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain', userSelect: 'none' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'hsla(0,0%,100%,0.15)', border: 'none', color: 'white',
              borderRadius: '50%', width: 40, height: 40, fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Checkout Modal ── */}
      {checkoutModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'hsla(0,0%,0%,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setCheckoutModalOpen(false); }}
        >
          <div style={{ background: 'var(--page-card-bg)', borderRadius: 8, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px hsla(0,0%,0%,0.25)', border: '1px solid var(--page-border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--page-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--page-text)' }}>Complete Purchase</h2>
              <button onClick={() => setCheckoutModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--page-text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleCheckoutSubmit} style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 13, color: 'var(--page-text-muted)', marginBottom: 16 }}>
                Winning bid: <strong style={{ color: 'var(--page-text)' }}>{fmtVND(product.currentPrice)}</strong>
              </div>

              {[
                { key: 'name', label: 'Full Name', placeholder: 'Your name' },
                { key: 'phone', label: 'Phone Number', placeholder: '0xxx xxx xxx' },
                { key: 'address', label: 'Street Address', placeholder: 'Street, ward, district…' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--page-text-muted)', marginBottom: 6 }}>{f.label}</label>
                  <input
                    id={`checkout-${f.key}`}
                    type="text"
                    value={checkoutForm[f.key]}
                    onChange={e => setCheckoutForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="bid-input"
                    style={{ fontSize: 13, background: 'var(--page-card-bg)', color: 'var(--page-text)', border: '2px solid var(--page-border)' }}
                  />
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--page-text-muted)', marginBottom: 6 }}>Tỉnh / Thành phố</label>
                  <select
                    id="checkout-province"
                    value={checkoutForm.province}
                    onChange={e => handleProvinceChange(e.target.value)}
                    style={{ width: '100%', border: '2px solid var(--page-border)', borderRadius: 4, padding: '9px 10px', fontSize: 12, outline: 'none', background: 'var(--page-card-bg)', color: 'var(--page-text)' }}
                    required
                  >
                    <option value="">Chọn Tỉnh / Thành</option>
                    {provincesList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--page-text-muted)', marginBottom: 6 }}>Quận / Huyện</label>
                  <select
                    id="checkout-district"
                    value={checkoutForm.district}
                    onChange={e => handleDistrictChange(e.target.value)}
                    style={{ width: '100%', border: '2px solid var(--page-border)', borderRadius: 4, padding: '9px 10px', fontSize: 12, outline: 'none', background: 'var(--page-card-bg)', color: 'var(--page-text)' }}
                    required
                    disabled={!checkoutForm.province}
                  >
                    <option value="">Chọn Quận / Huyện</option>
                    {districtsList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--page-text-muted)', marginBottom: 6 }}>Phường / Xã</label>
                <select
                  id="checkout-ward"
                  value={checkoutForm.ward}
                  onChange={e => setCheckoutForm(prev => ({ ...prev, ward: e.target.value }))}
                  style={{ width: '100%', border: '2px solid var(--page-border)', borderRadius: 4, padding: '9px 10px', fontSize: 12, outline: 'none', background: 'var(--page-card-bg)', color: 'var(--page-text)' }}
                  required
                  disabled={!checkoutForm.district}
                >
                  <option value="">Chọn Phường / Xã</option>
                  {wardsList.map(w => <option key={w.code} value={w.name}>{w.name}</option>)}
                </select>
              </div>

              {/* Carrier Selection */}
              {shippingEstimates.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--page-text-muted)', marginBottom: 6 }}>Đơn vị vận chuyển</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {shippingEstimates.map(est => (
                      <label 
                        key={est.carrier} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '10px 14px', 
                          border: checkoutForm.carrier === est.carrier ? '2px solid hsl(196,100%,36%)' : '1px solid var(--page-border)', 
                          borderRadius: 6, 
                          background: checkoutForm.carrier === est.carrier ? (theme === 'dark' ? 'rgba(0,151,186,0.1)' : 'hsl(196,100%,97%)') : 'var(--page-card-bg)',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input 
                            type="radio" 
                            name="shipping-carrier" 
                            checked={checkoutForm.carrier === est.carrier}
                            onChange={() => setCheckoutForm(prev => ({ ...prev, carrier: est.carrier }))}
                            style={{ accentColor: 'hsl(196,100%,36%)' }}
                          />
                          <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--page-text)' }}>{est.name}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(196,100%,36%)' }}>{fmtVND(est.fee)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {estShipping != null && (
                <div style={{ fontSize: 12, color: 'var(--page-text-muted)', marginBottom: 14, padding: '8px 12px', background: theme === 'dark' ? 'rgba(0,151,186,0.1)' : 'hsl(196,100%,97%)', borderRadius: 4, border: '1px solid var(--page-border)' }}>
                  Estimated shipping fee: <strong>{fmtVND(estShipping)}</strong>
                </div>
              )}

              {checkoutError && (
                <div style={{ fontSize: 12, color: theme === 'dark' ? 'hsl(3,83%,75%)' : 'hsl(3,83%,40%)', background: theme === 'dark' ? 'rgba(239,68,68,0.15)' : 'hsl(3,83%,95%)', padding: '8px 12px', borderRadius: 4, marginBottom: 14, border: '1px solid var(--page-border)' }}>
                  {checkoutError}
                </div>
              )}

              <button id="checkout-submit-btn" type="submit" disabled={checkoutSubmitting} className="bid-btn-primary" style={{ marginTop: 4 }}>
                {checkoutSubmitting ? 'Processing…' : 'Confirm & Pay'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Dispute Modal ── */}
      {disputeModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'hsla(0,0%,0%,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setDisputeModalOpen(false); }}
        >
          <div style={{ background: 'var(--page-card-bg)', borderRadius: 8, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px hsla(0,0%,0%,0.25)', border: '1px solid var(--page-border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--page-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--page-text)' }}>Khiếu nại sản phẩm</h2>
              <button onClick={() => setDisputeModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--page-text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleDisputeSubmit} style={{ padding: '20px 24px' }}>
              {disputeError && (
                <div style={{ fontSize: 12, color: theme === 'dark' ? 'hsl(3,83%,75%)' : 'hsl(3,83%,40%)', background: theme === 'dark' ? 'rgba(239,68,68,0.15)' : 'hsl(3,83%,95%)', padding: '8px 12px', borderRadius: 4, marginBottom: 14, border: '1px solid var(--page-border)' }}>
                  {disputeError}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--page-text-muted)', marginBottom: 6 }}>Lý do khiếu nại</label>
                <select
                  id="dispute-reason"
                  value={disputeForm.reason}
                  onChange={e => setDisputeForm(prev => ({ ...prev, reason: e.target.value }))}
                  style={{ width: '100%', border: '2px solid var(--page-border)', borderRadius: 4, padding: '9px 10px', fontSize: 12, outline: 'none', background: 'var(--page-card-bg)', color: 'var(--page-text)' }}
                >
                  <option>Sản phẩm không đúng mô tả</option>
                  <option>Sản phẩm bị hỏng hóc / vỡ nát</option>
                  <option>Người bán không giao hàng / giao chậm</option>
                  <option>Khác</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--page-text-muted)', marginBottom: 6 }}>Mô tả chi tiết lỗi</label>
                <textarea
                  id="dispute-desc"
                  rows="4"
                  value={disputeForm.description}
                  onChange={e => setDisputeForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Vui lòng mô tả chi tiết vấn đề bạn gặp phải với sản phẩm này..."
                  style={{ width: '100%', border: '2px solid var(--page-border)', borderRadius: 4, padding: '9px 10px', fontSize: 12, outline: 'none', background: 'var(--page-card-bg)', color: 'var(--page-text)', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--page-text-muted)', marginBottom: 6 }}>Video khui hộp bằng chứng (URL)</label>
                <input
                  id="dispute-video"
                  type="text"
                  value={disputeForm.videoUrl}
                  onChange={e => setDisputeForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://example.com/unboxing-video.mp4"
                  style={{ width: '100%', border: '2px solid var(--page-border)', borderRadius: 4, padding: '9px 10px', fontSize: 12, outline: 'none', background: 'var(--page-card-bg)', color: 'var(--page-text)' }}
                />
                <span style={{ fontSize: 10, color: 'var(--page-text-muted)', marginTop: 4, display: 'block' }}>Gợi ý: Dán link video bằng chứng để Admin dễ dàng phân xử.</span>
              </div>

              <button id="dispute-submit-btn" type="submit" disabled={disputeSubmitting} className="bid-btn-primary">
                {disputeSubmitting ? 'Đang gửi khiếu nại…' : 'Gửi khiếu nại'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* ── Double-Confirm Modal ── */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.type === 'bid' ? 'Xác nhận đặt giá' : 'Xác nhận mua đứt'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {confirmModal.type === 'bid' ? (
              <>
                Bạn có chắc chắn muốn đặt cọc 10% (<strong className="text-amber-600 dark:text-amber-400 font-bold">{fmtVND(confirmModal.deposit)}</strong>) để tham gia đấu giá sản phẩm này với mức giá <strong className="text-neutral-900 dark:text-white font-bold">{fmtVND(confirmModal.amount)}</strong>?
              </>
            ) : (
              <>
                Bạn có chắc chắn muốn đặt cọc 10% (<strong className="text-amber-600 dark:text-amber-400 font-bold">{fmtVND(confirmModal.deposit)}</strong>) để mua đứt sản phẩm này với giá <strong className="text-neutral-900 dark:text-white font-bold">{fmtVND(confirmModal.amount)}</strong>?
              </>
            )}
          </p>
          <div className="p-3 bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-2xl text-[11px] text-neutral-500 leading-relaxed space-y-1">
            <p className="font-bold text-neutral-700 dark:text-neutral-400">⚠️ Lưu ý quan trọng:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Tiền cọc sẽ bị tạm khóa trong hệ thống trung gian (Escrow).</li>
              <li>Nếu bạn không thắng hoặc đấu giá bị hủy, tiền cọc sẽ được hoàn trả đầy đủ.</li>
              <li>Nếu bạn thắng nhưng từ chối thanh toán phần còn lại, tiền cọc sẽ bị tịch thu.</li>
            </ul>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={confirmModal.action}
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-xl text-xs font-black transition-all active:scale-[0.97] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Seller Profile Modal ── */}
      <Modal
        isOpen={sellerModalOpen}
        onClose={() => setSellerModalOpen(false)}
        title="Thông tin Người bán"
        maxWidth="max-w-lg"
      >
        {sellerLoading ? (
          <div className="text-center py-6 text-xs text-neutral-400">Đang tải hồ sơ người bán...</div>
        ) : sellerData ? (
          <div className="space-y-4 text-left text-xs">
            <div className="flex items-center gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: theme === 'dark' ? 'rgba(0,151,186,0.15)' : 'hsl(196,100%,90%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'hsl(196,100%,36%)' }}>
                {(sellerData.name || sellerData.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-1.5 select-none">
                  {sellerData.name || sellerData.email}
                  {sellerData.isVerifiedSeller && (
                    <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                      ✓ Đã xác thực
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-neutral-400 mt-0.5 select-none">
                  Thành viên từ: {new Date(sellerData.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-950/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-850 select-none">
              <div>
                <span className="block text-[10px] text-neutral-400 font-medium">Điểm uy tín</span>
                <span className="text-sm font-black text-amber-500 flex items-center gap-1 mt-0.5">
                  ★ {Number(sellerData.reputationScore || 5).toFixed(1)} / 5.0
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-neutral-400 font-medium">Số đơn hàng đã bán</span>
                <span className="text-sm font-black text-neutral-900 dark:text-white mt-0.5">
                  {sellerData.soldCount || 0} sản phẩm
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="font-bold text-neutral-900 dark:text-white select-none">Đánh giá nhận được ({sellerData.reviews?.length || 0})</h5>
                {user && product && product.status === 'COMPLETED' && product.winnerId === user.id && !product.review && (
                  <button
                    onClick={() => {
                      setSellerModalOpen(false);
                      setReviewModalOpen(true);
                    }}
                    className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
                  >
                    + Viết đánh giá
                  </button>
                )}
              </div>

              {(!sellerData.reviews || sellerData.reviews.length === 0) ? (
                <div className="text-center py-6 text-[11px] text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl select-none">
                  Chưa có đánh giá nào cho người bán này.
                </div>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {sellerData.reviews.map((rev) => (
                    <div key={rev.id} className="p-3 border border-neutral-100 dark:border-neutral-800/80 rounded-2xl bg-white dark:bg-neutral-900 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[11px] text-neutral-700 dark:text-neutral-300">
                          {rev.reviewer?.name}
                        </span>
                        <span className="text-[10px] text-amber-500 font-bold">
                          {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                        </span>
                      </div>
                      {rev.comment && (
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                          {rev.comment}
                        </p>
                      )}
                      <div className="flex justify-between items-center text-[9px] text-neutral-400">
                        <span>Sản phẩm: {rev.product?.title || 'Đã ẩn'}</span>
                        <span>{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-rose-500">Không thể tải thông tin người bán.</div>
        )}
      </Modal>

      {/* ── Partner Review Modal ── */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        productId={product?.id}
        productName={product?.title}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */
function DetailSkeleton() {
  return (
    <div className="page-container py-6">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="skeleton rounded" style={{ paddingBottom: '75%' }} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
          </div>
        </div>
        <div style={{ width: 360 }}>
          <div className="skeleton rounded" style={{ height: 400 }} />
        </div>
      </div>
    </div>
  );
}

function DetailError({ error }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Product Not Found</h2>
      <p style={{ fontSize: 13, color: 'var(--page-text-muted)', marginBottom: 20 }}>{error || 'This item may have been removed or the link is invalid.'}</p>
      <Link to="/" style={{ display: 'inline-block', background: 'hsl(196,100%,36%)', color: 'white', padding: '10px 24px', borderRadius: 4, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
        Back to Home
      </Link>
    </div>
  );
}
