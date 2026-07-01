import express from 'express';
import { createDisputeTicket, adminResolveTicket } from '../controllers/disputeController.js';

const router = express.Router();

// POST /api/disputes - Create a dispute ticket (buyer only)
router.post('/', createDisputeTicket);

// POST /api/disputes/resolve - Resolve a dispute ticket (admin only)
router.post('/resolve', adminResolveTicket);

export default router;
