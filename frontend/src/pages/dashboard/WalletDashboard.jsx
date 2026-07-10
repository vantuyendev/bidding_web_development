import React, { useState, useEffect } from 'react';
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
  const [walletSubmitting, setWalletSubmitting] = useState(false);

  // Bank Info for Withdrawal
  const [withdrawBankName, setWithdrawBankName] = useState('');
  const [withdrawBankAccount, setWithdrawBankAccount] = useState('');
  const [withdrawBankOwner, setWithdrawBankOwner] = useState('');

  // Deposit Response details to show instructions
  const [depositInstructions, setDepositInstructions] = useState(null);

  // Wallet Requests history state
  const [walletRequests, setWalletRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const formatMoney = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ';
  
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const fetchWalletRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/users/wallet-requests'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setWalletRequests(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử yêu cầu ví:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletRequests();
  }, [profileData]);

  const handleWalletSubmit = async (e) => {
    e.preventDefault();
    setWalletModalError('');
    setWalletSubmitting(true);

    const amountNum = parseFloat(walletAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWalletModalError('Số tiền phải lớn hơn 0.');
      setWalletSubmitting(false);
      return;
    }

    let payload = { amount: amountNum };
    let endpoint = '/api/users/deposit';

    if (walletAction === 'withdraw') {
      endpoint = '/api/users/withdraw';
      if (!withdrawBankName.trim() || !withdrawBankAccount.trim() || !withdrawBankOwner.trim()) {
        setWalletModalError('Vui lòng điền đầy đủ thông tin ngân hàng nhận tiền.');
        setWalletSubmitting(false);
        return;
      }
      payload = {
        amount: amountNum,
        bankName: withdrawBankName.trim(),
        bankAccount: withdrawBankAccount.trim(),
        bankOwner: withdrawBankOwner.trim()
      };
    }

    try {
      const res = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        if (walletAction === 'deposit') {
          // Hiển thị thông tin chuyển khoản thủ công
          setDepositInstructions(data.data);
        } else {
          setWalletModalOpen(false);
          alert(data.message);
        }
        setWalletAmount('');
        setWithdrawBankName('');
        setWithdrawBankAccount('');
        setWithdrawBankOwner('');
        fetchWalletRequests();
        await fetchFullProfile();
        await refreshUser();
      } else {
        setWalletModalError(data.error || 'Yêu cầu giao dịch thất bại.');
      }
    } catch (err) {
      setWalletModalError('Lỗi kết nối máy chủ.');
    } finally {
      setWalletSubmitting(false);
    }
  };

  const getRequestStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'APPROVED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  const getRequestStatusText = (status) => {
    if (status === 'PENDING') return 'Chờ duyệt';
    if (status === 'APPROVED') return 'Đã duyệt';
    return 'Bị từ chối';
  };

  if (!profileData) return null;

  return (
    <div className="space-y-8 animate-fadeIn text-left text-xs">
      
      {/* Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wallet Balance */}
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
                setWalletAmount('');
                setDepositInstructions(null);
                setWalletModalOpen(true);
              }}
              className="flex-1 text-[10px] cursor-pointer"
            >
              Nạp tiền (Tạo yêu cầu)
            </Button>
            <Button
              onClick={() => {
                setWalletAction('withdraw');
                setWalletModalError('');
                setWalletAmount('');
                setDepositInstructions(null);
                setWalletModalOpen(true);
              }}
              variant="outline"
              className="flex-1 text-[10px] cursor-pointer"
            >
              Rút tiền (Tạo yêu cầu)
            </Button>
          </div>
        </div>

        {/* Tiền tạm giữ (Escrow) */}
        <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-3xl p-6 shadow-sm relative group">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tiền tạm giữ đấu giá (Escrow)</span>
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
                Tiền tạm giữ (10% đặt cọc cho các phiên đấu giá bạn tham gia, hoặc 90% số tiền còn lại sau khi thắng đang trong thời gian giao nhận hàng).
              </span>
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-500 tracking-tight mt-2">
            {formatMoney(profileData.frozenBalance)}
          </div>
        </div>
      </div>

      {/* Wallet Requests History */}
      <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">📝 Lịch sử yêu cầu Nạp / Rút ví</h3>
        
        {requestsLoading ? (
          <div className="text-center py-6 text-neutral-400">Đang tải lịch sử yêu cầu...</div>
        ) : walletRequests.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-400">
            Chưa có yêu cầu nạp hoặc rút ví nào được tạo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-semibold">
                  <th className="pb-3 pr-4">Thời gian</th>
                  <th className="pb-3 px-4">Loại yêu cầu</th>
                  <th className="pb-3 px-4 text-right">Số tiền</th>
                  <th className="pb-3 px-4 text-center">Trạng thái</th>
                  <th className="pb-3 pl-4">Ghi chú đối soát / Phản hồi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850">
                {walletRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20 transition-all duration-300">
                    <td className="py-3.5 pr-4 text-neutral-500 font-mono">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold">
                          {req.type === 'DEPOSIT' ? '📥 Nạp tiền' : '📤 Rút tiền'}
                        </span>
                        {req.type === 'DEPOSIT' && (
                          <span className="font-mono text-[9px] text-neutral-400">Ref: {req.transferNote}</span>
                        )}
                        {req.type === 'WITHDRAW' && (
                          <span className="text-[9px] text-neutral-400">{req.bankName} - {req.bankAccount}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-neutral-800 dark:text-neutral-200">
                      {formatMoney(req.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getRequestStatusBadge(req.status)}`}>
                        {getRequestStatusText(req.status)}
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 text-neutral-500 max-w-xs truncate">
                      {req.adminNote || (req.status === 'PENDING' ? 'Đang chờ Admin xử lý giao dịch...' : 'N/A')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Wallet Action Modal */}
      <Modal
        isOpen={walletModalOpen}
        onClose={() => { setWalletModalOpen(false); setDepositInstructions(null); }}
        title={walletAction === 'deposit' ? 'Tạo yêu cầu nạp tiền' : 'Tạo yêu cầu rút tiền'}
      >
        <div className="space-y-4 text-left">
          {depositInstructions ? (
            /* Bước 2: Hiển thị thông tin chuyển khoản thủ công cho User */
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20">
                <p className="font-bold text-xs">✓ Tạo yêu cầu thành công!</p>
                <p className="text-[10px] mt-1 leading-relaxed">
                  Vui lòng thực hiện chuyển khoản ngân hàng theo thông tin bên dưới. Giao dịch sẽ được cộng vào ví của bạn ngay khi Admin xác thực đã nhận tiền.
                </p>
              </div>

              <div className="space-y-3 bg-neutral-50 dark:bg-neutral-950 p-4.5 rounded-2xl border border-neutral-200/50 dark:border-neutral-850">
                <h5 className="font-bold text-neutral-900 dark:text-white uppercase text-[10px] tracking-wider mb-2">Thông tin tài khoản Admin</h5>
                <div className="space-y-2 text-xs text-neutral-700 dark:text-neutral-300">
                  <p>Ngân hàng nhận: <span className="font-bold text-neutral-900 dark:text-white">{depositInstructions.adminBankInfo.bankName}</span></p>
                  <p>Số tài khoản: <span className="font-mono font-bold text-neutral-900 dark:text-white">{depositInstructions.adminBankInfo.bankAccount}</span></p>
                  <p>Chủ tài khoản: <span className="font-bold text-neutral-900 dark:text-white">{depositInstructions.adminBankInfo.bankOwner}</span></p>
                  <p>Số tiền chuyển: <span className="font-bold text-amber-600 dark:text-amber-400">{formatMoney(depositInstructions.amount)}</span></p>
                  
                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                    <p className="text-neutral-400 text-[10px] font-bold uppercase">Nội dung chuyển khoản (BẮT BUỘC GHI ĐÚNG):</p>
                    <p className="font-mono text-sm font-extrabold text-amber-600 dark:text-amber-400 tracking-wider mt-1 select-all bg-amber-500/5 p-2 rounded-lg text-center border border-dashed border-amber-500/30">
                      {depositInstructions.transferNote}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => { setWalletModalOpen(false); setDepositInstructions(null); }}
                className="w-full text-center py-2.5 rounded-xl font-bold cursor-pointer"
              >
                Đã hoàn tất chuyển khoản
              </Button>
            </div>
          ) : (
            /* Bước 1: Nhập thông tin số tiền và thông tin nhận */
            <form onSubmit={handleWalletSubmit} className="space-y-4">
              {walletModalError && <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{walletModalError}</div>}

              <Input
                id="wallet-amount-input"
                type="number"
                label={`Số tiền cần ${walletAction === 'deposit' ? 'nạp' : 'rút'} (đ)`}
                placeholder="Ví dụ: 1000000"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                required
              />

              {walletAction === 'withdraw' && (
                <div className="space-y-3.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="font-bold text-[10px] text-neutral-400 uppercase tracking-wider">Thông tin tài khoản nhận tiền</p>
                  <Input 
                    id="withdraw-bank-name"
                    type="text"
                    label="Tên Ngân hàng"
                    placeholder="Ví dụ: Vietcombank, Techcombank..."
                    value={withdrawBankName}
                    onChange={(e) => setWithdrawBankName(e.target.value)}
                    required
                  />
                  <Input 
                    id="withdraw-bank-account"
                    type="text"
                    label="Số tài khoản"
                    placeholder="Nhập số tài khoản"
                    value={withdrawBankAccount}
                    onChange={(e) => setWithdrawBankAccount(e.target.value)}
                    required
                  />
                  <Input 
                    id="withdraw-bank-owner"
                    type="text"
                    label="Họ và tên chủ tài khoản"
                    placeholder="Ví dụ: NGUYEN VAN A"
                    value={withdrawBankOwner}
                    onChange={(e) => setWithdrawBankOwner(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Quick Amount Suggestions */}
              {walletAction === 'deposit' && (
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
              )}

              <Button
                type="submit"
                loading={walletSubmitting}
                className="w-full text-center py-2.5 rounded-xl font-bold cursor-pointer"
              >
                {walletAction === 'deposit' ? 'Tạo yêu cầu nạp tiền' : 'Gửi yêu cầu rút tiền'}
              </Button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
