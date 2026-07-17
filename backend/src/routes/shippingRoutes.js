import express from 'express';
import { 
  getEstimateFee, 
  getProvincesController, 
  getDistrictsController, 
  getWardsController 
} from '../controllers/shippingController.js';

const router = express.Router();

// Hỗ trợ cả GET /api/shipping và /api/shipping/estimate để client truy cập linh hoạt
router.get('/', getEstimateFee);
router.get('/estimate', getEstimateFee);
router.post('/estimate', getEstimateFee);

// Địa giới hành chính động cho Vietnam
router.get('/provinces', getProvincesController);
router.get('/districts', getDistrictsController);
router.get('/wards', getWardsController);

export default router;
