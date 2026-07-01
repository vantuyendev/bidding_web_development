import express from 'express';
import { placeBid, buyNow } from '../controllers/bidController.js';

const router = express.Router();

// Route for placing a bid on a product
router.post('/place', placeBid);

// Route for buy-it-now purchase on a product
router.post('/buy-now', buyNow);

export default router;
