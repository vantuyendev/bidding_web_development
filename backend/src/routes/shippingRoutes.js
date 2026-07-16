import express from 'express';
import { getEstimateFee } from '../controllers/shippingController.js';

const router = express.Router();

// Hỗ trợ cả GET /api/shipping và /api/shipping/estimate để client truy cập linh hoạt
router.get('/', getEstimateFee);
router.get('/estimate', getEstimateFee);
router.post('/estimate', getEstimateFee);

export default router;
