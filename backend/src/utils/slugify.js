/**
 * Chuyển đổi chuỗi văn bản (đặc biệt là tiếng Việt) thành URL slug thân thiện.
 * @param {string} str Chuỗi gốc cần tạo slug
 * @returns {string} Chuỗi slug tương ứng
 */
export function slugify(str) {
  if (!str) return '';
  let slug = str.toLowerCase();
  
  // Ánh xạ các ký tự có dấu tiếng Việt sang không dấu
  const from = "áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ·/_,:;";
  const to   = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd------";
  
  for (let i = 0, l = from.length; i < l; i++) {
    slug = slug.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }
  
  return slug
    .replace(/[^a-z0-9 -]/g, '') // Loại bỏ các ký tự đặc biệt khác
    .replace(/\s+/g, '-')       // Thay thế khoảng trắng bằng dấu gạch ngang -
    .replace(/-+/g, '-')        // Thu gọn nhiều dấu gạch ngang liên tiếp thành 1
    .trim()
    .replace(/^-+|-+$/g, '');   // Cắt bỏ các dấu gạch ngang thừa ở đầu/cuối
}
