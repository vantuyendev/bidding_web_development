import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../api';

export default function CreateAuctionModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  // Categories list nạp từ API
  const [categories, setCategories] = useState([]);
  
  // Các trường biểu mẫu
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startPriceRaw, setStartPriceRaw] = useState('');
  const [buyNowPriceRaw, setBuyNowPriceRaw] = useState('');
  const [hasBuyNow, setHasBuyNow] = useState(false);
  const [reservePriceRaw, setReservePriceRaw] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('10');
  const [width, setWidth] = useState('10');
  const [height, setHeight] = useState('10');
  const [provinceId, setProvinceId] = useState('Hà Nội');
  const [districtId, setDistrictId] = useState('');
  const [isCustomDistrict, setIsCustomDistrict] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [attributes, setAttributes] = useState({});

  // Trạng thái Danh mục động và Thuộc tính tùy chỉnh
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAttributes, setNewCategoryAttributes] = useState([]);
  const [customAttributes, setCustomAttributes] = useState([]);

  // Các hàm hỗ trợ quản lý khóa thuộc tính danh mục mới
  const addNewCatAttr = () => {
    setNewCategoryAttributes(prev => [...prev, { name: '', type: 'TEXT', value: '' }]);
  };
  const removeNewCatAttr = (index) => {
    setNewCategoryAttributes(prev => prev.filter((_, idx) => idx !== index));
  };
  const updateNewCatAttr = (index, field, val) => {
    setNewCategoryAttributes(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: val } : item));
  };

  // Các hàm hỗ trợ cho thuộc tính tùy chỉnh trên danh mục hiện tại
  const addCustomAttr = () => {
    setCustomAttributes(prev => [...prev, { name: '', value: '' }]);
  };
  const removeCustomAttr = (index) => {
    setCustomAttributes(prev => prev.filter((_, idx) => idx !== index));
  };
  const updateCustomAttr = (index, field, val) => {
    setCustomAttributes(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: val } : item));
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Địa giới hành chính động cho Logistics C2C từ API Sandbox GHN
  const [provincesList, setProvincesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);

  const fetchDistrictsForProvince = async (provId) => {
    try {
      const res = await fetch(getApiUrl(`/api/shipping/districts?provinceId=${provId}`));
      const data = await res.json();
      if (data.success && data.data) {
        setDistrictsList(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách Quận/Huyện:', err);
    }
  };

  // Tải các danh mục, thời gian mặc định và danh sách tỉnh thành
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

      const fetchProvinces = async () => {
        try {
          const res = await fetch(getApiUrl('/api/shipping/provinces'));
          const data = await res.json();
          if (data.success && data.data) {
            setProvincesList(data.data);
            
            // Tìm và tự động chọn Hà Nội hoặc tỉnh đầu tiên làm mặc định
            const defaultProv = data.data.find(p => p.name.includes('Hà Nội')) || data.data[0];
            if (defaultProv) {
              setProvinceId(defaultProv.name);
              fetchDistrictsForProvince(defaultProv.id);
            }
          }
        } catch (err) {
          console.error('Lỗi khi tải danh sách Tỉnh/Thành:', err);
        }
      };

      fetchCategories();
      fetchProvinces();

      // Thời gian bắt đầu mặc định: bây giờ
      const now = new Date();
      const startTzoffset = now.getTimezoneOffset() * 60000;
      const startLocalISOTime = new Date(now.getTime() - startTzoffset).toISOString().slice(0, 16);
      setStartTime(startLocalISOTime);

      // Thời gian kết thúc mặc định: 24 giờ kể từ bây giờ
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tzoffset = tomorrow.getTimezoneOffset() * 60000;
      const localISOTime = new Date(tomorrow.getTime() - tzoffset).toISOString().slice(0, 16);
      setEndTime(localISOTime);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Các hàm hỗ trợ định dạng cho đầu vào giá cả
  const formatNumberString = (str) => {
    const clean = str.replace(/\D/g, '');
    if (!clean) return '';
    return Number(clean).toLocaleString('en-US');
  };

  const handlePriceChange = (value, setter) => {
    const formatted = formatNumberString(value);
    setter(formatted);
  };

  // Các hàm xử lý kéo & thả
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

    // Loại bỏ dấu phẩy để lấy giá trị số
    const startPrice = Number(startPriceRaw.replace(/,/g, ''));
    const buyNowPrice = (hasBuyNow && buyNowPriceRaw) ? Number(buyNowPriceRaw.replace(/,/g, '')) : null;
    const reservePrice = reservePriceRaw ? Number(reservePriceRaw.replace(/,/g, '')) : null;

    if (isNaN(startPrice) || startPrice <= 0) {
      setError('Vui lòng nhập giá khởi điểm hợp lệ.');
      setLoading(false);
      return;
    }

    if (hasBuyNow && (!buyNowPrice || buyNowPrice <= startPrice)) {
      setError('Giá mua đứt phải lớn hơn giá khởi điểm.');
      setLoading(false);
      return;
    }

    // Validate startTime và endTime
    const chosenStart = startTime ? new Date(startTime) : new Date();
    const chosenEnd = new Date(endTime);
    const maxEndTime = new Date(chosenStart.getTime() + 48 * 60 * 60 * 1000);
    if (chosenEnd <= chosenStart) {
      setError('Thời gian kết thúc phải sau thời điểm bắt đầu.');
      setLoading(false);
      return;
    }
    if (chosenEnd > maxEndTime) {
      setError('Thời gian kết thúc đấu giá không được vượt quá 48 giờ kể từ thời điểm bắt đầu.');
      setLoading(false);
      return;
    }

    if (reservePrice && reservePrice <= startPrice) {
      setError('Giá bảo lưu phải lớn hơn giá khởi điểm.');
      setLoading(false);
      return;
    }

    const attributesPayload = [];

    if (categoryId !== 'new') {
      // 1. Thuộc tính có sẵn của danh mục hiện tại
      Object.entries(attributes)
        .filter(([_, val]) => val !== undefined && val !== null && String(val).trim() !== '')
        .forEach(([keyId, val]) => {
          attributesPayload.push({
            attributeKeyId: keyId,
            value: String(val).trim()
          });
        });

      // 2. Thuộc tính tự do tự định nghĩa thêm
      customAttributes
        .filter(attr => attr.name && attr.name.trim() !== '' && attr.value && attr.value.trim() !== '')
        .forEach(attr => {
          attributesPayload.push({
            attributeKeyName: attr.name.trim(),
            value: attr.value.trim()
          });
        });
    } else {
      // 3. Thuộc tính ban đầu của danh mục mới tự tạo
      newCategoryAttributes
        .filter(attr => attr.name && attr.name.trim() !== '' && attr.value && attr.value.trim() !== '')
        .forEach(attr => {
          attributesPayload.push({
            attributeKeyName: attr.name.trim(),
            attributeKeyType: attr.type,
            value: attr.value.trim()
          });
        });
    }

    const payload = {
      title,
      description,
      startPrice,
      buyNowPrice,
      reservePrice,
      categoryId,
      newCategoryName: categoryId === 'new' ? newCategoryName : undefined,
      startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
      endTime: new Date(endTime).toISOString(),
      weight: weight ? Number(weight) : 0.5,
      length: Number(length) || 10,
      width: Number(width) || 10,
      height: Number(height) || 10,
      provinceId,
      districtId: districtId || 'Default District',
      imageUrl: imageUrl || 'https://picsum.photos/seed/auction/600/400', // fallback image
      attributes: attributesPayload
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
        // Đặt lại trạng thái biểu mẫu
        setTitle('');
        setDescription('');
        setStartPriceRaw('');
        setBuyNowPriceRaw('');
        setHasBuyNow(false);
        setReservePriceRaw('');
        setWeight('');
        setLength('10');
        setWidth('10');
        setHeight('10');
        setProvinceId('Hà Nội');
        setDistrictId('');
        setAttributes({});
        setNewCategoryName('');
        setNewCategoryAttributes([]);
        setCustomAttributes([]);
        setStartTime('');
        setImageUrl('');
        setSelectedFile(null);
        setFilePreview(null);
        
        // Kích hoạt một sự kiện tùy chỉnh để thông báo cho các listener (ví dụ: UserProfile)
        window.dispatchEvent(new Event('product-created'));
        // Chuyển hướng đến trang chi tiết
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
                setFilePreview(e.target.value); // Đồng bộ bản xem trước
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
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setAttributes({}); // Đặt lại thuộc tính khi chuyển đổi danh mục
                }}
                className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
                required
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="new">+ Tạo danh mục mới</option>
              </select>
            </div>

            {/* Logistics: Tỉnh / Thành phố */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="province-select" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tỉnh / Thành phố</label>
              <select
                id="province-select"
                value={provinceId}
                onChange={(e) => {
                  const provName = e.target.value;
                  setProvinceId(provName);
                  setDistrictId(''); // Đặt lại quận/huyện
                  setIsCustomDistrict(false);
                  
                  const provObj = provincesList.find(p => p.name === provName);
                  if (provObj) {
                    fetchDistrictsForProvince(provObj.id);
                  } else {
                    setDistrictsList([]);
                  }
                }}
                className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
                required
              >
                {provincesList.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Logistics: Quận / Huyện */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="district-select" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Quận / Huyện</label>
              <div className="flex gap-2">
                {!isCustomDistrict && districtsList.length > 0 ? (
                  <select
                    id="district-select"
                    value={districtId}
                    onChange={(e) => {
                      if (e.target.value === 'custom_input') {
                        setIsCustomDistrict(true);
                        setDistrictId('');
                      } else {
                        setDistrictId(e.target.value);
                      }
                    }}
                    className="flex-grow px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
                    required
                  >
                    <option value="">-- Chọn Quận / Huyện --</option>
                    {districtsList.map((dist) => (
                      <option key={dist.id} value={dist.name}>{dist.name}</option>
                    ))}
                    <option value="custom_input">Khác (Nhập thủ công)</option>
                  </select>
                ) : (
                  <div className="flex-1 flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Nhập Quận / Huyện của bạn"
                      value={districtId}
                      onChange={(e) => setDistrictId(e.target.value)}
                      className="flex-grow px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
                      required
                    />
                    {districtsList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setIsCustomDistrict(false); setDistrictId(''); }}
                        className="px-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[10px] hover:bg-neutral-50 font-bold transition-all text-neutral-500 cursor-pointer"
                      >
                        Quay lại
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sub-form: Tạo danh mục mới */}
            {categoryId === 'new' && (
              <div className="md:col-span-2 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/20 space-y-4 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tạo danh mục mới</p>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-neutral-500">Tên danh mục mới</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ví dụ: Thời trang nam, Sách, Đồ chơi..."
                    className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-semibold text-neutral-500 block">Các thông số đặc tả cho sản phẩm trong danh mục này</label>
                  {newCategoryAttributes.map((attr, idx) => (
                    <div key={idx} className="flex gap-2 items-center flex-wrap sm:flex-nowrap border border-neutral-100 dark:border-neutral-800 p-2.5 rounded-xl bg-white dark:bg-neutral-900">
                      <input
                        type="text"
                        value={attr.name}
                        onChange={(e) => updateNewCatAttr(idx, 'name', e.target.value)}
                        placeholder="Tên thông số (Ví dụ: Kích cỡ, Tác giả...)"
                        className="flex-grow px-2 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none text-neutral-900 dark:text-white"
                        required
                      />
                      <select
                        value={attr.type}
                        onChange={(e) => updateNewCatAttr(idx, 'type', e.target.value)}
                        className="px-2 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none text-neutral-900 dark:text-white"
                      >
                        <option value="TEXT">Văn bản (TEXT)</option>
                        <option value="NUMBER">Số (NUMBER)</option>
                        <option value="SELECT">Lọc chọn (SELECT)</option>
                      </select>
                      <input
                        type="text"
                        value={attr.value}
                        onChange={(e) => updateNewCatAttr(idx, 'value', e.target.value)}
                        placeholder="Giá trị sản phẩm"
                        className="flex-grow px-2 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none text-neutral-900 dark:text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeNewCatAttr(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addNewCatAttr}
                    className="text-[10px] font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-white flex items-center gap-1.5 cursor-pointer mt-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    + Thêm trường thông số mới
                  </button>
                </div>
              </div>
            )}

            {/* Form: Thông số danh mục có sẵn + Thuộc tính tự định nghĩa riêng */}
            {categoryId && categoryId !== 'new' && (
              <div className="md:col-span-2 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/20 space-y-4 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Thông số cấu hình sản phẩm</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categories.find(c => c.id === categoryId)?.attributeKeys?.map((key) => (
                    <div key={key.id} className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-neutral-500">{key.name}</label>
                      <input
                        type={key.type === 'NUMBER' ? 'number' : 'text'}
                        value={attributes[key.id] || ''}
                        onChange={(e) => setAttributes(prev => ({ ...prev, [key.id]: e.target.value }))}
                        placeholder={`Nhập ${key.name.toLowerCase()}`}
                        className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                      />
                    </div>
                  ))}
                  
                  {/* Các thông số tự do tự bổ sung */}
                  {customAttributes.map((attr, idx) => (
                    <div key={idx} className="flex gap-2 items-end sm:col-span-2 border-t border-neutral-100 dark:border-neutral-800/60 pt-3">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-neutral-500">Tên thông số tự chọn</label>
                        <input
                          type="text"
                          value={attr.name}
                          onChange={(e) => updateCustomAttr(idx, 'name', e.target.value)}
                          placeholder="Ví dụ: Tình trạng pin, Phụ kiện..."
                          className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                          required
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-neutral-500">Giá trị</label>
                        <input
                          type="text"
                          value={attr.value}
                          onChange={(e) => updateCustomAttr(idx, 'value', e.target.value)}
                          placeholder="Ví dụ: 99%, Cáp sạc..."
                          className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomAttr(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer mb-0.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addCustomAttr}
                  className="text-[10px] font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-white flex items-center gap-1.5 cursor-pointer mt-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  + Thêm thông số riêng (Custom attribute)
                </button>
              </div>
            )}
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

            {/* Buy Now Toggle & Price Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 mb-1">
                <input
                  id="toggle-buynow"
                  type="checkbox"
                  checked={hasBuyNow}
                  onChange={(e) => {
                    setHasBuyNow(e.target.checked);
                    if (!e.target.checked) setBuyNowPriceRaw('');
                  }}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-900 dark:focus:ring-white w-4 h-4 cursor-pointer"
                />
                <label htmlFor="toggle-buynow" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                  Kích hoạt giá mua đứt (Gõ búa 🔨)
                </label>
              </div>
              {hasBuyNow && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="buy-now-price" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Giá mua đứt (đ)</label>
                  <input
                    id="buy-now-price"
                    type="text"
                    value={buyNowPriceRaw}
                    onChange={(e) => handlePriceChange(e.target.value, setBuyNowPriceRaw)}
                    placeholder="Ví dụ: 15,000,000"
                    className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
                    required={hasBuyNow}
                  />
                </div>
              )}
            </div>

            {/* Reserve Price */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reserve-price" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Giá bảo lưu tối thiểu (đ) (Tùy chọn)</label>
              <input
                id="reserve-price"
                type="text"
                value={reservePriceRaw}
                onChange={(e) => handlePriceChange(e.target.value, setReservePriceRaw)}
                placeholder="Ví dụ: 8,000,000"
                className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
              />
            </div>

            {/* Weight */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="weight-input" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Cân nặng đóng gói (kg)</label>
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

            {/* Dimensions (Dài x Rộng x Cao) */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Kích thước đóng gói (cm) (Dài x Rộng x Cao)</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Dài"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-center text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 transition-all"
                  required
                />
                <input
                  type="number"
                  placeholder="Rộng"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-center text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 transition-all"
                  required
                />
                <input
                  type="number"
                  placeholder="Cao"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-center text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 transition-all"
                  required
                />
              </div>
            </div>

            {/* Start & End Time */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="start-time" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Thời gian bắt đầu</label>
                  <input
                    id="start-time"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-all text-neutral-900 dark:text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="end-time" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Thời gian kết thúc (Tối đa 48 giờ)</label>
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
