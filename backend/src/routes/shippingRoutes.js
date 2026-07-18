import express from 'express';
import { 
  getEstimateFee, 
  getProvincesController, 
  getDistrictsController, 
  getWardsController,
  receiveShippingWebhook,
  simulateShippingUpdate
} from '../controllers/shippingController.js';
import { requireAuth, requireNotBanned } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Hỗ trợ cả GET /api/shipping và /api/shipping/estimate để client truy cập linh hoạt
router.get('/', getEstimateFee);
router.get('/estimate', getEstimateFee);
router.post('/estimate', getEstimateFee);

// Địa giới hành chính động cho Vietnam
router.get('/provinces', getProvincesController);
router.get('/districts', getDistrictsController);
router.get('/wards', getWardsController);

// Webhook cập nhật lộ trình từ đơn vị vận chuyển (Không bảo vệ bằng requireAuth vì được gọi từ hệ thống đối tác)
router.post('/webhook', receiveShippingWebhook);

// API mô phỏng cập nhật lộ trình phục vụ kiểm thử (Yêu cầu đăng nhập)
router.post('/simulate-update', requireAuth, requireNotBanned, simulateShippingUpdate);

export default router;
