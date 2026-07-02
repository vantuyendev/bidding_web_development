import React, { useState, useEffect, useRef } from 'react';
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



  // 2. Fetch dispute ticket details
  const fetchTicketDetails = async () => {
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
  };

  // 3. Fetch dispute chat history
  const fetchChatHistory = async () => {
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
  };

  // Run initial fetches
  useEffect(() => {
    const initFetch = async () => {
      setLoading(true);
      await fetchTicketDetails();
      await fetchChatHistory();
      setLoading(false);
    };

    initFetch();
  }, [ticketId]);

  // Polling for real-time messages
  useEffect(() => {
    if (!ticketId || (ticket && ticket.status !== 'PENDING')) return;

    const timer = setInterval(() => {
      fetchChatHistory();
      // Fetch ticket status as well to detect resolving events in real-time
      fetchTicketDetails();
    }, 4000);

    return () => clearInterval(timer);
  }, [ticketId, ticket?.status]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message handler
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
        // Add new message to list
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

  // Resolve ticket handler (Admin only)
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
        // Reload details immediately
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

  // Determine user role
  const isAdmin = currentUser?.email?.toLowerCase().includes('admin');

  // Determine status color classes
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-sm text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
            Đang xử lý (PENDING)
          </span>
        );
      case 'RESOLVED_REFUND':
        return (
          <span className="px-2.5 py-1 rounded-sm text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            Đã hoàn tiền (RESOLVED_REFUND)
          </span>
        );
      case 'RESOLVED_PAY':
        return (
          <span className="px-2.5 py-1 rounded-sm text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Đã thanh toán (RESOLVED_PAY)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-sm text-xs font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-500 text-sm font-bold tracking-wider">ĐANG TẢI THÔNG TIN KHIẾU NẠI...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 text-3xl mb-6">
            ⚠️
          </div>
          <h2 className="text-2xl font-black text-neutral-900 mb-2">Đã Xảy Ra Lỗi</h2>
          <p className="text-neutral-500 max-w-md mb-8">{error || 'Không thể tìm thấy hoặc truy cập đơn khiếu nại này.'}</p>
          <Link
            to="/"
            className="px-6 py-3 bg-neutral-900 text-white rounded-md font-bold hover:bg-neutral-800 transition-colors text-sm"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = ticket.status !== 'PENDING';

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans selection:bg-neutral-500/20">

      {/* Main Split Screen Layout container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        
        {/* LEFT COLUMN: Dispute Details */}
        <div className="w-full lg:w-1/2 flex flex-col gap-5 bg-white border border-neutral-200 rounded-md p-5 sm:p-6 overflow-y-auto">
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Mã khiếu nại: #{ticket.id.slice(0, 8)}</span>
              <h1 className="text-2xl font-black tracking-tight text-neutral-900 mt-1">Chi Tiết Khiếu Nại</h1>
            </div>
            <div>
              {getStatusBadge(ticket.status)}
            </div>
          </div>

          {/* Product Details Card */}
          <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-md space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">Sản phẩm tranh chấp</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-neutral-900">{ticket.product?.title}</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-neutral-500">
                  <span>Người mua: <strong className="text-neutral-700">{ticket.openedBy?.email}</strong></span>
                  <span>Mã Người bán: <strong className="text-neutral-700">#{ticket.product?.sellerId?.slice(0, 8)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Dispute details: Reason and description */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">Lý do khiếu nại</span>
              <div className="px-4 py-3 bg-rose-50 border border-rose-100 text-rose-750 font-bold rounded-md text-sm">
                {ticket.reason}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">Mô tả chi tiết lỗi</span>
              <div className="p-4 bg-neutral-50 border border-neutral-200 text-neutral-700 text-sm rounded-md whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </div>
            </div>
          </div>

          {/* Evidence Video Player */}
          <div className="flex-1 flex flex-col gap-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">Video unboxing bằng chứng</span>
            <div className="relative aspect-video w-full rounded-md overflow-hidden border border-neutral-200 bg-neutral-950 flex items-center justify-center">
              {ticket.unboxingVideoUrl ? (
                <video
                  src={ticket.unboxingVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"
                />
              ) : (
                <div className="text-center p-6 text-neutral-450">
                  <span className="text-4xl block mb-2">📹</span>
                  <p className="text-sm font-medium">Không tìm thấy video bằng chứng unboxing.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3-party Chat Room */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white border border-neutral-200 rounded-md overflow-hidden relative">
          
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <h2 className="font-extrabold text-sm text-neutral-800 tracking-wider uppercase">
                Phòng Tranh Chấp Trực Tuyến
              </h2>
            </div>
            <span className="text-xs text-neutral-500 bg-neutral-100 px-3 py-1 rounded-sm border border-neutral-200 font-bold">
              3 Bên Đối Thoại
            </span>
          </div>

          {/* Message List Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 flex flex-col min-h-[300px] lg:min-h-[450px]">
            
            {/* System Info Banner */}
            <div className="text-center p-3 rounded-md bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-500 space-y-1">
              <p className="font-bold text-neutral-700">⚖️ CHAT ROOM TRỌNG TÀI ĐANG HOẠT ĐỘNG</p>
              <p>Mọi tin nhắn từ Người mua, Người bán và Trọng tài đều được ghi lại làm cơ sở giải quyết tranh chấp.</p>
            </div>

            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
                Chưa có tin nhắn nào. Bắt đầu đối thoại để cung cấp thêm thông tin.
              </div>
            ) : (
              messages.map((msg) => {
                const isMsgBuyer = msg.senderId === ticket.openedById;
                const isMsgSeller = msg.senderId === ticket.product?.sellerId;
                const isMsgAdmin = msg.sender?.email?.toLowerCase().includes('admin');

                // Determine display name
                let senderLabel = 'Thành viên';
                if (isMsgBuyer) senderLabel = 'Người mua';
                if (isMsgSeller) senderLabel = 'Người bán';
                if (isMsgAdmin) senderLabel = 'Trọng tài';

                // Determine style based on sender
                let bubbleClass = 'bg-neutral-100 text-neutral-800 rounded-bl-none self-start border border-neutral-200';
                let wrapperClass = 'justify-start';

                if (isMsgAdmin) {
                  // Admin style: flat red-amber color, strong solid border, no gradients
                  bubbleClass = 'bg-red-50 text-red-950 border border-red-200 rounded-bl-none self-start font-bold';
                } else if (isMsgBuyer) {
                  // Buyer style: flat black background, white text, aligned right
                  bubbleClass = 'bg-neutral-900 text-white rounded-br-none self-end border border-neutral-900';
                  wrapperClass = 'justify-end';
                } else if (isMsgSeller) {
                  // Seller style: flat light gray, neutral border
                  bubbleClass = 'bg-neutral-50 text-neutral-850 rounded-bl-none self-start border border-neutral-200';
                }

                return (
                  <div key={msg.id} className={`flex ${wrapperClass} w-full`}>
                    <div className={`max-w-[85%] flex flex-col ${isMsgBuyer ? 'items-end' : 'items-start'}`}>
                      {/* Message Sender Header */}
                      <span className="text-[10px] text-neutral-500 font-bold mb-1 px-1 flex items-center gap-1.5">
                        {isMsgAdmin && (
                          <span className="px-1.5 py-0.5 rounded bg-red-650 text-[8px] font-black text-white uppercase tracking-wider">
                            TRỌNG TÀI
                          </span>
                        )}
                        <span>{msg.sender?.email} ({senderLabel})</span>
                        <span className="text-[9px] font-normal text-neutral-400">
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>

                      {/* Bubble */}
                      <div className={`px-4 py-2.5 rounded-md text-sm leading-relaxed whitespace-pre-wrap break-words ${bubbleClass}`}>
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
            <div className={`mx-5 mb-3 p-3.5 rounded-md text-xs font-semibold flex items-center gap-2 animate-fadeIn border ${
              actionMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-250 text-emerald-705' 
                : 'bg-rose-50 border-rose-250 text-rose-705'
            }`}>
              <span>{actionMessage.type === 'success' ? '✓' : '✕'}</span>
              <p>{actionMessage.text}</p>
            </div>
          )}

          {/* Input text / Locked Message Box */}
          <div className="p-4 bg-neutral-50 border-t border-neutral-200">
            {isClosed ? (
              <div className="p-4 text-center rounded-md bg-white border border-neutral-200 flex flex-col items-center justify-center gap-2 animate-fadeIn">
                <span className="text-2xl">🔒</span>
                <p className="text-neutral-800 font-bold text-sm">
                  Cuộc tranh chấp đã được phân xử bởi Admin. Khung chat đã đóng.
                </p>
                <p className="text-neutral-400 text-[11px]">
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
                  className="flex-1 px-4 py-3 bg-white text-neutral-900 placeholder-neutral-400 border border-neutral-300 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-colors text-sm"
                />
                <button
                  type="submit"
                  disabled={sendLoading || !newMessage.trim()}
                  className="px-6 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {sendLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
        <div className="fixed bottom-6 right-6 z-40 max-w-sm w-full sm:w-80 bg-white border border-neutral-300 rounded-md p-5 shadow-lg animate-slideUp">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-200 pb-3">
            <h3 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
              <span className="text-lg">⚖️</span> Bảng Trọng Tài
            </h3>
            <span className="text-[9px] font-black text-neutral-900 uppercase tracking-widest px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200">
              Admin Mode
            </span>
          </div>

          <p className="text-[11px] text-neutral-500 mb-5 leading-relaxed">
            Xem xét cẩn thận mô tả và video unboxing trước khi đưa ra phán quyết tối cao. Hành động này không thể hoàn tác.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleResolveTicket('RESOLVED_REFUND')}
              disabled={resolveLoading || isClosed}
              className="w-full py-3.5 px-4 rounded-md text-xs font-bold tracking-wide text-rose-600 hover:bg-rose-50 border border-rose-200 bg-white transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Hoàn tiền cho Người mua
            </button>
            <button
              onClick={() => handleResolveTicket('RESOLVED_PAY')}
              disabled={resolveLoading || isClosed}
              className="w-full py-3.5 px-4 rounded-md text-xs font-bold tracking-wide text-emerald-605 hover:bg-emerald-50 border border-emerald-200 bg-white transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Thanh toán cho Người bán
            </button>
          </div>

          {isClosed && (
            <div className="mt-4 p-2.5 rounded-md bg-neutral-50 text-[10px] text-center text-neutral-500 font-bold border border-neutral-200">
              Ticket đã được phân xử và đóng.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
