import express from 'express';
import { getProductDetail, getProducts, getCategoryFilters, searchProducts, createProduct, getProductBids, updateProduct, getSellerProducts, getProductQna, createProductQna } from '../controllers/productController.js';
import { requireAuth, requireNotBanned } from '../middlewares/authMiddleware.js';
import { streamProductEvents } from '../controllers/streamController.js';

const router = express.Router();

// GET /api/products - Fetch all products
router.get('/', getProducts);

// POST /api/products - Create a new product (Seller only)
router.post('/', requireAuth, requireNotBanned, createProduct);

// GET /api/products/categories/:categorySlug/filters - Get dynamic filters for a category
router.get('/categories/:categorySlug/filters', getCategoryFilters);

// GET /api/products/filters - Get dynamic filters via query parameter ?categorySlug=...
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

// GET /api/products/search - Search products and apply dynamic EAV filters
router.get('/search', searchProducts);

// GET /api/products/seller - Fetch seller's own products (including DRAFT/PENDING)
router.get('/seller', requireAuth, requireNotBanned, getSellerProducts);

// GET /api/products/:id - Fetch product details
router.get('/:id', getProductDetail);

// PUT /api/products/:id - Update product (seller only, pending/rejected state)
router.put('/:id', requireAuth, requireNotBanned, updateProduct);

// GET /api/products/:id/bids - Fetch product bids history
router.get('/:id/bids', getProductBids);

// GET /api/products/:id/qna - Fetch Q&A history
router.get('/:id/qna', getProductQna);

// POST /api/products/:id/qna - Post a new Q&A message (requires authentication)
router.post('/:id/qna', requireAuth, requireNotBanned, createProductQna);

// GET /api/products/:id/live - Connect to SSE event stream for real-time product updates
router.get('/:id/live', streamProductEvents);

export default router;
