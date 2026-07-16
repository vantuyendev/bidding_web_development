import express from 'express';
import { requireAuth, requireNotBanned } from '../middlewares/authMiddleware.js';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '../controllers/watchlistController.js';

const router = express.Router();

// All watchlist routes require authentication
router.use(requireAuth);

// GET /api/watchlist - Get all watchlisted products (protected)
router.get('/', getWatchlist);

// POST /api/watchlist - Add a product to watchlist (protected)
router.post('/', requireNotBanned, addToWatchlist);

// DELETE /api/watchlist/:productId - Remove a product from watchlist (protected)
router.delete('/:productId', requireNotBanned, removeFromWatchlist);

export default router;
