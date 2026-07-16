import express from 'express';
import { getProductDetail, getProducts, getCategoryFilters, searchProducts, createProduct, getProductBids, updateProduct, getSellerProducts, getProductQna, createProductQna } from '../controllers/productController.js';
import { requireAuth, requireNotBanned } from '../middlewares/authMiddleware.js';
import { streamProductEvents } from '../controllers/streamController.js';

const router = express.Router();

// GET /api/products - Lấy tất cả sản phẩm
router.get('/', getProducts);

// POST /api/products - Tạo sản phẩm mới (Chỉ Người bán)
router.post('/', requireAuth, requireNotBanned, createProduct);

// GET /api/products/categories/:categorySlug/filters - Lấy bộ lọc động cho một danh mục
router.get('/categories/:categorySlug/filters', getCategoryFilters);

// GET /api/products/filters - Lấy bộ lọc động qua tham số truy vấn ?categorySlug=...
router.get('/filters', async (req, res) => {
  const { categorySlug } = req.query;
  if (!categorySlug) {
    return res.status(400).json({
      success: false,
      error: "Thiếu tham số categorySlug."
    });
  }
  req.params.categorySlug = categorySlug;
  return getCategoryFilters(req, res);
});

// GET /api/products/search - Tìm kiếm sản phẩm và áp dụng bộ lọc EAV động
router.get('/search', searchProducts);

// GET /api/products/seller - Lấy các sản phẩm của chính người bán (bao gồm NHÁP/CHỜ DUYỆT)
router.get('/seller', requireAuth, requireNotBanned, getSellerProducts);

// GET /api/products/:id - Lấy chi tiết sản phẩm
router.get('/:id', getProductDetail);

// PUT /api/products/:id - Cập nhật sản phẩm (chỉ người bán, ở trạng thái chờ duyệt/bị từ chối)
router.put('/:id', requireAuth, requireNotBanned, updateProduct);

// GET /api/products/:id/bids - Lấy lịch sử các lượt đấu giá của sản phẩm
router.get('/:id/bids', getProductBids);

// GET /api/products/:id/qna - Lấy lịch sử hỏi đáp (Q&A)
router.get('/:id/qna', getProductQna);

// POST /api/products/:id/qna - Gửi câu hỏi đáp mới (yêu cầu xác thực)
router.post('/:id/qna', requireAuth, requireNotBanned, createProductQna);

// GET /api/products/:id/live - Kết nối luồng sự kiện SSE để nhận cập nhật sản phẩm theo thời gian thực
router.get('/:id/live', streamProductEvents);

export default router;
