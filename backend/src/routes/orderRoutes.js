import express from 'express';
import { requireAuth, requireNotBanned } from '../middlewares/authMiddleware.js';
import { checkoutProduct, shipProduct, receiveProduct } from '../controllers/orderController.js';
import { getOrderMessages, createOrderMessage } from '../controllers/orderMessageController.js';

const router = express.Router();

// All order routes require authentication
router.use(requireAuth);

// POST /api/orders/:id/checkout - Complete the 90% payment and add shipping info (Winner only)
router.post('/:id/checkout', requireNotBanned, checkoutProduct);

// POST /api/orders/:id/ship - Seller ships the product (Seller only)
router.post('/:id/ship', requireNotBanned, shipProduct);

// POST /api/orders/:id/receive - Winner confirms delivery & releases escrow (Winner only)
router.post('/:id/receive', requireNotBanned, receiveProduct);

// GET /api/orders/:id/messages - Get order message chat history (Winner & Seller only)
router.get('/:id/messages', requireNotBanned, getOrderMessages);

// POST /api/orders/:id/messages - Send order chat message (Winner & Seller only)
router.post('/:id/messages', requireNotBanned, createOrderMessage);

export default router;
