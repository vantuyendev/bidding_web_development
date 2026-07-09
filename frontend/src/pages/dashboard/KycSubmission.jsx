import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function KycSubmission(props) {
  const context = useOutletContext() || {};
  const profileData = props.profileData || context.profileData;
  const fetchFullProfile = props.fetchFullProfile || context.fetchFullProfile;
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardImageUrl, setIdCardImageUrl] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [kycSubmitError, setKycSubmitError] = useState('');
  const [kycSubmitSuccess, setKycSubmitSuccess] = useState('');
  const [kycSubmitting, setKycSubmitting] = useState(false);

  const handleSubmitKyc = async (e) => {
    e.preventDefault();
    setKycSubmitError('');
    setKycSubmitSuccess('');
    setKycSubmitting(true);

    if (!idCardNumber || !shopAddress) {
      setKycSubmitError('Vui lòng cung cấp số CCCD và địa chỉ cửa hàng.');
      setKycSubmitting(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/users/submit-kyc'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idCardNumber,
          idCardImageUrl: idCardImageUrl || 'https://picsum.photos/seed/kyc/400/300',
          shopAddress,
          phoneNumber
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setKycSubmitSuccess(data.message);
        await fetchFullProfile();
      } else {
        setKycSubmitError(data.error || 'Nộp hồ sơ thất bại.');
      }
    } catch (err) {
      setKycSubmitError('Lỗi kết nối máy chủ.');
    } finally {
      setKycSubmitting(false);
    }
  };

  if (!profileData) return null;

  return (
    <div className="space-y-6 animate-fadeIn text-left text-xs">
      <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">🛡️ Xác thực tài khoản người bán (KYC)</h3>

      {profileData.kycStatus === 'PENDING' ? (
        <div className="p-6 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs space-y-2">
          <p className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
            <span>⏳</span> Hồ sơ xác thực đang chờ phê duyệt
          </p>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Aura Bid đang tiến hành kiểm duyệt hồ sơ của bạn. Quá trình này thường mất từ 1 - 2 ngày làm việc. Chúng tôi sẽ gửi thông báo ngay khi hồ sơ được duyệt.
          </p>
        </div>
      ) : profileData.kycStatus === 'REJECTED' ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-xs space-y-2 mb-4">
          <p className="font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2">
            <span>⚠️</span> Hồ sơ xác thực đã bị từ chối
          </p>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            Vui lòng cung cấp lại thông tin cá nhân chính xác hơn để chúng tôi tiến hành kiểm duyệt lại.
          </p>
        </div>
      ) : null}

      {profileData.kycStatus !== 'PENDING' && (
        <form onSubmit={handleSubmitKyc} className="space-y-5 max-w-lg">
          {kycSubmitError && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{kycSubmitError}</div>}
          {kycSubmitSuccess && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold">{kycSubmitSuccess}</div>}

          <Input
            id="idCardNumber"
            label="Số Căn cước công dân (CCCD)"
            placeholder="Nhập 12 chữ số CCCD"
            value={idCardNumber}
            onChange={(e) => setIdCardNumber(e.target.value)}
            required
          />

          <Input
            id="phoneNumber"
            label="Số điện thoại liên hệ"
            placeholder="Nhập số điện thoại của cửa hàng"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />

          <Input
            id="shopAddress"
            label="Địa chỉ cửa hàng (Nơi lấy hàng trả hàng)"
            placeholder="Số nhà, đường, phường, quận, tỉnh/thành phố"
            value={shopAddress}
            onChange={(e) => setShopAddress(e.target.value)}
            required
          />

          <Input
            id="idCardImageUrl"
            label="Ảnh mặt trước CCCD"
            placeholder="Link hình ảnh CCCD hoặc tải ảnh lên"
            value={idCardImageUrl}
            onChange={(e) => setIdCardImageUrl(e.target.value)}
          />
          <p className="text-[10px] text-neutral-400 mt-1">Bạn có thể dán link ảnh hoặc để trống để hệ thống tự tạo ảnh giả lập.</p>

          <Button
            type="submit"
            loading={kycSubmitting}
            className="px-6 py-3 shadow-sm"
          >
            Nộp hồ sơ duyệt
          </Button>
        </form>
      )}
    </div>
  );
}
