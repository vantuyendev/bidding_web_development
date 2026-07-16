import express from 'express';
import { requireAuth, requireNotBanned } from '../middlewares/authMiddleware.js';
import { checkoutProduct, shipProduct, receiveProduct } from '../controllers/orderController.js';
import { getOrderMessages, createOrderMessage } from '../controllers/orderMessageController.js';

const router = express.Router();

// Tất cả các tuyến đường đơn hàng đều yêu cầu xác thực
router.use(requireAuth);

// POST /api/orders/:id/checkout - Hoàn thành thanh toán 90% còn lại và thêm thông tin vận chuyển (Chỉ Người thắng cuộc)
router.post('/:id/checkout', requireNotBanned, checkoutProduct);

// POST /api/orders/:id/ship - Người bán giao hàng (Chỉ Người bán)
router.post('/:id/ship', requireNotBanned, shipProduct);

// POST /api/orders/:id/receive - Người thắng cuộc xác nhận đã nhận hàng & giải phóng tiền ký quỹ (Chỉ Người thắng cuộc)
router.post('/:id/receive', requireNotBanned, receiveProduct);

// GET /api/orders/:id/messages - Lấy lịch sử chat tin nhắn đơn hàng (Chỉ Người thắng & Người bán)
router.get('/:id/messages', requireNotBanned, getOrderMessages);

// POST /api/orders/:id/messages - Gửi tin nhắn chat đơn hàng (Chỉ Người thắng cuộc & Người bán)
router.post('/:id/messages', requireNotBanned, createOrderMessage);

export default router;
