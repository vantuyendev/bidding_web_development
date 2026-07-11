import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { 
  getUserProfile, 
  verifySeller, 
  depositFunds, 
  withdrawFunds,
  getUserWalletRequests,
  submitKyc,
  getPublicUserProfile,
  cancelWalletRequest,
  getWonAuctions,
  getUserTransactionHistory
} from '../controllers/userController.js';

const router = express.Router();

// GET /profile - Get the current logged-in user profile details (protected)
router.get('/profile', requireAuth, getUserProfile);

// POST /verify-seller - Set current user as a verified seller (protected)
router.post('/verify-seller', requireAuth, verifySeller);

// POST /deposit - Create deposit request (protected)
router.post('/deposit', requireAuth, depositFunds);

// POST /withdraw - Create withdraw request (protected)
router.post('/withdraw', requireAuth, withdrawFunds);

// GET /wallet-requests - Get user's wallet request history (protected)
router.get('/wallet-requests', requireAuth, getUserWalletRequests);

// DELETE /wallet-requests/:id - Cancel a pending wallet request (protected)
router.delete('/wallet-requests/:id', requireAuth, cancelWalletRequest);

// GET /won-auctions - Get user's won auctions (protected)
router.get('/won-auctions', requireAuth, getWonAuctions);

// GET /transactions - Get user's transaction history (protected)
router.get('/transactions', requireAuth, getUserTransactionHistory);

// POST /submit-kyc - Submit KYC application for seller upgrade (protected)
router.post('/submit-kyc', requireAuth, submitKyc);

// GET /:id - Fetch public profile and reviews of a user (seller)
router.get('/:id', getPublicUserProfile);

export default router;
