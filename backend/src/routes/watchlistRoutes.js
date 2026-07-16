import express from 'express';
import { requireAuth, requireNotBanned } from '../middlewares/authMiddleware.js';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '../controllers/watchlistController.js';

const router = express.Router();

// Tất cả các tuyến đường danh sách theo dõi đều yêu cầu xác thực
router.use(requireAuth);

// GET /api/watchlist - Lấy tất cả sản phẩm trong danh sách theo dõi (được bảo vệ)
router.get('/', getWatchlist);

// POST /api/watchlist - Thêm sản phẩm vào danh sách theo dõi (được bảo vệ)
router.post('/', requireNotBanned, addToWatchlist);

// DELETE /api/watchlist/:productId - Xóa sản phẩm khỏi danh sách theo dõi (được bảo vệ)
router.delete('/:productId', requireNotBanned, removeFromWatchlist);

export default router;
