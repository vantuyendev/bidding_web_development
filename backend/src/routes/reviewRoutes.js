import express from 'express';
import { createReview } from '../controllers/reviewController.js';
import { requireNotBanned } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/reviews - Create a review for an ended product transaction
router.post('/', requireNotBanned, createReview);

export default router;
