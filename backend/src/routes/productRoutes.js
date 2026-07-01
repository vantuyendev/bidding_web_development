import express from 'express';
import { getProductDetail, getProducts, getCategoryFilters, searchProducts } from '../controllers/productController.js';
import { streamProductEvents } from '../controllers/streamController.js';

const router = express.Router();

// GET /api/products - Fetch all products
router.get('/', getProducts);

// GET /api/products/categories/:categorySlug/filters - Get dynamic filters for a category
router.get('/categories/:categorySlug/filters', getCategoryFilters);

// GET /api/products/search - Search products and apply dynamic EAV filters
router.get('/search', searchProducts);

// GET /api/products/:id - Fetch product details
router.get('/:id', getProductDetail);

// GET /api/products/:id/live - Connect to SSE event stream for real-time product updates
router.get('/:id/live', streamProductEvents);

export default router;
