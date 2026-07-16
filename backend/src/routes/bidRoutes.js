import express from 'express';
import { placeBid, buyNow } from '../controllers/bidController.js';
import { requireAuth, requireNotBanned } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Tuyến đường đặt giá cho một sản phẩm
router.post('/place', requireAuth, requireNotBanned, placeBid);

// Tuyến đường cho việc mua ngay một sản phẩm
router.post('/buy-now', requireAuth, requireNotBanned, buyNow);

export default router;
