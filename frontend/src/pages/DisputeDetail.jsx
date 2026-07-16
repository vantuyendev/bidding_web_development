import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../api';

export default function DisputeDetail() {
  const { ticketId } = useParams();
  const { user: currentUser } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const messagesEndRef = useRef(null);



  // 2. Lấy chi tiết yêu cầu khiếu nại
  const fetchTicketDetails = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl(`/api/disputes/${ticketId}`), {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setTicket(data.data);
      } else {
        setError(data.error || 'Không thể tải thông tin khiếu nại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi tải thông tin khiếu nại.');
    }
  }, [ticketId]);

  // 3. Lấy lịch sử chat khiếu nại
  const fetchChatHistory = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl(`/api/disputes/${ticketId}/messages`), {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử tin nhắn:', err);
    }
  }, [ticketId]);

  // Thực hiện tải dữ liệu ban đầu
  useEffect(() => {
    const initFetch = async () => {
      setLoading(true);
      await fetchTicketDetails();
      await fetchChatHistory();
      setLoading(false);
    };

    initFetch();
  }, [fetchTicketDetails, fetchChatHistory]);

  // Bỏ phiếu (polling) tin nhắn thời gian thực
  const ticketStatus = ticket?.status;
  const hasTicket = !!ticket;
  useEffect(() => {
    if (!ticketId || (hasTicket && ticketStatus !== 'PENDING')) return;

    const timer = setInterval(() => {
      fetchChatHistory();
      // Lấy cả trạng thái phiếu để phát hiện sự kiện giải quyết trong thời gian thực
      fetchTicketDetails();
    }, 4000);

    return () => clearInterval(timer);
  }, [ticketId, ticketStatus, hasTicket, fetchChatHistory, fetchTicketDetails]);

  // Cuộn xuống dưới cùng của cuộc trò chuyện
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Hàm xử lý gửi tin nhắn
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendLoading) return;

    setSendLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(getApiUrl(`/api/disputes/${ticketId}/messages`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message: newMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        // Thêm tin nhắn mới vào danh sách
        setMessages((prev) => [...prev, data.data]);
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Không thể gửi tin nhắn.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Lỗi kết nối khi gửi tin nhắn.' });
    } finally {
      setSendLoading(false);
    }
  };

  // Hàm xử lý giải quyết khiếu nại (Chỉ Admin)
  const handleResolveTicket = async (status) => {
    if (resolveLoading) return;
    
    const confirmMsg = status === 'RESOLVED_REFUND' 
      ? 'Bạn có chắc chắn muốn HOÀN TIỀN cho Người mua và đóng khiếu nại này?' 
      : 'Bạn có chắc chắn muốn THANH TOÁN cho Người bán và đóng khiếu nại này?';

    if (!window.confirm(confirmMsg)) return;

    setResolveLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(getApiUrl('/api/disputes/resolve'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ticketId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ 
          type: 'success', 
          text: `Phán quyết đã được thực thi thành công: ${status === 'RESOLVED_REFUND' ? 'Hoàn tiền cho Người mua' : 'Thanh toán cho Người bán'}.` 
        });
        // Tải lại thông tin chi tiết ngay lập tức
        await fetchTicketDetails();
        await fetchChatHistory();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Xảy ra lỗi khi thực thi phán quyết.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setResolveLoading(false);
    }
  };

  // Xác định vai trò người dùng
  const isAdmin = currentUser?.isAdmin === true;

  // Xác định các class màu sắc theo trạng thái
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.05)] animate-pulse">
            Đang xử lý (PENDING)
          </span>
        );
      case 'RESOLVED_REFUND':
        return (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.05)]">
            Đã hoàn tiền (RESOLVED_REFUND)
          </span>
        );
      case 'RESOLVED_PAY':
        return (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
            Đã thanh toán (RESOLVED_PAY)
          </span>
        );
      default:
        return (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-100 dark:bg-zinc-950 text-charcoal-900 dark:text-zinc-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-500 dark:text-zinc-400 text-sm font-semibold tracking-wider">ĐANG TẢI THÔNG TIN KHIẾU NẠI...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-warm-100 dark:bg-zinc-950 text-charcoal-900 dark:text-zinc-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 text-3xl mb-6">
            ⚠️
          </div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-zinc-100 mb-2">Đã Xảy Ra Lỗi</h2>
          <p className="text-neutral-500 dark:text-zinc-400 max-w-md mb-8">{error || 'Không thể tìm thấy hoặc truy cập đơn khiếu nại này.'}</p>
          <Link
            to="/"
            className="px-6 py-3 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl font-bold hover:bg-neutral-50 dark:hover:bg-zinc-800 transition-all text-sm shadow-sm text-neutral-800 dark:text-zinc-200 no-underline"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = ticket.status !== 'PENDING';

  return (
    <div className="min-h-screen bg-warm-100 dark:bg-zinc-950 text-charcoal-900 dark:text-zinc-50 flex flex-col font-sans selection:bg-amber-500/35">

      {/* Main Split Screen Layout container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        
        {/* LEFT COLUMN: Dispute Details */}
        <div className="w-full lg:w-1/2 flex flex-col gap-5 bg-white dark:bg-zinc-900/40 border border-neutral-200 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-sm overflow-y-auto">
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-zinc-800 pb-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Mã khiếu nại: #{ticket.id.slice(0, 8)}</span>
              <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-zinc-100 mt-1">Chi Tiết Khiếu Nại</h1>
            </div>
            <div>
              {getStatusBadge(ticket.status)}
            </div>
          </div>

          {/* Product Details Card */}
          <div className="bg-neutral-50 dark:bg-zinc-950/60 border border-neutral-100 dark:border-zinc-800/60 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Sản phẩm tranh chấp</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-neutral-900 dark:text-zinc-200">{ticket.product?.title}</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-neutral-500 dark:text-zinc-400">
                  <span>Người mua: <strong className="text-neutral-700 dark:text-zinc-300">{ticket.openedBy?.email}</strong></span>
                  <span>Mã Người bán: <strong className="text-neutral-700 dark:text-zinc-300">#{ticket.product?.sellerId?.slice(0, 8)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Dispute details: Reason and description */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Lý do khiếu nại</span>
              <div className="px-4 py-3 bg-rose-500/5 border border-rose-500/10 text-rose-600 dark:text-rose-200 font-bold rounded-xl text-sm">
                {ticket.reason}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Mô tả chi tiết lỗi</span>
              <div className="p-4 bg-neutral-50 dark:bg-zinc-950/40 border border-neutral-100 dark:border-zinc-800/60 text-neutral-750 dark:text-zinc-300 text-sm rounded-xl whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </div>
            </div>
          </div>

          {/* Evidence Video Player */}
          <div className="flex-1 flex flex-col gap-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Video unboxing bằng chứng</span>
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-zinc-800 bg-neutral-100 dark:bg-zinc-950 flex items-center justify-center">
              {ticket.unboxingVideoUrl ? (
                <video
                  src={ticket.unboxingVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"
                />
              ) : (
                <div className="text-center p-6 text-neutral-400 dark:text-zinc-500">
                  <span className="text-4xl block mb-2">📹</span>
                  <p className="text-sm font-medium">Không tìm thấy video bằng chứng unboxing.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3-party Chat Room */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white dark:bg-zinc-900/40 border border-neutral-200 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-sm relative">
          
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-neutral-100 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <h2 className="font-extrabold text-sm text-neutral-800 dark:text-zinc-200 tracking-wider uppercase">
                Phòng Tranh Chấp Trực Tuyến
              </h2>
            </div>
            <span className="text-xs text-neutral-500 dark:text-zinc-400 bg-neutral-100 dark:bg-zinc-950 px-3 py-1 rounded-full border border-neutral-200 dark:border-zinc-800/60 font-semibold">
              3 Bên Đối Thoại
            </span>
          </div>

          {/* Message List Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 flex flex-col min-h-[300px] lg:min-h-[450px]">
            
            {/* System Info Banner */}
            <div className="text-center p-3 rounded-2xl bg-neutral-50 dark:bg-zinc-950/40 border border-neutral-200 dark:border-zinc-800/50 text-[11px] text-neutral-500 space-y-1">
              <p className="font-bold text-neutral-700 dark:text-zinc-400">⚖️ CHAT ROOM TRỌNG TÀI ĐANG HOẠT ĐỘNG</p>
              <p className="text-neutral-500 dark:text-zinc-500">Mọi tin nhắn từ Người mua, Người bán và Trọng tài đều được ghi lại làm cơ sở giải quyết tranh chấp.</p>
            </div>

            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-neutral-400 dark:text-zinc-500 text-sm">
                Chưa có tin nhắn nào. Bắt đầu đối thoại để cung cấp thêm thông tin.
              </div>
            ) : (
              messages.map((msg) => {
                const isMsgBuyer = msg.senderId === ticket.openedById;
                const isMsgSeller = msg.senderId === ticket.product?.sellerId;
                const isMsgAdmin = msg.sender?.isAdmin === true;

                // Xác định tên hiển thị
                let senderLabel = 'Thành viên';
                if (isMsgBuyer) senderLabel = 'Người mua';
                if (isMsgSeller) senderLabel = 'Người bán';
                if (isMsgAdmin) senderLabel = 'Trọng tài';

                // Xác định kiểu dáng dựa trên người gửi
                let bubbleClass = 'bg-neutral-100 text-neutral-800 dark:bg-zinc-850 dark:text-zinc-200 rounded-bl-none self-start border border-neutral-200/50 dark:border-transparent';
                let wrapperClass = 'justify-start';

                if (isMsgAdmin) {
                  // Admin: Phong cách gradient Đỏ/Vàng với viền nổi bật
                  bubbleClass = 'bg-gradient-to-r from-rose-50 to-amber-50 dark:from-red-950/40 dark:to-amber-950/40 border-2 border-amber-400/60 dark:border-amber-400/80 text-amber-950 dark:text-amber-50 rounded-bl-none self-start shadow-sm font-bold';
                } else if (isMsgBuyer) {
                  // Người mua: Nền xanh, căn phải
                  bubbleClass = 'bg-blue-600 text-white rounded-br-none self-end';
                  wrapperClass = 'justify-end';
                } else if (isMsgSeller) {
                  // Người bán: Nền xám, căn trái
                  bubbleClass = 'bg-neutral-100 text-neutral-800 dark:bg-zinc-700/80 dark:text-zinc-100 rounded-bl-none self-start border border-neutral-200/50 dark:border-transparent';
                }

                return (
                  <div key={msg.id} className={`flex ${wrapperClass} w-full`}>
                    <div className={`max-w-[85%] flex flex-col ${isMsgBuyer ? 'items-end' : 'items-start'}`}>
                       {/* Message Sender Header */}
                      <span className="text-[10px] text-neutral-500 dark:text-zinc-400 font-bold mb-1 px-1 flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider ${
                          isMsgAdmin 
                            ? 'bg-gradient-to-r from-red-500 to-amber-500 shadow-sm shadow-amber-500/20' 
                            : isMsgBuyer 
                              ? 'bg-blue-600 shadow-sm shadow-blue-600/20' 
                              : 'bg-zinc-700 shadow-sm shadow-zinc-750/20'
                        }`}>
                          {senderLabel}
                        </span>
                        <span>{msg.sender?.email}</span>
                        <span className="text-[9px] font-normal text-neutral-400 dark:text-zinc-500">
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>

                      {/* Bubble */}
                      <div className={`px-4.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${bubbleClass}`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Action Alerts / Feedback */}
          {actionMessage && (
            <div className={`mx-5 mb-3 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fadeIn border ${
              actionMessage.type === 'success' 
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400' 
                : 'bg-rose-950/20 border-rose-800/40 text-rose-400'
            }`}>
              <span>{actionMessage.type === 'success' ? '✓' : '✕'}</span>
              <p>{actionMessage.text}</p>
            </div>
          )}

          {/* Input text / Locked Message Box */}
          <div className="p-4 bg-neutral-50 dark:bg-zinc-950/80 border-t border-neutral-200 dark:border-zinc-800">
            {isClosed ? (
              <div className="p-4 text-center rounded-2xl bg-neutral-100 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800/60 flex flex-col items-center justify-center gap-2 animate-fadeIn">
                <span className="text-2xl">🔒</span>
                <p className="text-neutral-800 dark:text-zinc-300 font-bold text-sm">
                  Cuộc tranh chấp đã được phân xử bởi Admin. Khung chat đã đóng.
                </p>
                <p className="text-neutral-500 dark:text-zinc-500 text-[11px]">
                  Không thể gửi thêm tin nhắn sau khi quyết định giải quyết được đưa ra.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Nhập phản hồi hoặc cung cấp bằng chứng tại đây..."
                  disabled={sendLoading}
                  className="flex-1 px-4.5 py-3.5 bg-white dark:bg-zinc-900 text-neutral-800 dark:text-zinc-100 placeholder-neutral-400 dark:placeholder-zinc-500 border border-neutral-250 dark:border-zinc-850 rounded-2xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-sm shadow-sm"
                />
                <button
                  type="submit"
                  disabled={sendLoading || !newMessage.trim()}
                  className="px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold text-sm transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {sendLoading ? (
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Gửi'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ADMIN CONTROL PANEL: Floating dashboard if logged-in user is ADMIN */}
      {isAdmin && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm w-full sm:w-80 bg-white/95 dark:bg-zinc-900/95 border-2 border-amber-500/80 backdrop-blur-2xl rounded-3xl p-5 shadow-[0_10px_50px_rgba(245,158,11,0.15)] dark:shadow-[0_10px_50px_rgba(245,158,11,0.2)] animate-slideUp">
          <div className="flex items-center justify-between mb-4.5 border-b border-neutral-200 dark:border-zinc-800 pb-3">
            <h3 className="font-extrabold text-sm text-neutral-800 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-lg">⚖️</span> Bảng Trọng Tài
            </h3>
            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
               Admin Mode
            </span>
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-zinc-400 mb-5 leading-relaxed">
            Xem xét cẩn thận mô tả và video unboxing trước khi đưa ra phán quyết tối cao. Hành động này không thể hoàn tác.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleResolveTicket('RESOLVED_REFUND')}
              disabled={resolveLoading || isClosed}
              className="w-full py-3.5 px-4 rounded-xl text-xs font-black tracking-wide text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 bg-rose-500/5 hover:border-transparent transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Hoàn tiền cho Người mua
            </button>
            <button
              onClick={() => handleResolveTicket('RESOLVED_PAY')}
              disabled={resolveLoading || isClosed}
              className="w-full py-3.5 px-4 rounded-xl text-xs font-black tracking-wide text-emerald-400 hover:bg-emerald-600 hover:text-zinc-950 border border-emerald-500/30 bg-emerald-500/5 hover:border-transparent transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Thanh toán cho Người bán
            </button>
          </div>

          {isClosed && (
            <div className="mt-4 p-2.5 rounded-xl bg-neutral-50 dark:bg-zinc-950 text-[10px] text-center text-neutral-500 dark:text-zinc-500 font-bold border border-neutral-200 dark:border-zinc-800/80">
              Ticket đã được phân xử và đóng.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
