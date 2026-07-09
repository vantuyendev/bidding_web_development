import React, { useState } from 'react';
import { getApiUrl } from '../api';

export default function ReviewModal({ isOpen, onClose, productId, productName, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Vui lòng chọn số sao đánh giá (1-5).');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(getApiUrl('/api/reviews'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating,
          comment,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(data.error || 'Có lỗi xảy ra khi gửi đánh giá.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur overlay */}
      <div 
        className="absolute inset-0 bg-neutral-950/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* Modal Box */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/80 rounded-3xl p-6 shadow-2xl max-w-md w-full relative z-10 animate-fadeIn">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer text-lg font-bold"
        >
          ✕
        </button>

        <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight mb-1 select-none">
          Đánh giá đối tác
        </h3>
        <p className="text-xs text-neutral-400 mb-6 truncate select-none">
          Sản phẩm: {productName}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Interactive Stars Row */}
          <div className="flex flex-col items-center gap-2 select-none">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Chọn mức độ hài lòng</span>
            <div 
              className="flex items-center gap-2"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    className="p-1 hover:scale-125 transition-transform duration-150 cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className={`w-8 h-8 transition-colors duration-250 ${
                        isLit 
                          ? 'fill-amber-500 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' 
                          : 'fill-transparent text-neutral-300 dark:text-neutral-700'
                      }`}
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499c.15-.427.77-.427.92 0l1.562 4.453a1.5 1.5 0 0 0 1.282 1.0125l4.673.344c.456.033.638.595.297.905l-3.513 3.19a1.5 1.5 0 0 0-.467 1.437l1.009 4.604c.1.455-.38.804-.766.568L12.44 19.82a1.5 1.5 0 0 0-1.48 0l-3.957 2.186c-.386.236-.866-.113-.766-.568l1.009-4.604a1.5 1.5 0 0 0-.467-1.437L3.716 11.213c-.341-.31-.16-.872.297-.905l4.673-.344a1.5 1.5 0 0 0 1.282-1.0125L11.48 3.5Z"
                      />
                    </svg>
                  </button>
                );
              })}
            </div>
            {rating > 0 && (
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                {rating === 1 && 'Rất tệ 😡'}
                {rating === 2 && 'Tệ 😞'}
                {rating === 3 && 'Bình thường 😐'}
                {rating === 4 && 'Tốt 🙂'}
                {rating === 5 && 'Tuyệt vời! 😍'}
              </span>
            )}
          </div>

          {/* Thin textarea for comment */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Nhận xét của bạn</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhập cảm nhận của bạn về trải nghiệm giao dịch này..."
              className="w-full min-h-[90px] bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder-neutral-400 resize-none"
              maxLength={300}
            />
            <div className="text-right text-[9px] text-neutral-400">
              {comment.length}/300 ký tự
            </div>
          </div>

          {/* Buttons Group */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 rounded-full py-2.5 text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 rounded-full py-2.5 text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {submitting ? 'Đang gửi...' : 'Gửi Đánh giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
