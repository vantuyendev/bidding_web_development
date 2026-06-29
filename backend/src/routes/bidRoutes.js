import express from 'express';
import { placeBid } from '../controllers/bidController.js';

const router = express.Router();

// Route for placing a bid on a product
router.post('/place', placeBid);

export default router;
