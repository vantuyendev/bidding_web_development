import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { 
  getUserProfile, 
  verifySeller, 
  depositFunds, 
  withdrawFunds,
  submitKyc,
  adminGetPendingKyc,
  adminApproveKyc,
  getPublicUserProfile
} from '../controllers/userController.js';

const router = express.Router();

// GET /profile - Get the current logged-in user profile details (protected)
router.get('/profile', requireAuth, getUserProfile);

// POST /verify-seller - Set current user as a verified seller (protected)
router.post('/verify-seller', requireAuth, verifySeller);

// POST /deposit - Deposit funds to wallet (protected)
router.post('/deposit', requireAuth, depositFunds);

// POST /withdraw - Withdraw funds from wallet (protected)
router.post('/withdraw', requireAuth, withdrawFunds);

// POST /submit-kyc - Submit KYC application for seller upgrade (protected)
router.post('/submit-kyc', requireAuth, submitKyc);

// GET /admin/kyc-pending - Retrieve list of users awaiting KYC (protected, admin only in controller)
router.get('/admin/kyc-pending', requireAuth, adminGetPendingKyc);

// POST /admin/approve-kyc - Approve or reject KYC application (protected, admin only in controller)
router.post('/admin/approve-kyc', requireAuth, adminApproveKyc);

// GET /:id - Fetch public profile and reviews of a user (seller)
router.get('/:id', getPublicUserProfile);

export default router;

