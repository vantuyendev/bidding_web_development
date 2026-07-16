import express from 'express';
import { placeBid, buyNow } from '../controllers/bidController.js';
import { requireAuth, requireNotBanned } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route for placing a bid on a product
router.post('/place', requireAuth, requireNotBanned, placeBid);

// Route for buy-it-now purchase on a product
router.post('/buy-now', requireAuth, requireNotBanned, buyNow);

export default router;
