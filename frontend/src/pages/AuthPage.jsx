import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


export default function AuthPage({ defaultMode = 'login' }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(defaultMode); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(email);
      } else {
        result = await register(email, password);
      }

      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center p-6 relative select-none">
      <div className="max-w-md w-full relative">
        {/* Back to Home Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 text-sm font-bold mb-8 transition-colors group"
        >
          <span className="transform transition-transform inline-block">←</span>
          Quay lại trang chủ
        </Link>

        {/* Auth Form Card */}
        <div className="bg-white border border-neutral-200 p-8 rounded-md shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-neutral-900 mb-2">
              {mode === 'login' ? 'Chào Mừng Trở Lại' : 'Tạo Tài Khoản Mới'}
            </h1>
            <p className="text-neutral-500 text-sm">
              {mode === 'login'
                ? 'Đăng nhập để tham gia đấu giá các vật phẩm độc bản'
                : 'Đăng ký để nhận 10,000,000 đ ví ảo và đấu giá ngay'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-600 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
              <span className="flex-shrink-0">✕</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-bold text-neutral-500">
                Địa chỉ Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten-dang-nhap@example.com"
                className="w-full px-4 py-3 bg-neutral-50 text-neutral-900 rounded-md border border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-colors"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-bold text-neutral-500">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-neutral-50 text-neutral-900 rounded-md border border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-6 rounded-md font-bold text-base text-white bg-neutral-900 hover:bg-neutral-800 transition-colors flex justify-center items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang xử lý...
                </>
              ) : mode === 'login' ? (
                'Đăng Nhập'
              ) : (
                'Đăng Ký Ngay'
              )}
            </button>
          </form>

          {/* Toggle Link */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-xs font-bold text-neutral-900 hover:underline transition-colors cursor-pointer"
            >
              {mode === 'login'
                ? 'Chưa có tài khoản? Đăng ký tại đây'
                : 'Đã có tài khoản? Đăng nhập tại đây'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
