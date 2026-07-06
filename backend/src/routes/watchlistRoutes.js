import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '../controllers/watchlistController.js';

const router = express.Router();

// GET /api/watchlist - Get all watchlisted products (protected)
router.get('/', requireAuth, getWatchlist);

// POST /api/watchlist - Add a product to watchlist (protected)
router.post('/', requireAuth, addToWatchlist);

// DELETE /api/watchlist/:productId - Remove a product from watchlist (protected)
router.delete('/:productId', requireAuth, removeFromWatchlist);

export default router;
