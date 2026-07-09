import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getApiUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

export default function WalletDashboard(props) {
  const context = useOutletContext() || {};
  const profileData = props.profileData || context.profileData;
  const fetchFullProfile = props.fetchFullProfile || context.fetchFullProfile;
  const { refreshUser } = useAuth();
  
  // Wallet Modal states
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletAction, setWalletAction] = useState('deposit'); // 'deposit' | 'withdraw'
  const [walletAmount, setWalletAmount] = useState('');
  const [walletModalError, setWalletModalError] = useState('');
  const [walletModalSuccess, setWalletModalSuccess] = useState('');
  const [walletSubmitting, setWalletSubmitting] = useState(false);

  const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';
  
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getTxDetails = (type) => {
    switch (type) {
      case 'DEPOSIT':
        return { label: 'Nạp tiền', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' };
      case 'WITHDRAW':
        return { label: 'Rút tiền', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20' };
      case 'HOLD_ESCROW':
        return { label: 'Tạm giữ cọc', color: 'text-neutral-500 bg-neutral-50 dark:bg-neutral-800/30' };
      case 'RELEASE_ESCROW':
        return { label: 'Giải phóng cọc', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20' };
      case 'PAYMENT':
        return { label: 'Thanh toán mua hàng', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20' };
      default:
        return { label: type, color: 'text-neutral-600 bg-neutral-50' };
    }
  };

  const handleWalletSubmit = async (e) => {
    e.preventDefault();
    setWalletModalError('');
    setWalletModalSuccess('');
    setWalletSubmitting(true);

    const amountNum = parseFloat(walletAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWalletModalError('Số tiền phải lớn hơn 0.');
      setWalletSubmitting(false);
      return;
    }

    const endpoint = walletAction === 'deposit' ? '/api/users/deposit' : '/api/users/withdraw';

    try {
      const res = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setWalletModalSuccess(data.message);
        setWalletAmount('');
        await fetchFullProfile();
        await refreshUser();
      } else {
        setWalletModalError(data.error || 'Giao dịch thất bại.');
      }
    } catch (err) {
      setWalletModalError('Lỗi kết nối máy chủ.');
    } finally {
      setWalletSubmitting(false);
    }
  };

  if (!profileData) return null;

  return (
    <div className="space-y-8 animate-fadeIn text-left text-xs">
      {/* Thẻ Tài chính (Financial Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Số dư ví */}
        <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-3xl p-6 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Số dư ví khả dụng</span>
          <div className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight mt-2">
            {formatMoney(profileData.walletBalance)}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => {
                setWalletAction('deposit');
                setWalletModalError('');
                setWalletModalSuccess('');
                setWalletAmount('');
                setWalletModalOpen(true);
              }}
              className="flex-1 text-[10px]"
            >
              Nạp tiền
            </Button>
            <Button
              onClick={() => {
                setWalletAction('withdraw');
                setWalletModalError('');
                setWalletModalSuccess('');
                setWalletAmount('');
                setWalletModalOpen(true);
              }}
              variant="outline"
              className="flex-1 text-[10px]"
            >
              Rút tiền
            </Button>
          </div>
        </div>

        {/* Tài khoản ngân hàng */}
        <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-3xl p-6 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tài khoản ngân hàng liên kết</span>
          <div className="text-2xl font-black text-neutral-400 tracking-tight mt-2">
            {formatMoney(profileData.balance)}
          </div>
          <p className="text-[9px] text-neutral-400 mt-2 font-medium">Mock Bank Card •••• 8888</p>
        </div>

        {/* Tiền tạm giữ (Escrow) */}
        <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-3xl p-6 shadow-sm relative group">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tiền tạm giữ (Escrow)</span>
            <div className="cursor-help text-neutral-400 hover:text-neutral-600 dark:hover:text-white relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
              </svg>
              <span className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 bg-neutral-950 text-white text-[9px] leading-relaxed p-2.5 rounded-xl shadow-xl border border-neutral-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-15">
                Đây là 10% tiền cọc khi tham gia đấu giá hoặc tiền thanh toán 90% đang giữ ký quỹ cho đến khi nhận hàng.
              </span>
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-500 tracking-tight mt-2">
            {formatMoney(profileData.frozenBalance)}
          </div>
        </div>
      </div>

      {/* Lịch sử Giao dịch */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Lịch sử giao dịch ví</h3>
        
        {!profileData.transactions || profileData.transactions.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs text-neutral-400">
            Chưa phát sinh giao dịch ví nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-semibold">
                  <th className="pb-3 pr-4">Thời gian</th>
                  <th className="pb-3 px-4">Loại giao dịch</th>
                  <th className="pb-3 pl-4 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850">
                {profileData.transactions.map((tx) => {
                  const txMeta = getTxDetails(tx.type);
                  const isAdd = tx.type === 'DEPOSIT' || tx.type === 'RELEASE_ESCROW';
                  return (
                    <tr key={tx.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20 transition-all duration-300">
                      <td className="py-3.5 pr-4 text-neutral-500 font-mono">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${txMeta.color}`}>
                          {txMeta.label}
                        </span>
                      </td>
                      <td className={`py-3.5 pl-4 text-right font-black ${isAdd ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                        {isAdd ? '+' : '-'}{formatMoney(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Wallet Action Modal */}
      <Modal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        title={walletAction === 'deposit' ? 'Nạp tiền vào ví Aura Bid' : 'Rút tiền về tài khoản ngân hàng'}
      >
        <div className="space-y-4">
          <p className="text-[10px] text-neutral-400 leading-relaxed">
            {walletAction === 'deposit'
              ? 'Giao dịch chuyển tiền từ tài khoản ngân hàng liên kết vào ví đặt cọc.'
              : 'Giao dịch chuyển tiền từ ví Aura Bid về lại tài khoản ngân hàng.'}
          </p>

          <form onSubmit={handleWalletSubmit} className="space-y-4">
            {walletModalError && <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{walletModalError}</div>}
            {walletModalSuccess && <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold">{walletModalSuccess}</div>}

            <Input
              id="wallet-amount-input"
              type="number"
              label="Số tiền (đ)"
              placeholder="Nhập số tiền giao dịch"
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
              required
            />

            {/* Quick Amount Suggestions */}
            <div className="flex flex-wrap gap-2 select-none">
              {[500000, 1000000, 5000000, 10000000, 50000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setWalletAmount(String(amt))}
                  className="border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-805 transition-all text-[10px] font-semibold cursor-pointer"
                >
                  +{amt.toLocaleString('vi-VN')}
                </button>
              ))}
            </div>

            <Button
              type="submit"
              loading={walletSubmitting}
              className="w-full text-center"
            >
              {walletAction === 'deposit' ? 'Xác nhận nạp tiền' : 'Xác nhận rút tiền'}
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
