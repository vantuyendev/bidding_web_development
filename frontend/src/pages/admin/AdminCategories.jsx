import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../api';
import Button from '../../components/ui/Button';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Trạng thái biểu mẫu
  const [newCategoryName, setNewCategoryName] = useState('');
  const [attributes, setAttributes] = useState([]); // [{ name: '', type: 'TEXT' }]
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/categories'));
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        setError(data.error || 'Lỗi khi tải danh sách danh mục.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddAttribute = () => {
    setAttributes([...attributes, { name: '', type: 'TEXT' }]);
  };

  const handleRemoveAttribute = (idx) => {
    setAttributes(attributes.filter((_, i) => i !== idx));
  };

  const handleAttributeChange = (idx, field, value) => {
    const updated = [...attributes];
    updated[idx][field] = value;
    setAttributes(updated);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    // Xác thực thuộc tính: đảm bảo tất cả các thuộc tính đã định nghĩa đều có tên
    const filteredAttributes = attributes.filter(attr => attr.name && attr.name.trim() !== "");

    try {
      const res = await fetch(getApiUrl('/api/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          attributeKeys: filteredAttributes
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Tạo danh mục "${newCategoryName}" thành công!`);
        setNewCategoryName('');
        setAttributes([]);
        fetchCategories();
      } else {
        setError(data.error || 'Không thể tạo danh mục mới.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    const confirmMsg = `Bạn có chắc chắn muốn xóa danh mục "${catName}"?\nLưu ý: Hành động này sẽ xóa tất cả sản phẩm thuộc danh mục này!`;
    if (!window.confirm(confirmMsg)) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(getApiUrl(`/api/categories/${catId}`), {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || `Đã xóa danh mục "${catName}".`);
        fetchCategories();
      } else {
        setError(data.error || 'Xóa danh mục thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-left text-xs">
      <div>
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">📦 Quản lý Danh mục & Thuộc tính động</h3>
        <p className="text-neutral-500 mt-1">
          Thiết lập cấu trúc danh mục sản phẩm và định nghĩa các thuộc tính đi kèm khi đăng sản phẩm.
        </p>
      </div>

      {error && <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl font-bold">{error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left / Center Panel: Category List */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="font-bold text-neutral-800 dark:text-neutral-200 text-xs uppercase tracking-wider mb-2">
            Danh mục hiện có ({categories.length})
          </h4>

          {loading ? (
            <div className="text-center py-10 text-neutral-400">Đang tải danh mục...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-400">
              Chưa có danh mục nào được định nghĩa.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {categories.map((cat) => (
                <div 
                  key={cat.id} 
                  className="p-5 border border-neutral-200/50 dark:border-neutral-800/80 rounded-2xl bg-white dark:bg-neutral-900 flex justify-between items-start hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-sm"
                >
                  <div className="space-y-2 flex-grow">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 dark:text-white text-sm">
                        {cat.name}
                      </span>
                      <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-mono px-2 py-0.5 rounded-full">
                        /{cat.slug}
                      </span>
                    </div>
                    
                    {cat.attributeKeys && cat.attributeKeys.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-neutral-400 font-semibold text-[10px] uppercase tracking-wider">
                          Thuộc tính đi kèm:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {cat.attributeKeys.map((attr) => (
                            <span 
                              key={attr.id}
                              className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold rounded-lg text-[10px]"
                            >
                              {attr.name} ({attr.type})
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-neutral-400 italic">Không có thuộc tính động.</p>
                    )}
                  </div>

                  <button 
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer font-bold"
                    title="Xóa danh mục"
                  >
                    🗑️ Xóa
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Create New Category Form */}
        <div className="p-6 border border-neutral-200/60 dark:border-neutral-800/80 rounded-3xl bg-neutral-50/50 dark:bg-neutral-900/30 self-start">
          <h4 className="font-bold text-neutral-900 dark:text-white mb-4 uppercase tracking-wider text-xs">
            ➕ Thêm danh mục mới
          </h4>
          
          <form onSubmit={handleCreateCategory} className="space-y-5">
            <div>
              <label className="block text-neutral-500 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                Tên danh mục
              </label>
              <input 
                type="text" 
                required
                placeholder="Ví dụ: Đồ công nghệ, Đồ cổ..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full p-3 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 font-semibold focus:outline-none focus:border-amber-500 text-neutral-850 dark:text-neutral-200 text-xs"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  Thuộc tính sản phẩm
                </label>
                <button 
                  type="button"
                  onClick={handleAddAttribute}
                  className="text-amber-600 hover:text-amber-700 font-bold cursor-pointer text-[10px]"
                >
                  ➕ Thêm trường
                </button>
              </div>

              {attributes.length === 0 ? (
                <p className="text-neutral-400 italic text-[11px] py-2">
                  Chưa định nghĩa thuộc tính. Danh mục sẽ chỉ có các trường mặc định.
                </p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {attributes.map((attr, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-white dark:bg-neutral-950 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <input 
                        type="text" 
                        required
                        placeholder="Tên trường (ví dụ: RAM)"
                        value={attr.name}
                        onChange={(e) => handleAttributeChange(idx, 'name', e.target.value)}
                        className="flex-grow p-1.5 border border-neutral-200 dark:border-neutral-850 rounded-lg bg-transparent focus:outline-none focus:border-amber-500 text-xs"
                      />
                      <select 
                        value={attr.type}
                        onChange={(e) => handleAttributeChange(idx, 'type', e.target.value)}
                        className="p-1.5 border border-neutral-200 dark:border-neutral-850 rounded-lg bg-transparent focus:outline-none focus:border-amber-500 text-xs"
                      >
                        <option value="TEXT">Chữ (TEXT)</option>
                        <option value="NUMBER">Số (NUMBER)</option>
                        <option value="SELECT">Tùy chọn (SELECT)</option>
                      </select>
                      <button 
                        type="button"
                        onClick={() => handleRemoveAttribute(idx)}
                        className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer px-1.5"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button 
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {submitting ? 'Đang tạo...' : 'Tạo danh mục'}
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
