import express from 'express';
import { 
  createDisputeTicket, 
  adminResolveTicket,
  getDisputeDetail,
  getDisputeMessages,
  createDisputeMessage,
  getDisputesList
} from '../controllers/disputeController.js';

const router = express.Router();

// GET /api/disputes - Get all disputes list (filters for user involved or all if admin)
router.get('/', getDisputesList);

// POST /api/disputes - Create a dispute ticket (buyer only)
router.post('/', createDisputeTicket);

// POST /api/disputes/resolve - Resolve a dispute ticket (admin only)
router.post('/resolve', adminResolveTicket);

// GET /api/disputes/:ticketId - Get dispute ticket detail
router.get('/:ticketId', getDisputeDetail);

// GET /api/disputes/:ticketId/messages - Get dispute message history
router.get('/:ticketId/messages', getDisputeMessages);

// POST /api/disputes/:ticketId/messages - Send a new dispute message
router.post('/:ticketId/messages', createDisputeMessage);

export default router;
