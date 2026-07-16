import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';

export default function AdminSettings() {
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankOwner, setBankOwner] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [depositInstructions, setDepositInstructions] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/admin/bank-settings'), {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setBankName(data.data.bankName || '');
        setBankAccount(data.data.bankAccount || '');
        setBankOwner(data.data.bankOwner || '');
        setQrImageUrl(data.data.qrImageUrl || '');
        setDepositInstructions(data.data.depositInstructions || '');
      } else {
        setError(data.error || 'Lỗi khi tải cấu hình nạp tiền.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(getApiUrl('/api/admin/bank-settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName,
          bankAccount,
          bankOwner,
          qrImageUrl,
          depositInstructions
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Cập nhật cấu hình chuyển khoản thành công!');
        fetchSettings();
      } else {
        setError(data.error || 'Không thể cập nhật cấu hình.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-neutral-400 text-xs">
        Đang tải cấu hình hệ thống...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-left text-xs">
      <div>
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">⚙️ Cấu hình nạp tiền (Bank Transfer)</h3>
        <p className="text-neutral-500 mt-1">
          Chỉnh sửa thông tin tài khoản ngân hàng nhận tiền, nội dung hướng dẫn chuyển khoản và ảnh mã QR hiển thị cho người dùng khi nạp tiền vào ví.
        </p>
      </div>

      {error && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold">{success}</div>}

      <div className="max-w-2xl border border-neutral-200/50 dark:border-neutral-800/80 rounded-3xl bg-white dark:bg-neutral-900 p-6 md:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="bankName" className="block font-bold mb-2 text-neutral-700 dark:text-neutral-300">
                Ngân hàng nhận
              </label>
              <input
                id="bankName"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ví dụ: Vietcombank, Techcombank..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="bankAccount" className="block font-bold mb-2 text-neutral-700 dark:text-neutral-300">
                Số tài khoản nhận
              </label>
              <input
                id="bankAccount"
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Nhập số tài khoản ngân hàng"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="bankOwner" className="block font-bold mb-2 text-neutral-700 dark:text-neutral-300">
              Chủ tài khoản nhận (Tên đầy đủ)
            </label>
            <input
              id="bankOwner"
              type="text"
              value={bankOwner}
              onChange={(e) => setBankOwner(e.target.value)}
              placeholder="Ví dụ: NGUYEN VAN A"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="qrImageUrl" className="block font-bold mb-2 text-neutral-700 dark:text-neutral-300">
              Đường dẫn ảnh QR Code của bạn (Tùy chọn)
            </label>
            <input
              id="qrImageUrl"
              type="url"
              value={qrImageUrl}
              onChange={(e) => setQrImageUrl(e.target.value)}
              placeholder="https://example.com/my-qr-code.png"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
            />
            <p className="text-[10px] text-neutral-400 mt-1.5 leading-relaxed">
              Nếu để trống, hệ thống sẽ tự động tạo mã QR chuyển khoản động qua dịch vụ VietQR dựa trên Tên ngân hàng, Số tài khoản, Số tiền nạp và Nội dung chuyển khoản của người dùng.
            </p>
          </div>

          <div>
            <label htmlFor="depositInstructions" className="block font-bold mb-2 text-neutral-700 dark:text-neutral-300">
              Hướng dẫn nạp tiền hiển thị cho User
            </label>
            <textarea
              id="depositInstructions"
              value={depositInstructions}
              onChange={(e) => setDepositInstructions(e.target.value)}
              placeholder="Nhập nội dung hướng dẫn chuyển khoản..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors min-h-[100px] leading-relaxed"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl font-bold cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
            >
              {submitting ? 'Đang lưu cấu hình...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
