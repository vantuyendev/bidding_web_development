import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';

export default function NotificationsPage(props) {
  const context = useOutletContext() || {};
  const profileData = props.profileData || context.profileData;
  const fetchFullProfile = props.fetchFullProfile || context.fetchFullProfile;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/notifications'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      } else {
        setError(data.error || 'Lỗi khi tải thông báo.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileData) {
      fetchNotifications();
    }
  }, [profileData]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(getApiUrl('/api/notifications/read'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : {}),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        fetchNotifications();
        if (fetchFullProfile) await fetchFullProfile();
      }
    } catch (err) {
      console.error('Lỗi khi đánh dấu đã đọc:', err);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'OUTBID': return '🚨';
      case 'WON': return '🏆';
      case 'AUCTION_CANCELLED': return '❌';
      case 'PRODUCT_APPROVED': return '✅';
      case 'PRODUCT_REJECTED': return '⚠️';
      case 'WALLET_REQUEST_APPROVED': return '💵';
      case 'WALLET_REQUEST_REJECTED': return '🚫';
      default: return '🔔';
    }
  };

  if (!profileData) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>🔔</span> Thông báo của tôi
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
              {unreadCount} chưa đọc
            </span>
          )}
        </h3>

        {unreadCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleMarkAsRead(null)}
            className="rounded-xl text-[10px] font-bold cursor-pointer select-none"
          >
            Đánh dấu tất cả đã đọc ✓
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchNotifications} className="underline cursor-pointer">Thử lại</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-neutral-400">Đang tải thông báo...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-850 rounded-3xl text-neutral-400 flex flex-col items-center justify-center gap-3">
          <span className="text-3xl">🔔</span>
          <p>Hộp thư thông báo của bạn trống.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkAsRead(n.id)}
              className={`flex items-start gap-4 p-4 border rounded-2xl transition-all duration-300 ${
                n.isRead
                  ? 'border-neutral-200/50 dark:border-neutral-800/80 bg-neutral-50/10 dark:bg-neutral-950/5'
                  : 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/5 hover:border-amber-500 cursor-pointer'
              }`}
            >
              <div className="text-xl flex-shrink-0 select-none">
                {getNotifIcon(n.type)}
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h4 className={`text-xs ${n.isRead ? 'text-neutral-700 dark:text-neutral-300 font-bold' : 'text-neutral-900 dark:text-white font-extrabold'}`}>
                    {n.title}
                  </h4>
                  <span className="text-[9px] text-neutral-400 font-mono">
                    {formatDate(n.createdAt)}
                  </span>
                </div>
                <p className={`text-[10px] leading-relaxed ${n.isRead ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-700 dark:text-neutral-200 font-medium'}`}>
                  {n.message}
                </p>
              </div>

              {!n.isRead && (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 self-center" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
