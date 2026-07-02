import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../api';

export default function CreateAuctionModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  // Categories list nạp từ API
  const [categories, setCategories] = useState([]);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startPriceRaw, setStartPriceRaw] = useState('');
  const [buyNowPriceRaw, setBuyNowPriceRaw] = useState('');
  const [endTime, setEndTime] = useState('');
  const [weight, setWeight] = useState('');
  const [provinceId, setProvinceId] = useState('HN');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // List of Vietnamese provinces for C2C logistics realism
  const provinces = [
    { id: 'HN', name: 'Hà Nội' },
    { id: 'HCM', name: 'TP. Hồ Chí Minh' },
    { id: 'DN', name: 'Đà Nẵng' },
    { id: 'HP', name: 'Hải Phòng' },
    { id: 'CT', name: 'Cần Thơ' },
    { id: 'BD', name: 'Bình Dương' },
    { id: 'DNai', name: 'Đồng Nai' },
    { id: 'KH', name: 'Khánh Hòa' },
    { id: 'QN', name: 'Quảng Ninh' },
  ];

  // Load categories and default time
  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const res = await fetch(getApiUrl('/api/categories'));
          const data = await res.json();
          if (data.success) {
            setCategories(data.data);
            if (data.data.length > 0) {
              setCategoryId(data.data[0].id);
            }
          }
        } catch (err) {
          console.error('Lỗi khi tải danh mục sản phẩm:', err);
        }
      };
      fetchCategories();

      // Default end time: 24 hours from now
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tzoffset = tomorrow.getTimezoneOffset() * 60000;
      const localISOTime = new Date(tomorrow.getTime() - tzoffset).toISOString().slice(0, 16);
      setEndTime(localISOTime);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Formatting helpers for price input
  const formatNumberString = (str) => {
    const clean = str.replace(/\D/g, '');
    if (!clean) return '';
    return Number(clean).toLocaleString('en-US');
  };

  const handlePriceChange = (value, setter) => {
    const formatted = formatNumberString(value);
    setter(formatted);
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result);
      // Tự động gán imageUrl bằng chuỗi base64 để mock hiển thị
      setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Strip commas to get numeric values
    const startPrice = Number(startPriceRaw.replace(/,/g, ''));
    const buyNowPrice = buyNowPriceRaw ? Number(buyNowPriceRaw.replace(/,/g, '')) : null;

    if (isNaN(startPrice) || startPrice <= 0) {
      setError('Vui lòng nhập giá khởi điểm hợp lệ.');
      setLoading(false);
      return;
    }

    if (buyNowPrice && buyNowPrice <= startPrice) {
      setError('Giá mua đứt phải lớn hơn giá khởi điểm.');
      setLoading(false);
      return;
    }

    const payload = {
      title,
      description,
      startPrice,
      buyNowPrice,
      categoryId,
      endTime: new Date(endTime).toISOString(),
      weight: weight ? Number(weight) : 0.5,
      provinceId,
      imageUrl: imageUrl || 'https://picsum.photos/seed/auction/600/400', // fallback image
    };

    try {
      const res = await fetch(getApiUrl('/api/products'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.data) {
        onClose();
        // Reset form states
        setTitle('');
        setDescription('');
        setStartPriceRaw('');
        setBuyNowPriceRaw('');
        setWeight('');
        setImageUrl('');
        setSelectedFile(null);
        setFilePreview(null);
        
        // Trigger a custom event to notify listeners (e.g. UserProfile)
        window.dispatchEvent(new Event('product-created'));
        // Redirect to detail page
        navigate(`/products/${data.data.id}`);
      } else {
        setError(data.error || 'Có lỗi xảy ra khi tạo bài đấu giá.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại mạng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay kính mờ */}
      <div
        className="absolute inset-0 bg-neutral-900/40 dark:bg-neutral-950/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      ></div>

      {/* Content Box */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl w-full max-w-3xl relative z-10 max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-fadeIn flex flex-col md:flex-row gap-8">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5.5 h-5.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* CỘT TRÁI: Kéo thả hình ảnh */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Hình ảnh vật phẩm</label>
          
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload-input').click()}
            className="w-full aspect-square md:flex-1 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center p-4 text-center hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-all duration-300 relative overflow-hidden select-none"
          >
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="space-y-2 flex flex-col items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-neutral-400"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span className="text-[10px] font-medium text-neutral-400">
                  Kéo thả hình ảnh vào đây, hoặc click để chọn
                </span>
              </div>
            )}
            <input
              id="file-upload-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Nhập URL ảnh dự phòng */}
          <div className="flex flex-col gap-1">
            <label htmlFor="url-input" className="text-[9px] font-semibold text-neutral-400">
              Hoặc dán địa chỉ URL ảnh:
            </label>
            <input
              id="url-input"
              type="text"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setFilePreview(e.target.value); // Sync preview
              }}
              placeholder="https://picsum.photos/600/400"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[10px] focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
            />
          </div>
        </div>

        {/* CỘT PHẢI: Form nhập liệu */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight border-b border-neutral-100 dark:border-neutral-800 pb-3">
            Thông tin đấu giá sản phẩm
          </h2>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Nhóm Thông tin chung */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title-input" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tên vật phẩm</label>
            <input
              id="title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Laptop Dell XPS 13 9310 Core i7"
              className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category selection */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category-select" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Danh mục</label>
              <select
                id="category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Logistics: Thành phố */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="province-select" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tỉnh/Thành phố</label>
              <select
                id="province-select"
                value={provinceId}
                onChange={(e) => setProvinceId(e.target.value)}
                className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
                required
              >
                {provinces.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="desc-input" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Mô tả chi tiết</label>
            <textarea
              id="desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tình trạng sử dụng, phụ kiện kèm theo..."
              className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs min-h-[70px] focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white resize-y"
              required
            />
          </div>

          {/* Nhóm Giá cả & Thời gian */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Price */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="start-price" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Giá khởi điểm (đ)</label>
              <input
                id="start-price"
                type="text"
                value={startPriceRaw}
                onChange={(e) => handlePriceChange(e.target.value, setStartPriceRaw)}
                placeholder="1,000,000"
                className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
                required
              />
            </div>

            {/* Buy Now Price */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="buy-now-price" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Giá mua đứt (đ) (Tùy chọn)</label>
              <input
                id="buy-now-price"
                type="text"
                value={buyNowPriceRaw}
                onChange={(e) => handlePriceChange(e.target.value, setBuyNowPriceRaw)}
                placeholder="Ví dụ: 15,000,000"
                className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
              />
            </div>

            {/* Weight */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="weight-input" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Cân nặng (kg)</label>
              <input
                id="weight-input"
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ví dụ: 1.5"
                className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
                required
              />
            </div>

            {/* End Time */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="end-time" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Thời gian kết thúc</label>
              <input
                id="end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 rounded-full text-xs font-semibold transition-all cursor-pointer select-none"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none ${
                loading
                  ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                  : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 shadow-sm'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></div>
                  Đang đăng...
                </div>
              ) : (
                'Xác nhận Đăng bán'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
