import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { checkoutProduct, shipProduct, receiveProduct } from '../controllers/orderController.js';
import { getOrderMessages, createOrderMessage } from '../controllers/orderMessageController.js';

const router = express.Router();

// POST /api/orders/:id/checkout - Complete the 90% payment and add shipping info (Winner only)
router.post('/:id/checkout', requireAuth, checkoutProduct);

// POST /api/orders/:id/ship - Seller ships the product (Seller only)
router.post('/:id/ship', requireAuth, shipProduct);

// POST /api/orders/:id/receive - Winner confirms delivery & releases escrow (Winner only)
router.post('/:id/receive', requireAuth, receiveProduct);

// GET /api/orders/:id/messages - Get order message chat history (Winner & Seller only)
router.get('/:id/messages', requireAuth, getOrderMessages);

// POST /api/orders/:id/messages - Send order chat message (Winner & Seller only)
router.post('/:id/messages', requireAuth, createOrderMessage);

export default router;
