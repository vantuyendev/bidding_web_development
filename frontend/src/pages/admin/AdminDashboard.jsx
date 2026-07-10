import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/admin/stats'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Không thể tải thống kê hệ thống.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse select-none text-left">
        <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 bg-neutral-100 dark:bg-neutral-800/50 rounded-3xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-rose-500 bg-rose-500/10 rounded-2xl font-bold">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      title: '👥 Người dùng',
      value: stats.totalUsers,
      subText: `${stats.bannedUsers} tài khoản bị khóa`,
      link: '/admin/users',
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400'
    },
    {
      title: '⚡ Đấu giá đang diễn ra',
      value: stats.activeAuctions,
      subText: 'Hiển thị công khai',
      link: '/admin/auctions',
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400'
    },
    {
      title: '📦 Sản phẩm chờ duyệt',
      value: stats.pendingProducts,
      subText: 'Cần xem xét nội dung',
      link: '/admin/products',
      color: 'from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400',
      badge: stats.pendingProducts > 0
    },
    {
      title: '💰 Giao dịch chờ duyệt',
      value: stats.pendingDeposits + stats.pendingWithdraws,
      subText: `${stats.pendingDeposits} nạp / ${stats.pendingWithdraws} rút`,
      link: '/admin/wallet-requests',
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400',
      badge: (stats.pendingDeposits + stats.pendingWithdraws) > 0
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn text-left text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">📊 Thống kê tổng quan</h3>
          <p className="text-neutral-500 mt-1">Hệ thống giám sát và quản trị thời gian thực.</p>
        </div>
        <button 
          onClick={fetchStats}
          className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all cursor-pointer"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => (
          <Link 
            key={idx} 
            to={card.link}
            className={`p-6 bg-gradient-to-br ${card.color} border border-neutral-200/50 dark:border-neutral-800/50 rounded-2xl flex flex-col justify-between hover:scale-[1.02] hover:shadow-sm transition-all duration-300 no-underline relative overflow-hidden`}
          >
            {card.badge && (
              <span className="absolute top-3 right-3 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
            <p className="font-bold text-neutral-500 dark:text-neutral-400">{card.title}</p>
            <div className="mt-4">
              <p className="text-2xl font-extrabold text-neutral-900 dark:text-white leading-none">{card.value}</p>
              <p className="text-[10px] text-neutral-400 mt-1.5 font-medium">{card.subText}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Action shortcuts / Quick notice */}
      <div className="p-6 border border-neutral-200/60 dark:border-neutral-800/80 rounded-3xl bg-neutral-50/50 dark:bg-neutral-900/30">
        <h4 className="font-bold text-neutral-900 dark:text-white mb-4">🔔 Nhiệm vụ quản trị ưu tiên</h4>
        <div className="space-y-3">
          {stats.pendingProducts > 0 && (
            <div className="flex justify-between items-center p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
              <p className="text-purple-700 dark:text-purple-300 font-medium">Có {stats.pendingProducts} sản phẩm đang chờ kiểm duyệt và xuất bản.</p>
              <Link to="/admin/products" className="font-bold text-purple-600 hover:underline">Xử lý ngay →</Link>
            </div>
          )}
          {stats.pendingKyc > 0 && (
            <div className="flex justify-between items-center p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
              <p className="text-blue-700 dark:text-blue-300 font-medium">Có {stats.pendingKyc} hồ sơ nâng cấp tài khoản Seller cần duyệt.</p>
              <Link to="/admin/kyc" className="font-bold text-blue-600 hover:underline">Xử lý ngay →</Link>
            </div>
          )}
          {(stats.pendingDeposits + stats.pendingWithdraws) > 0 && (
            <div className="flex justify-between items-center p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
              <p className="text-emerald-700 dark:text-emerald-300 font-medium">Có {stats.pendingDeposits} yêu cầu nạp tiền và {stats.pendingWithdraws} yêu cầu rút tiền đang chờ xử lý.</p>
              <Link to="/admin/wallet-requests" className="font-bold text-emerald-600 hover:underline">Xử lý ngay →</Link>
            </div>
          )}
          {stats.pendingProducts === 0 && stats.pendingKyc === 0 && (stats.pendingDeposits + stats.pendingWithdraws) === 0 && (
            <div className="text-center py-6 text-neutral-400 font-medium">
              🎉 Tuyệt vời! Không có yêu cầu nào đang tồn đọng.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
