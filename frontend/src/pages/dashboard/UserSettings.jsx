import React, { useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getApiUrl } from '../../api';

export default function UserSettings(props) {
  const context = useOutletContext() || {};
  const profileData = props.profileData || context.profileData;
  const fetchFullProfile = props.fetchFullProfile || context.fetchFullProfile;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }
  const fileInputRef = useRef(null);

  if (!profileData) return null;

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleEditClick = () => {
    setName(profileData.name || '');
    setAvatarUrl(profileData.avatarUrl || '');
    setAvatarPreview(profileData.avatarUrl || null);
    setAvatarBase64(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setAvatarPreview(null);
    setAvatarBase64(null);
  };

  // Khi chọn file ảnh từ máy tính — chuyển sang base64 để preview và gửi lên server
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Vui lòng chọn file ảnh hợp lệ (JPG, PNG, WEBP...)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Ảnh không được vượt quá 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target.result);
      setAvatarBase64(ev.target.result); // data:image/... base64
      setAvatarUrl(''); // xóa URL thủ công nếu đang dùng
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('error', 'Tên hiển thị không được để trống.');
      return;
    }

    setSaving(true);
    try {
      const payload = { name: trimmedName };

      if (avatarBase64) {
        // Gửi ảnh base64 — backend lưu trực tiếp như URL (data URI)
        payload.avatarUrl = avatarBase64;
      } else {
        payload.avatarUrl = avatarUrl.trim();
      }

      const res = await fetch(getApiUrl('/api/users/profile'), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', 'Cập nhật hồ sơ thành công! 🎉');
        setIsEditing(false);
        setAvatarPreview(null);
        setAvatarBase64(null);
        if (fetchFullProfile) await fetchFullProfile();
      } else {
        showToast('error', data.error || 'Không thể cập nhật. Vui lòng thử lại.');
      }
    } catch (err) {
      showToast('error', 'Lỗi kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  // Ảnh hiển thị hiện tại: preview (khi đang sửa) > avatarUrl từ DB
  const currentAvatar = isEditing ? (avatarPreview || avatarUrl) : profileData.avatarUrl;
  const displayName = profileData.name || profileData.email?.split('@')[0] || 'Người dùng';

  return (
    <div className="space-y-8 animate-fadeIn text-left text-xs">

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.message}
        </div>
      )}

      {/* Profile Header Card */}
      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">

        {/* Avatar */}
        <div className="relative group">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Ảnh đại diện"
              className="w-20 h-20 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-750 flex items-center justify-center ring-2 ring-neutral-200 dark:ring-neutral-850 shadow-sm select-none">
              <span className="text-3xl font-black text-neutral-600 dark:text-neutral-300 uppercase">
                {displayName[0]}
              </span>
            </div>
          )}

          {/* Overlay khi đang chỉnh sửa */}
          {isEditing && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 w-20 h-20 rounded-full bg-black/50 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
                <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
              </svg>
              <span className="text-[9px] text-white font-bold">Thay ảnh</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* User metadata */}
        <div className="text-center sm:text-left space-y-1.5 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {displayName}
            </h2>
            {profileData.isVerifiedSeller ? (
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                ✓ Người bán Xác thực
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200/30 dark:border-neutral-700/30">
                Khách hàng đấu giá
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400">{profileData.email}</p>
          <p className="text-[10px] text-neutral-400 font-mono">ID: {profileData.id}</p>
        </div>

        {/* Nút Chỉnh sửa */}
        {!isEditing && (
          <button
            onClick={handleEditClick}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-80 transition-opacity shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
            </svg>
            Chỉnh sửa hồ sơ
          </button>
        )}
      </div>

      {/* Form chỉnh sửa */}
      {isEditing && (
        <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Chỉnh sửa hồ sơ cá nhân</h3>

          {/* Tên hiển thị */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Tên hiển thị
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên hiển thị..."
              maxLength={64}
              className="w-full px-4 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 dark:focus:ring-white/20 transition-all"
            />
            <p className="text-[10px] text-neutral-400">{name.length}/64 ký tự</p>
          </div>

          {/* Ảnh đại diện */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Ảnh đại diện
            </label>

            {/* Upload từ máy tính */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-all text-xs font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
              </svg>
              {avatarBase64 ? 'Đã chọn ảnh — click để chọn lại' : 'Tải ảnh lên từ máy tính (tối đa 5MB)'}
            </button>

            <div className="flex items-center gap-2 text-neutral-300 dark:text-neutral-600">
              <div className="flex-1 h-px bg-current" />
              <span className="text-[10px]">hoặc dán URL ảnh</span>
              <div className="flex-1 h-px bg-current" />
            </div>

            <input
              type="url"
              value={avatarBase64 ? '' : avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setAvatarBase64(null);
                setAvatarPreview(e.target.value || null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={!!avatarBase64}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-4 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 dark:focus:ring-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            />

            {/* Preview ảnh */}
            {avatarPreview && (
              <div className="flex items-center gap-3 mt-1">
                <img
                  src={avatarPreview}
                  alt="Preview"
                  className="w-12 h-12 rounded-full object-cover border-2 border-neutral-200 dark:border-neutral-700"
                  onError={() => {
                    setAvatarPreview(null);
                    showToast('error', 'Không thể tải ảnh từ URL này.');
                  }}
                />
                <div className="text-[10px] text-neutral-400">
                  <div className="font-semibold text-neutral-600 dark:text-neutral-300">Preview ảnh đại diện</div>
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarPreview(null);
                      setAvatarBase64(null);
                      setAvatarUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-400 hover:text-red-500 font-semibold mt-0.5"
                  >
                    Xoá ảnh
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {saving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Đang lưu...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  Lưu thay đổi
                </>
              )}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Rating score */}
        <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Điểm Tín nhiệm</span>
            <div className="text-xl font-black text-neutral-900 dark:text-white flex items-baseline gap-1 mt-0.5">
              {Number(profileData.reputationScore || 0).toFixed(1)}
              <span className="text-xs text-neutral-400 font-bold">/ 5.0</span>
            </div>
          </div>
        </div>

        {/* Successful Transactions */}
        <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-100 dark:border-neutral-850 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Giao dịch Thành công</span>
            <div className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">
              {profileData._count?.soldProducts || 0}
              <span className="text-xs text-neutral-400 font-bold ml-1">đơn hàng</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
