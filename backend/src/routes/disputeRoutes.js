import express from 'express';
import { 
  createDisputeTicket, 
  adminResolveTicket,
  getDisputeDetail,
  getDisputeMessages,
  createDisputeMessage,
  getDisputesList
} from '../controllers/disputeController.js';
import { requireAuth, requireAdmin, requireNotBanned } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Tất cả các tuyến đường khiếu nại đều yêu cầu xác thực
router.use(requireAuth);

// GET /api/disputes - Lấy danh sách khiếu nại (lọc theo người dùng liên quan hoặc tất cả nếu là admin)
router.get('/', requireNotBanned, getDisputesList);

// POST /api/disputes - Tạo phiếu khiếu nại (chỉ người mua)
router.post('/', requireNotBanned, createDisputeTicket);

// POST /api/disputes/resolve - Giải quyết khiếu nại (chỉ admin)
router.post('/resolve', requireAdmin, adminResolveTicket);

// GET /api/disputes/:ticketId - Lấy chi tiết phiếu khiếu nại
router.get('/:ticketId', requireNotBanned, getDisputeDetail);

// GET /api/disputes/:ticketId/messages - Lấy lịch sử tin nhắn khiếu nại
router.get('/:ticketId/messages', requireNotBanned, getDisputeMessages);

// POST /api/disputes/:ticketId/messages - Gửi tin nhắn khiếu nại mới
router.post('/:ticketId/messages', requireNotBanned, createDisputeMessage);

export default router;
