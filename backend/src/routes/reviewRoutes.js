import express from 'express';
import { createReview } from '../controllers/reviewController.js';
import { requireNotBanned } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/reviews - Tạo đánh giá cho giao dịch sản phẩm đã kết thúc
router.post('/', requireNotBanned, createReview);

export default router;
