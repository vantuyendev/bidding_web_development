import React, { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Wait for a few seconds to let user know connection is back, then hide banner
      setTimeout(() => {
        setShowBanner(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 text-center py-2 text-[10px] font-bold tracking-wider uppercase transition-all duration-500 shadow-md ${
        isOnline
          ? 'bg-emerald-500 text-white animate-fadeOut'
          : 'bg-rose-500 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="animate-pulse">
          {isOnline ? '🟢' : '🔴'}
        </span>
        <span>
          {isOnline
            ? 'Đã kết nối lại. Đang đồng bộ hóa dữ liệu...'
            : 'Mất kết nối mạng. Phiên đấu giá có thể hiển thị không chính xác.'}
        </span>
      </div>
    </div>
  );
}
