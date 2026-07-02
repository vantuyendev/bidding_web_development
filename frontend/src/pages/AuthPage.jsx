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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        {/* Back to Home Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm font-medium mb-8 transition-colors group"
        >
          <span className="transform group-hover:-translate-x-1 transition-transform inline-block">←</span>
          Quay lại trang chủ
        </Link>

        {/* Auth Form Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 via-rose-400 to-rose-500 bg-clip-text text-transparent mb-2">
              {mode === 'login' ? 'Chào Mừng Trở Lại' : 'Tạo Tài Khoản Mới'}
            </h1>
            <p className="text-zinc-400 text-sm">
              {mode === 'login'
                ? 'Đăng nhập để tham gia đấu giá các vật phẩm độc bản'
                : 'Đăng ký để nhận 10,000,000 đ ví ảo và đấu giá ngay'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-400 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
              <span className="flex-shrink-0">✕</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-zinc-400">
                Địa chỉ Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten-dang-nhap@example.com"
                className="w-full px-5 py-3.5 bg-zinc-950 text-zinc-50 rounded-2xl border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-zinc-400">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-zinc-950 text-zinc-50 rounded-2xl border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-4 px-6 rounded-2xl font-bold text-base text-zinc-950 bg-gradient-to-r from-amber-400 via-amber-500 to-rose-500 hover:opacity-95 active:scale-[0.98] transition-all flex justify-center items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
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
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
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
