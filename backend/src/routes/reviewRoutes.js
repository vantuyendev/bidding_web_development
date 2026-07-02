import express from 'express';
import { createReview } from '../controllers/reviewController.js';

const router = express.Router();

// POST /api/reviews - Create a review for an ended product transaction
router.post('/', createReview);

export default router;
