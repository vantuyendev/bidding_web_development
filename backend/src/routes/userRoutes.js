import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { getUserProfile, verifySeller } from '../controllers/userController.js';

const router = express.Router();

// GET /profile - Get the current logged-in user profile details (protected)
router.get('/profile', requireAuth, getUserProfile);

// POST /verify-seller - Set current user as a verified seller (protected)
router.post('/verify-seller', requireAuth, verifySeller);

export default router;
