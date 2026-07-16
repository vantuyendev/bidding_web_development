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

// All dispute routes require authentication
router.use(requireAuth);

// GET /api/disputes - Get all disputes list (filters for user involved or all if admin)
router.get('/', requireNotBanned, getDisputesList);

// POST /api/disputes - Create a dispute ticket (buyer only)
router.post('/', requireNotBanned, createDisputeTicket);

// POST /api/disputes/resolve - Resolve a dispute ticket (admin only)
router.post('/resolve', requireAdmin, adminResolveTicket);

// GET /api/disputes/:ticketId - Get dispute ticket detail
router.get('/:ticketId', requireNotBanned, getDisputeDetail);

// GET /api/disputes/:ticketId/messages - Get dispute message history
router.get('/:ticketId/messages', requireNotBanned, getDisputeMessages);

// POST /api/disputes/:ticketId/messages - Send a new dispute message
router.post('/:ticketId/messages', requireNotBanned, createDisputeMessage);

export default router;
