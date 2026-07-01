import express from 'express';
import { getEstimateFee } from '../controllers/shippingController.js';

const router = express.Router();

// Support both GET /api/shipping and /api/shipping/estimate for flexible client access
router.get('/', getEstimateFee);
router.get('/estimate', getEstimateFee);
router.post('/estimate', getEstimateFee);

export default router;
