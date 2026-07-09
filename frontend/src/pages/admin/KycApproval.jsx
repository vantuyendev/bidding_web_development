import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';

export default function KycApproval() {
  const { user, loading: authLoading } = useAuth();
  const [pendingKycUsers, setPendingKycUsers] = useState([]);
  const [pendingKycLoading, setPendingKycLoading] = useState(false);
  const [adminActionError, setAdminActionError] = useState('');
  const [adminActionSuccess, setAdminActionSuccess] = useState('');

  const fetchPendingKyc = async () => {
    setPendingKycLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/users/admin/kyc-pending'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setPendingKycUsers(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi lấy danh sách chờ KYC:', err);
    } finally {
      setPendingKycLoading(false);
    }
  };

  const handleApproveKyc = async (targetUserId, action) => {
    setAdminActionError('');
    setAdminActionSuccess('');
    try {
      const res = await fetch(getApiUrl('/api/users/admin/approve-kyc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setAdminActionSuccess(data.message);
        fetchPendingKyc();
      } else {
        setAdminActionError(data.error || 'Duyệt hồ sơ thất bại.');
      }
    } catch (err) {
      setAdminActionError('Lỗi kết nối máy chủ.');
    }
  };

  useEffect(() => {
    if (user && user.email?.toLowerCase().includes('admin')) {
      fetchPendingKyc();
    }
  }, [user]);

  if (authLoading) {
    return <div className="text-center py-10 text-xs text-neutral-400 animate-pulse">Đang kiểm tra quyền truy cập...</div>;
  }

  if (!user || !user.email?.toLowerCase().includes('admin')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">🔑 Phê duyệt hồ sơ Người bán</h3>

      {adminActionError && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold text-xs">{adminActionError}</div>}
      {adminActionSuccess && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold text-xs">{adminActionSuccess}</div>}

      {pendingKycLoading ? (
        <div className="text-center py-10 text-xs text-neutral-400">Đang tải hồ sơ...</div>
      ) : pendingKycUsers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400 text-xs">
          Hiện tại không có hồ sơ nào chờ phê duyệt.
        </div>
      ) : (
        <div className="flex flex-col gap-6 text-xs">
          {pendingKycUsers.map((targetUser) => (
            <div key={targetUser.id} className="p-5 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:border-neutral-300 transition-all">
              <div className="space-y-2">
                <p className="font-bold text-neutral-900 dark:text-white">{targetUser.email}</p>
                <p className="text-neutral-500 font-mono text-[10px]">ID: {targetUser.id}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  <p className="text-neutral-400">Số CCCD: <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{targetUser.idCardNumber}</span></p>
                  <p className="text-neutral-400">Số ĐT: <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{targetUser.phoneNumber || 'N/A'}</span></p>
                  <p className="text-neutral-400 sm:col-span-2">Địa chỉ cửa hàng: <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{targetUser.shopAddress}</span></p>
                </div>
                <div className="mt-2 w-48 h-32 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                  <img src={targetUser.idCardImageUrl} alt="CCCD" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex gap-2.5 w-full md:w-auto flex-shrink-0">
                <Button
                  onClick={() => handleApproveKyc(targetUser.id, 'APPROVE')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Duyệt
                </Button>
                <Button
                  onClick={() => handleApproveKyc(targetUser.id, 'REJECT')}
                  variant="danger"
                >
                  Từ chối
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
